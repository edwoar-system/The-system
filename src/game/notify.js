// Which notifications the phone should have scheduled, worked out from the player. Pure: no native calls.
// Everything is local (scheduled on the phone), so nothing needs a server.
import { questById, todayKey } from "./quests";
import { URGENT } from "./urgent";
import { dayEndHour, isInPenalty } from "./penalty";
import { ladderById, RANKS } from "./ladders";
import { guildQuest, skillById } from "./guild";
import { dayNum, skillView, trialState, TRIAL_DAYS } from "./skills";
import { quoteOfDay } from "./quotes";
import { quickById, quickToday } from "./quick";
import { dayTimes, dutyQuest } from "./profile";
import { busyBlocks, hhmm, isBusy, outsideBusy } from "./schedule";
import { isHard } from "./hard";
import { programQuest } from "./programs";
import { splitQuest } from "./gym";
import { reminderDone } from "./reminders";
import { plannedOn } from "./weekplan";
import { needsWhy, whyNow } from "./why";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

export const NOTIFY_KINDS = ["morning", "nudge", "schedule", "deadline", "bedtime", "penalty", "water", "trial", "rust", "apptime"];
export const NOTIFY_DEFAULTS = Object.fromEntries(NOTIFY_KINDS.map((k) => [k, true]));
const MAX_SCHEDULED = 60; // iPhone keeps at most 64 waiting notifications
export const WATER_HOURS = [10, 12, 14, 16, 18];
const LOOK_AHEAD_DAYS = 2; // today and tomorrow; rescheduled every time the app opens or the player changes
const MAX_RUST = 3;

// In Hard mode every reminder is on and can't be turned off.
export const notifySettings = (player) => (isHard(player) ? { ...NOTIFY_DEFAULTS } : { ...NOTIFY_DEFAULTS, ...(player?.notify ?? {}) });

// A quest's title from its id, for "still open" reminders.
function questTitle(id, player) {
  if (questById[id]) return questById[id].title;
  if (id.startsWith("g:")) return guildQuest(id)?.title;
  if (id.startsWith("d:")) return dutyQuest(id)?.title;
  if (id.startsWith("p:")) return programQuest(id, player)?.title;
  if (id.startsWith("gs:")) return splitQuest(id, player?.gym)?.title;
  return null;
}
// The quest itself (for "why now" on hard ones you asked for).
function questOf(id, player) {
  if (id.startsWith("g:")) return guildQuest(id);
  if (id.startsWith("p:")) return programQuest(id, player);
  if (id.startsWith("gs:")) return splitQuest(id, player?.gym);
  return null;
}
const listOf = (titles) => (titles.length > 3 ? `${titles.slice(0, 3).join(", ")} +${titles.length - 3}` : titles.join(", "));
// A short quote under a reminder, different each time.
const quoteLine = (key, n, player) => { const q = quoteOfDay(key, n, player?.profile?.schools, player?.favQuotes); return `"${q.text}" (${q.who})`; };

// Seeded random so the urgent times for a day stay the same when the plan is rebuilt.
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const at = (base, dayOffset, hour, minute = 0) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour, minute, 0, 0);
const fromDayNum = (n, hour) => {
  const d = new Date(n * 86400000);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, 0, 0, 0);
};

// Urgent quest times for one day: spread over your waking hours (an hour after waking until an hour
// before bed, within 8:00–22:00), one per slot.
// busy: today's busy blocks (game/schedule). Urgent quests are spread over the free time only.
export function urgentTimes(uid, dateKey, count, base, profile = null, busy = []) {
  const rand = seeded(`${uid}:${dateKey}`);
  const { wake, bed } = dayTimes(profile);
  const start = Math.max(URGENT.dayStartHour, wake + 1) * 60;
  const end = Math.min(URGENT.dayEndHour, bed - 1) * 60;
  // Free stretches (minutes) between start and end.
  const free = [];
  let cur = start;
  busy.map((x) => ({ s: x.start * 60, e: x.end * 60 })).sort((x, y) => x.s - y.s).forEach(({ s: bs, e: be }) => {
    if (bs > cur) free.push([cur, Math.min(bs, end)]);
    cur = Math.max(cur, be);
  });
  if (cur < end) free.push([cur, end]);
  const spans = free.filter(([x, y]) => y - x >= 20);
  const total = spans.reduce((n, [x, y]) => n + (y - x), 0);
  if (total < 30) return [];
  // Walk along the free minutes as if they were one line, one urgent quest per equal slot.
  const toClock = (m) => { for (const [x, y] of spans) { if (m <= y - x) return x + m; m -= y - x; } return null; };
  const slot = total / Math.max(1, count);
  return Array.from({ length: count }, (_, i) => {
    const minute = toClock(Math.round(i * slot + 10 + rand() * Math.max(0, slot - 25)));
    return minute == null ? null : at(base, 0, Math.floor(minute / 60), Math.round(minute % 60));
  }).filter(Boolean);
}

