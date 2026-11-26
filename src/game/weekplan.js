// Your week: a skill planned on fixed weekdays at a time ("golf before school on Monday, Tuesday and Thursday").
// On those days its guild quest is on your board by itself, and the System reminds you before the time.
// players/{uid}.weekPlan = { [skillId]: { days: [1..7] (Monday = 1), time: "07:00" } }

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
export const PLAN_TIMES = ["06:30", "07:00", "07:30", "12:30", "15:30", "17:00", "18:30", "20:00"];

// Monday = 1 … Sunday = 7 for a date.
export const weekdayOf = (date = new Date()) => (date.getDay() === 0 ? 7 : date.getDay());

// Skills planned on this date's weekday, with their time.
export function plannedOn(player, date = new Date()) {
  const wd = weekdayOf(date);
  return Object.entries(player?.weekPlan ?? {})
    .filter(([, p]) => Array.isArray(p?.days) && p.days.includes(wd))
    .map(([skill, p]) => ({ skill, time: p.time ?? null }))
    .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
}
