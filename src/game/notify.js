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
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

export const NOTIFY_KINDS = ["urgent", "deadline", "penalty", "water", "quote", "trial", "rust", "morning"];
export const NOTIFY_DEFAULTS = { urgent: true, deadline: true, penalty: true, water: true, quote: true, trial: true, rust: true, morning: false };
export const WATER_HOURS = [10, 12, 14, 16, 18];
export const QUOTE_HOUR = 9;
export const DEADLINE_WARNING_HOUR = 20;
export const MORNING_HOUR = 8;
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

// Urgent quest times for one day: spread over the waking hours, at least 90 minutes apart.
export function urgentTimes(uid, dateKey, count, base) {
  const rand = seeded(`${uid}:${dateKey}`);
  const span = (URGENT.dayEndHour - URGENT.dayStartHour) * 60 - 30;
  const slot = span / Math.max(1, count);
  return Array.from({ length: count }, (_, i) => {
    const minute = Math.round(URGENT.dayStartHour * 60 + i * slot + rand() * (slot - 45));
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
      urgentTimes(uid, key, perDay, base).slice(done).forEach((date, i) => add({
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
    if (s.quote) {
      const q = quoteOfDay(key, 0, player.profile?.schools);
      add({ id: `quote-${key}`, date: at(base, 0, QUOTE_HOUR), title: t.notify.quoteTitle, body: `${q.text} (${q.who})`, data: { kind: "status" } });
    }
    // Your own reminders ("don't forget"): daily ones every day, one-off ones on their date.
    (player.reminders ?? []).forEach((r) => {
      if (r.repeat !== "daily" && r.date !== key) return;
      const [hh, mm] = String(r.time).split(":").map(Number);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
      add({ id: `rem-${r.id}-${key}`, date: at(base, 0, hh, mm), title: t.notify.reminderTitle, body: r.text, data: { kind: "status" } });
    });
    if (s.morning) {
      add({ id: `morning-${key}`, date: at(base, 0, MORNING_HOUR), title: t.notify.morningTitle, body: t.notify.morningBody, data: { kind: "quests" } });
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
