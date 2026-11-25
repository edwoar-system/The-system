// Penalty Zone rules (see the rules doc): a missed main quest at the deadline sends you in, unless a shield is used.
// Inside: apps sealed (with app blocking), no EXP loss, shop open. Out: a redemption quest, or wait until the morning.

import { dayTimes } from "./profile";

export const PENALTY = {
  deadlineHour: 21,
  morningHour: 7,
  defaultSeverity: "normal",
};

export const SEVERITIES = ["light", "normal", "harsh"];

// Redemption quests: same weight, so you can pick one that fits your day. Harsh asks more.
export const REDEMPTIONS = [
  { id: "run", normal: "Run 3 km", harsh: "Run 5 km", proof: "Strava or Apple Health (honour until linked)", stat: "AGI" },
  { id: "pushups", normal: "150 push-ups, any sets", harsh: "225 push-ups, any sets", proof: "Honour", stat: "STR" },
  { id: "squats", normal: "200 squats, any sets", harsh: "300 squats, any sets", proof: "Honour", stat: "STR" },
  { id: "study", normal: "60 min deep study", harsh: "90 min deep study", proof: "Phone sealed for the whole block", stat: "INT" },
  { id: "cycle", normal: "Cycle 45 min", harsh: "Cycle 70 min", proof: "Strava or Apple Health (honour until linked)", stat: "AGI" },
];
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
  if (!day?.date || day.penaltyChecked) return null;
  if (!Array.isArray(day.mains) || day.mains.every((m) => m.done)) return null;
  if (now < deadlineOf(day.date, player?.profile, day.extraMin ?? 0)) return null;
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
