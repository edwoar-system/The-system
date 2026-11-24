// Penalty Zone rules (see the rules doc): a missed main quest at the deadline sends you in, unless a shield is used.
// Inside: apps sealed (with app blocking), no EXP loss, shop open. Out: a redemption quest, or wait until the morning.

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

export const deadlineOf = (dateKey) => at(dateKey, PENALTY.deadlineHour);

// When the penalty for a missed day ends.
export function penaltyUntil(dateKey, severity = PENALTY.defaultSeverity) {
  if (severity === "light") return at(dateKey, 0, 1); // midnight
  return at(dateKey, PENALTY.morningHour, 1); // next morning
}

// Does this day's board earn a penalty right now? Returns "penalty", "shield" or null.
export function penaltyDue(day, player, now = Date.now()) {
  if (!day?.date || day.penaltyChecked) return null;
  if (!Array.isArray(day.mains) || day.mains.every((m) => m.done)) return null;
  if (now < deadlineOf(day.date)) return null;
  if (now >= penaltyUntil(day.date, player.penaltySeverity)) return null; // already over (app wasn't opened)
  return (player.shields ?? 0) > 0 ? "shield" : "penalty";
}

export const isInPenalty = (player, now = Date.now()) =>
  player?.penalty?.status === "active" && now < player.penalty.until;
