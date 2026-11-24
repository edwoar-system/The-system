// Which notifications the phone should have scheduled, worked out from the player. Pure: no native calls.
// Everything is local (scheduled on the phone), so nothing needs a server.
import { todayKey } from "./quests";
import { URGENT } from "./urgent";
import { PENALTY, isInPenalty } from "./penalty";
import { ladderById, RANKS } from "./ladders";
import { skillById } from "./guild";
import { dayNum, skillView, trialState, TRIAL_DAYS } from "./skills";
import { quoteOfDay } from "./quotes";
import { quickById, quickToday } from "./quick";
import { dayTimes } from "./profile";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

export const NOTIFY_KINDS = ["morning", "urgent", "deadline", "penalty", "water", "trial", "rust"];
export const NOTIFY_DEFAULTS = { morning: true, urgent: true, deadline: true, penalty: true, water: true, trial: true, rust: true };
export const WATER_HOURS = [10, 12, 14, 16, 18];
export const DEADLINE_WARNING_HOUR = 20;
const LOOK_AHEAD_DAYS = 2; // today and tomorrow; rescheduled every time the app opens or the player changes
const MAX_RUST = 3;

export const notifySettings = (player) => ({ ...NOTIFY_DEFAULTS, ...(player?.notify ?? {}) });

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
export function urgentTimes(uid, dateKey, count, base, profile = null) {
  const rand = seeded(`${uid}:${dateKey}`);
  const { wake, bed } = dayTimes(profile);
  const start = Math.max(URGENT.dayStartHour, wake + 1) * 60;
  const end = Math.min(URGENT.dayEndHour, bed - 1) * 60;
  const span = Math.max(60, end - start - 30);
  const slot = span / Math.max(1, count);
  return Array.from({ length: count }, (_, i) => {
    const minute = Math.round(start + i * slot + rand() * Math.max(0, slot - 45));
    return at(base, 0, Math.floor(minute / 60), minute % 60);
  });
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

    if (s.urgent) {
      const perDay = player.urgentPerDay ?? URGENT.defaultPerDay;
      const done = d === 0 && player.urgentToday?.date === key ? player.urgentToday.count : 0;
      urgentTimes(uid, key, perDay, base, player.profile).slice(done).forEach((date, i) => add({
        id: `urgent-${key}-${i}`, date, title: t.notify.urgentTitle, body: t.notify.urgentBody, data: { kind: "urgent" },
      }));
    }
    if (s.deadline && mainsOpen > 0) {
      add({ id: `deadline-${key}`, date: at(base, 0, DEADLINE_WARNING_HOUR), title: t.notify.deadlineTitle,
        body: fill(mainsOpen === 1 ? t.notify.deadlineOne : t.notify.deadlineMany, { n: mainsOpen }), data: { kind: "quests" } });
    }
    if (s.penalty && mainsOpen > 0 && !(d === 0 && isInPenalty(player))) {
      add({ id: `penalty-${key}`, date: at(base, 0, PENALTY.deadlineHour, 1), title: t.notify.penaltyTitle, body: t.notify.penaltyBody, data: { kind: "status" } });
    }
    if (s.water) {
      const goal = quickById.water.goal;
      const had = d === 0 ? quickToday(player).water ?? 0 : 0;
      if (had < goal) {
        WATER_HOURS.forEach((h) => add({ id: `water-${key}-${h}`, date: at(base, 0, h), title: t.notify.waterTitle,
          body: fill(t.notify.waterBody, { n: had, goal }), data: { kind: "quests" } }));
      }
    }
    // Your own reminders ("don't forget"): daily ones every day, one-off ones on their date.
    (player.reminders ?? []).forEach((r) => {
      if (r.repeat !== "daily" && r.date !== key) return;
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

  return out.sort((a, b) => a.date - b.date);
}
