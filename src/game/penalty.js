// Penalty Zone rules (see the rules doc): a missed main quest at the deadline sends you in, unless a shield is used.
// Inside: apps sealed (with app blocking), no EXP loss, shop open. Out: a redemption quest, or wait until the morning.

import { needsFirst } from "./firstQuests";
import { dayTimes } from "./profile";

export const PENALTY = {
  deadlineHour: 21,
  morningHour: 7,
  defaultSeverity: "normal",
};

// off: no Penalty Zone at all (missed quests just stay missed). For people who want the quests without the pressure.
export const SEVERITIES = ["off", "light", "normal", "harsh"];

// Redemption quests: same weight, so you can pick one that fits your day. Harsh asks more.
// Nothing is finished with one tap: each has a minimum time (the FINISHED button unlocks after it, counted from
// when you chose it), and the ones you can show need a photo (a screenshot of your run, your clean room).
// minutes: [normal, harsh]. photo: proof needed to finish.
export const REDEMPTIONS = [
  { id: "pushups", normal: "150 push-ups, any sets", harsh: "225 push-ups, any sets", minutes: [12, 18], stat: "STR" },
  { id: "squats", normal: "200 squats, any sets", harsh: "300 squats, any sets", minutes: [12, 18], stat: "STR" },
  { id: "run", normal: "Run 3 km", harsh: "Run 5 km", minutes: [15, 25], photo: true, stat: "AGI" },
  { id: "cycle", normal: "Cycle 45 min", harsh: "Cycle 70 min", minutes: [45, 70], photo: true, stat: "AGI" },
  { id: "tidy", normal: "Clean your room, 20 min", harsh: "Clean your room, 40 min", minutes: [20, 40], photo: true, stat: "VIT" },
  { id: "study", normal: "60 min deep study", harsh: "90 min deep study", minutes: [60, 90], stat: "INT" },
  { id: "meditate", normal: "Meditate 15 min", harsh: "Meditate 25 min", minutes: [15, 25], stat: "WIL" },
  { id: "read", normal: "Read 30 min", harsh: "Read 45 min", minutes: [30, 45], stat: "INT" },
];
export const redemptionMinutes = (r, severity) => r.minutes[severity === "harsh" ? 1 : 0];
// When FINISHED unlocks (ms timestamp), counted from the moment you chose it.
export const redemptionReadyAt = (penalty) => {
  const r = redemptionById[penalty?.redemption];
  return r ? (penalty.startedAt ?? 0) + redemptionMinutes(r, penalty.severity) * 60000 : null;
};
export const redemptionById = Object.fromEntries(REDEMPTIONS.map((r) => [r.id, r]));
export const redemptionTitle = (r, severity) => (severity === "harsh" ? r.harsh : r.normal);

const at = (dateKey, hour, addDays = 0) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d + addDays, hour, 0, 0, 0).getTime();
};

// The day ends an hour before your bedtime (between 20:00 and 23:00): that's the deadline for your main quests.
export function dayEndHour(profile) {
  return Math.min(23, Math.max(20, dayTimes(profile).bed - 1));
}
// extraMin: minutes bought for today (pay coins for more time, up to your bedtime).
export const deadlineOf = (dateKey, profile = null, extraMin = 0) => {
  const h = dayEndHour(profile);
  return at(dateKey, Math.floor(h)) + (Math.round((h % 1) * 60) + extraMin) * 60000;
};

// More time: 30 minutes at a time, twice at most (so up to your bedtime). 15 coins, then 30; double in Hard mode.
export const EXTRA_STEP = 30;
export const EXTRA_PRICES = [15, 30];
export const extraBought = (day) => Math.round((day?.extraMin ?? 0) / EXTRA_STEP);
export const extraPrice = (day, hard = false) => {
  const p = EXTRA_PRICES[extraBought(day)];
  return p == null ? null : p * (hard ? 2 : 1);
};

// When the penalty for a missed day ends.
export function penaltyUntil(dateKey, severity = PENALTY.defaultSeverity) {
  if (severity === "light") return at(dateKey, 0, 1); // midnight
  return at(dateKey, PENALTY.morningHour, 1); // next morning
}

// Does this day's board earn a penalty right now? Returns "penalty", "shield" or null.
export function penaltyDue(day, player, now = Date.now()) {
  if (!day?.date || day.penaltyChecked || day.first || needsFirst(player)) return null;
  if (!Array.isArray(day.mains) || day.mains.every((m) => m.done)) return null;
  if (now < deadlineOf(day.date, player?.profile, day.extraMin ?? 0)) return null;
  if (severityFor(player, day.date) === "off") return null;
  if (now >= penaltyUntil(day.date, severityFor(player, day.date))) return null; // already over (app wasn't opened)
  return (player.shields ?? 0) > 0 ? "shield" : "penalty";
}

export const isInPenalty = (player, now = Date.now()) =>
  player?.penalty?.status === "active" && now < player.penalty.until;

// A severity change made after setup counts from the next day, so you can't soften tonight's penalty at 20:59.
export function severityFor(player, dateKey) {
  if (player?.penaltySeverityNext && player.penaltySeverityFrom && player.penaltySeverityFrom <= dateKey) return player.penaltySeverityNext;
  return player?.penaltySeverity ?? PENALTY.defaultSeverity;
}