// The list of notifications to schedule: { id, date, title, body, data }.
export function notificationPlan(player, uid, now = new Date()) {
  if (!player) return [];
  const s = notifySettings(player);
  const out = [];
  const add = (n) => { if (n.date > now) out.push(n); };
  const today = todayKey(now);
  const day = player.day?.date === today ? player.day : null;
  const openMains = day ? day.mains.filter((m) => !m.done).length : 3;

  for (let d = 0; d < LOOK_AHEAD_DAYS; d++) {
    const base = at(now, d, 12);
    const key = todayKey(base);
    const mainsOpen = d === 0 ? openMains : 3;

    // Sub-scenarios (urgent quests) only come while you're home with the app open, so none are scheduled here.
    const end = dayEndHour(player.profile) + (d === 0 && day?.extraMin ? day.extraMin / 60 : 0);
    const endAt = at(base, 0, Math.floor(end), Math.round((end % 1) * 60));
    const hard = isHard(player, base.getTime());
    const busy = busyBlocks(player, key);
    const openTitles = d === 0 && day ? day.mains.filter((m) => !m.done).map((m) => questTitle(m.id, player)).filter(Boolean) : [];
    // What drives you (Tune) changes the first line of a nudge.
    const total = d === 0 && day ? day.mains.length : 3;
    const drive = player.profile?.drive ? `${fill(t.notify.drive[player.profile.drive], { done: total - mainsOpen, total })} ` : "";
    const openLine = drive + (openTitles.length ? fill(t.notify.stillOpen, { list: listOf(openTitles) }) : fill(t.notify.waiting, { n: mainsOpen }));

    // Nudges while main quests are open: twice a day, every hour in Hard mode. Never during busy blocks.
    if (s.nudge && mainsOpen > 0) {
      const { wake } = dayTimes(player.profile);
      const hours = hard
        ? Array.from({ length: 24 }, (_, i) => Math.ceil(wake) + 2 + i).filter((h) => h <= end - 1.5)
        : [Math.round(wake + 4), Math.round(wake + 8)].filter((h) => h <= end - 1.5);
      // Normal nudges move to just after a busy block; hourly Hard ones in a busy block are skipped.
      const times = hard ? hours.filter((h) => !isBusy(busy, h)) : [...new Set(hours.map((h) => outsideBusy(busy, h, end - 1.5)).filter((h) => h != null))];
      times.forEach((h, i) => add({ id: `nudge-${key}-${Math.round(h * 60)}`, date: at(base, 0, Math.floor(h), Math.round((h % 1) * 60)), title: hard ? t.notify.nudgeHardTitle : t.notify.nudgeTitle,
        body: `${openLine}\n${quoteLine(key, i + 1, player)}`, data: { kind: "quests" } }));
    }
    // Hard quests you asked for yourself (guild, program, gym split): the System keeps at you about them,
    // with a reason to go now. Two alerts per quest at most, outside your busy blocks.
    if (s.nudge && d === 0 && day) {
      const { wake } = dayTimes(player.profile);
      const slots = [wake + 3, wake + 6, wake + 9, end - 2].map((h) => Math.round(h * 4) / 4).filter((h) => h <= end - 1 && !isBusy(busy, h));
      day.mains.filter((m) => !m.done).map((m) => questOf(m.id, player)).filter((q) => q && needsWhy(q)).slice(0, 2).forEach((q, k) => {
        const w = whyNow(q, key);
        slots.map((h) => at(base, 0, Math.floor(h), Math.round((h % 1) * 60) + k * 7)).filter((date) => date > now).slice(0, 2).forEach((date, i) => add({
          id: `hardq-${key}-${q.id}-${i}`, date, title: fill(t.notify.hardTitle, { title: q.title }),
          body: `${w.line}\n"${w.quote.text}" (${w.quote.who})`, data: { kind: "quests" },
        }));
      });
    }
    // Your weekly plan: 20 minutes before each planned skill ("Golf at 07:00").
    if (s.schedule !== false) {
      plannedOn(player, base).forEach(({ skill, time }) => {
        if (!time || !skillById[skill]) return;
        const [hh, mm] = time.split(":").map(Number);
        const date = new Date(at(base, 0, hh, mm).getTime() - 20 * 60000);
        if (date > now) add({ id: `plan-${skill}-${key}`, date, title: fill(t.notify.planTitle, { skill: skillById[skill].name, time }), body: t.notify.planBody, data: { kind: "quests" } });
      });
    }
    // Your schedule: a reminder 10 minutes before each busy block.
    if (s.schedule) {
      busy.filter((b) => b.label).forEach((b) => {
        const start = at(base, 0, Math.floor(b.start), Math.round((b.start % 1) * 60));
        add({ id: `sched-${key}-${b.id ?? b.start}`, date: new Date(start.getTime() - 10 * 60000), title: fill(t.notify.schedTitle, { label: b.label }),
          body: fill(t.notify.schedBody, { label: b.label, from: hhmm(b.start), to: hhmm(b.end) }), data: { kind: "quests" } });
      });
    }
    // Last call an hour before the day ends, with what's still open.
    if (s.deadline && mainsOpen > 0) {
      add({ id: `deadline-${key}`, date: new Date(endAt.getTime() - 3600000), title: t.notify.deadlineTitle,
        body: fill(mainsOpen === 1 ? t.notify.deadlineOne : t.notify.deadlineMany, { n: mainsOpen, list: openTitles.length ? listOf(openTitles) : t.notify.yourQuests, time: hhmm(end) }), data: { kind: "quests" } });
    }
    // The day ends: get ready for bed (and a reminder of anything you forgot).
    if (s.bedtime && !(d === 0 && day?.end?.done)) {
      add({ id: `bedtime-${key}`, date: endAt, title: t.notify.bedTitle,
        body: `${mainsOpen > 0 && openTitles.length ? `${fill(t.notify.forgot, { list: listOf(openTitles) })} ` : ""}${t.notify.bedBody}\n${quoteLine(key, 9, player)}`, data: { kind: "quests" } });
      if (hard) add({ id: `bedtime2-${key}`, date: new Date(endAt.getTime() + 30 * 60000), title: t.notify.bedTitle2, body: t.notify.bedBody2, data: { kind: "quests" } });
    }
    if (s.penalty && mainsOpen > 0 && !(d === 0 && isInPenalty(player))) {
      add({ id: `penalty-${key}`, date: new Date(endAt.getTime() + 60000), title: t.notify.penaltyTitle, body: t.notify.penaltyBody, data: { kind: "status" } });
    }
    if (s.water) {
      const goal = quickById.water.goal;
      const had = d === 0 ? quickToday(player).water ?? 0 : 0;
      if (had < goal) {
        WATER_HOURS.filter((h) => !isBusy(busy, h)).forEach((h) => add({ id: `water-${key}-${h}`, date: at(base, 0, h), title: t.notify.waterTitle,
          body: fill(t.notify.waterBody, { n: had, goal }), data: { kind: "quests" } }));
      }
    }
    // Your own reminders ("don't forget"): daily ones every day, one-off ones on their date.
    (player.reminders ?? []).forEach((r) => {
      if (r.repeat !== "daily" && r.date !== key) return;
      if (d === 0 && reminderDone(player, r.id, key)) return; // already ticked off today
      const [hh, mm] = String(r.time).split(":").map(Number);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
      add({ id: `rem-${r.id}-${key}`, date: at(base, 0, hh, mm), title: t.notify.reminderTitle, body: r.text, data: { kind: "status" } });
    });
    // Morning: the day's quote and your start quest, around your wake time (never the exact same minute).
    if (s.morning) {
      const { wake } = dayTimes(player.profile);
      const minute = Math.round(wake * 60 + seeded(`${uid}:${key}:m`)() * 30);
      const q = quoteOfDay(key, 0, player.profile?.schools, player.favQuotes);
      add({ id: `morning-${key}`, date: at(base, 0, Math.floor(minute / 60), minute % 60), title: t.notify.morningTitle,
        body: `${q.text} (${q.who}) ${t.notify.morningBody}`, data: { kind: "quests" } });
    }
  }

  // Rank trials: the evening two days before the 7-day week runs out (so today and tomorrow are left).
  if (s.trial) {
    Object.entries(player.trials ?? {}).forEach(([id, tr]) => {
      const L = ladderById[id];
      const st = L ? trialState(tr, L, player.skills?.[id]?.ticks) : null;
      if (!st || st.started == null || st.complete) return;
      add({ id: `trial-${id}`, date: fromDayNum(st.started + TRIAL_DAYS - 2, 18), title: t.notify.trialTitle,
        body: fill(t.notify.trialBody, { skill: skillById[id]?.name ?? id, rank: RANKS[st.rank] }), data: { kind: "skill", skill: id } });
    });
  }

  // Rust: two days before a trained skill starts to rust (the nearest few only).
  if (s.rust) {
    const todayN = dayNum(today);
    Object.keys(player.skills ?? {})
      .filter((id) => ladderById[id])
      .map((id) => skillView(id, player.skills[id], todayN))
      .filter((v) => v.trained && v.rustIn != null && v.rustIn >= 2)
      .sort((a, b) => a.rustIn - b.rustIn)
      .slice(0, MAX_RUST)
      .forEach((v) => add({ id: `rust-${v.id}`, date: fromDayNum(todayN + v.rustIn - 2, 18), title: t.notify.rustTitle,
        body: fill(t.notify.rustBody, { skill: skillById[v.id]?.name ?? v.id }), data: { kind: "skill", skill: v.id } }));
  }

  // App time from the shop: a warning 5 minutes before the end, and when it's over.
  const app = player.appTime;
  if (s.apptime && app?.end > now.getTime()) {
    if (app.end - 5 * 60000 > now.getTime()) add({ id: `app-5-${app.end}`, date: new Date(app.end - 5 * 60000), title: t.notify.appSoonTitle, body: t.notify.appSoonBody, data: { kind: "status" } });
    add({ id: `app-end-${app.end}`, date: new Date(app.end), title: t.notify.appEndTitle, body: t.notify.appEndBody, data: { kind: "status" } });
  }

  return out.sort((a, b) => a.date - b.date).slice(0, MAX_SCHEDULED);
}
