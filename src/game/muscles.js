// Muscles: which quests train which muscle groups, and how much of the week's training each group got.
// Load = quest minutes / 10 × the muscle's weight for that skill (1 = main muscle, 0.3 = helper).
// A group is fully trained for the week at WEEK_TARGET load (about 60 focused minutes).

export const MUSCLES = [
  { id: "chest", name: "Chest", side: "front" },
  { id: "shoulders", name: "Shoulders", side: "both" },
  { id: "biceps", name: "Biceps", side: "front" },
  { id: "triceps", name: "Triceps", side: "back" },
  { id: "forearms", name: "Forearms", side: "both" },
  { id: "abs", name: "Abs", side: "front" },
  { id: "obliques", name: "Obliques", side: "front" },
  { id: "traps", name: "Traps", side: "both" },
  { id: "back", name: "Upper back and lats", side: "back" },
  { id: "lowerback", name: "Lower back", side: "back" },
  { id: "glutes", name: "Glutes", side: "back" },
  { id: "quads", name: "Quads", side: "front" },
  { id: "hamstrings", name: "Hamstrings", side: "back" },
  { id: "calves", name: "Calves", side: "both" },
];
export const muscleById = Object.fromEntries(MUSCLES.map((m) => [m.id, m]));
export const WEEK_TARGET = 6;

const SKILL_MUSCLES = {
  // STR
  pushups: { chest: 1, triceps: 0.8, shoulders: 0.6, abs: 0.3 },
  pullups: { back: 1, biceps: 0.8, forearms: 0.5, shoulders: 0.3, abs: 0.2 },
  dips: { chest: 0.7, triceps: 1, shoulders: 0.6 },
  handstand: { shoulders: 1, triceps: 0.6, traps: 0.5, abs: 0.4 },
  pistol: { quads: 1, glutes: 0.8, calves: 0.3, abs: 0.3 },
  toes: { calves: 1 },
  iso: { abs: 1, quads: 0.6, forearms: 0.6, back: 0.3, shoulders: 0.3 },
  core: { abs: 1, obliques: 0.8, lowerback: 0.3 },
  grip: { forearms: 1, traps: 0.4 },
  fingers: { forearms: 1, back: 0.3 },
  kettlebell: { glutes: 1, hamstrings: 0.8, lowerback: 0.6, shoulders: 0.5, forearms: 0.5, abs: 0.4, traps: 0.3 },
  boulder: { forearms: 1, back: 0.9, biceps: 0.6, shoulders: 0.5, abs: 0.5, calves: 0.2 },
  // AGI
  running: { calves: 0.8, quads: 0.6, hamstrings: 0.5, glutes: 0.5 },
  sprints: { hamstrings: 0.9, glutes: 0.9, quads: 0.8, calves: 0.8 },
  swim: { back: 0.8, shoulders: 0.8, chest: 0.4, triceps: 0.4, abs: 0.3 },
  cycle: { quads: 1, glutes: 0.6, calves: 0.5, hamstrings: 0.3 },
  rope: { calves: 1, shoulders: 0.3, forearms: 0.3 },
  windsurf: { forearms: 0.9, back: 0.8, shoulders: 0.6, abs: 0.5, quads: 0.5, lowerback: 0.4, calves: 0.3 },
  boxing: { shoulders: 0.9, obliques: 0.7, abs: 0.4, triceps: 0.4, calves: 0.4, back: 0.3 },
  breakdance: { shoulders: 0.7, abs: 0.6, triceps: 0.5, obliques: 0.5, quads: 0.4, forearms: 0.4 },
  skate: { quads: 0.5, calves: 0.5, glutes: 0.4, abs: 0.3 },
  footwork: { calves: 0.8, quads: 0.5, glutes: 0.3 },
  balance: { calves: 0.5, abs: 0.4, glutes: 0.4 },
  golf: { obliques: 0.6, forearms: 0.4, abs: 0.3, back: 0.3 },
  // VIT
  walk: { calves: 0.4, quads: 0.3, glutes: 0.3 },
  zone2: { quads: 0.5, calves: 0.5, glutes: 0.3, hamstrings: 0.3 },
  posture: { back: 0.3, traps: 0.3 },
};

// Gym sessions by index in GYM_SESSIONS: push, pull, legs, full body, upper / lower.
const GYM_MUSCLES = [
  { chest: 1, shoulders: 0.9, triceps: 0.9 },
  { back: 1, biceps: 0.9, traps: 0.6, forearms: 0.5, shoulders: 0.3 },
  { quads: 1, glutes: 0.9, hamstrings: 0.9, calves: 0.6, lowerback: 0.3 },
  { chest: 0.6, back: 0.6, quads: 0.7, glutes: 0.6, hamstrings: 0.5, shoulders: 0.5, abs: 0.4 },
  { chest: 0.5, back: 0.5, shoulders: 0.5, quads: 0.5, glutes: 0.5, hamstrings: 0.4, biceps: 0.3, triceps: 0.3 },
];

// The muscle weights for a quest, or null when it trains no muscles.
export function questMuscles(q) {
  if (!q?.skill) return null;
  if (q.skill === "gym") return GYM_MUSCLES[q.session] ?? GYM_MUSCLES[3];
  return SKILL_MUSCLES[q.skill] ?? null;
}

// Load per muscle that one finished quest adds.
export function questLoad(q) {
  const w = questMuscles(q);
  if (!w) return null;
  return Object.fromEntries(Object.entries(w).map(([m, k]) => [m, Math.round((q.minutes / 10) * k * 10) / 10]));
}

// Loads are stored per week: muscleLoad = { "<week number>": { muscle: n } }. Only this week and last week are kept.
export function addLoad(weekLoadNow = {}, load) {
  const next = { ...weekLoadNow };
  Object.entries(load).forEach(([m, n]) => { next[m] = Math.round(((next[m] ?? 0) + n) * 10) / 10; });
  return next;
}

export function weekLoad(muscleLoad, week) {
  return { load: muscleLoad?.[week] ?? {}, lastWeek: muscleLoad?.[week - 1] ?? {} };
}

// 0–1 per muscle, and the week's coverage in percent (average over all groups, each capped at 100%).
export const level = (n) => Math.min(1, (n ?? 0) / WEEK_TARGET);
export function coverage(load) {
  return Math.round((MUSCLES.reduce((sum, m) => sum + level(load[m.id]), 0) / MUSCLES.length) * 100);
}
