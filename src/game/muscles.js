// Muscles: 35 real muscles, which quests and gym exercises train them, how much of the week's training
// each one got, and how tired each one is right now.
//
// Load = minutes / 10 × the muscle's weight (1 = main muscle, 0.3 = helper). A muscle is fully trained for
// the week at WEEK_TARGET load (about 60 focused minutes). Skills can list rough groups ("chest", "back");
// those spread over the real muscles with GROUPS below.

export const REGIONS = ["shoulders", "chest", "arms", "core", "back", "legs"];

export const MUSCLES = [
  { id: "neck", name: "Neck", region: "back", minor: true },
  { id: "upperTraps", name: "Upper traps", region: "back" },
  { id: "midTraps", name: "Middle traps", region: "back" },
  { id: "lowerTraps", name: "Lower traps", region: "back" },
  { id: "rhomboids", name: "Rhomboids", region: "back" },
  { id: "lats", name: "Lats", region: "back" },
  { id: "lowerBack", name: "Lower back", region: "back" },
  { id: "frontDelt", name: "Front delts", region: "shoulders" },
  { id: "sideDelt", name: "Side delts", region: "shoulders" },
  { id: "rearDelt", name: "Rear delts", region: "shoulders" },
  { id: "rotatorCuff", name: "Rotator cuff", region: "shoulders", minor: true },
  { id: "upperChest", name: "Upper chest", region: "chest" },
  { id: "lowerChest", name: "Lower chest", region: "chest" },
  { id: "serratus", name: "Serratus", region: "chest", minor: true },
  { id: "biceps", name: "Biceps", region: "arms" },
  { id: "brachialis", name: "Brachialis", region: "arms", minor: true },
  { id: "tricepsLong", name: "Triceps (long head)", region: "arms" },
  { id: "tricepsLateral", name: "Triceps (outer head)", region: "arms" },
  { id: "forearmFlexors", name: "Forearm flexors", region: "arms" },
  { id: "forearmExtensors", name: "Forearm extensors", region: "arms" },
  { id: "upperAbs", name: "Upper abs", region: "core" },
  { id: "lowerAbs", name: "Lower abs", region: "core" },
  { id: "obliques", name: "Obliques", region: "core" },
  { id: "hipFlexors", name: "Hip flexors", region: "core", minor: true },
  { id: "gluteMax", name: "Glutes", region: "legs" },
  { id: "gluteMed", name: "Side glutes", region: "legs" },
  { id: "adductors", name: "Adductors (inner thigh)", region: "legs" },
  { id: "rectusFemoris", name: "Quads (middle)", region: "legs" },
  { id: "vastusLateralis", name: "Quads (outer)", region: "legs" },
  { id: "vastusMedialis", name: "Quads (inner)", region: "legs" },
  { id: "hamstringOuter", name: "Hamstrings (outer)", region: "legs" },
  { id: "hamstringInner", name: "Hamstrings (inner)", region: "legs" },
  { id: "gastrocnemius", name: "Calves", region: "legs" },
  { id: "soleus", name: "Soleus (lower calf)", region: "legs" },
  { id: "tibialis", name: "Shins", region: "legs", minor: true },
];
export const muscleById = Object.fromEntries(MUSCLES.map((m) => [m.id, m]));
const MAJOR = MUSCLES.filter((m) => !m.minor);
export const WEEK_TARGET = 6;

// Rough groups (the old 14) and how they spread over the real muscles.
export const GROUPS = {
  chest: { upperChest: 0.8, lowerChest: 1, serratus: 0.3 },
  shoulders: { frontDelt: 1, sideDelt: 0.8, rearDelt: 0.5, rotatorCuff: 0.4 },
  biceps: { biceps: 1, brachialis: 0.7 },
  triceps: { tricepsLong: 0.9, tricepsLateral: 1 },
  forearms: { forearmFlexors: 1, forearmExtensors: 0.8 },
  abs: { upperAbs: 1, lowerAbs: 0.9 },
  obliques: { obliques: 1, serratus: 0.4 },
  traps: { upperTraps: 1, midTraps: 0.7, lowerTraps: 0.5 },
  back: { lats: 1, rhomboids: 0.8, midTraps: 0.6, lowerTraps: 0.5, rearDelt: 0.4, rotatorCuff: 0.4 },
  lowerback: { lowerBack: 1 },
  glutes: { gluteMax: 1, gluteMed: 0.7 },
  quads: { rectusFemoris: 1, vastusLateralis: 1, vastusMedialis: 0.9, hipFlexors: 0.3 },
  hamstrings: { hamstringOuter: 1, hamstringInner: 1 },
  calves: { gastrocnemius: 1, soleus: 0.8, tibialis: 0.3 },
};

// Turns weights that may use groups into weights per real muscle (a muscle hit twice keeps the highest).
export function expand(weights = {}) {
  const out = {};
  Object.entries(weights).forEach(([k, w]) => {
    const spread = GROUPS[k] ?? (muscleById[k] ? { [k]: 1 } : null);
    if (!spread) return;
    Object.entries(spread).forEach(([m, f]) => { out[m] = Math.max(out[m] ?? 0, Math.round(w * f * 100) / 100); });
  });
  return out;
}

const SKILL_MUSCLES = {
  // STR
  pushups: { lowerChest: 1, upperChest: 0.7, tricepsLateral: 0.8, tricepsLong: 0.5, frontDelt: 0.6, serratus: 0.4, abs: 0.3 },
  pullups: { lats: 1, rhomboids: 0.7, midTraps: 0.5, lowerTraps: 0.5, biceps: 0.8, brachialis: 0.7, forearmFlexors: 0.5, rearDelt: 0.4, abs: 0.2 },
  dips: { lowerChest: 1, upperChest: 0.4, tricepsLateral: 1, tricepsLong: 0.8, frontDelt: 0.6 },
  handstand: { frontDelt: 1, sideDelt: 0.8, tricepsLateral: 0.6, tricepsLong: 0.5, upperTraps: 0.6, serratus: 0.5, abs: 0.4, forearmFlexors: 0.4 },
  pistol: { quads: 1, gluteMax: 0.8, gluteMed: 0.6, adductors: 0.4, calves: 0.3, abs: 0.3 },
  toes: { gastrocnemius: 1, soleus: 1, tibialis: 0.3 },
  iso: { abs: 1, quads: 0.6, forearms: 0.6, lats: 0.3, shoulders: 0.3 },
  core: { abs: 1, obliques: 0.8, hipFlexors: 0.5, lowerBack: 0.3 },
  grip: { forearms: 1, upperTraps: 0.4 },
  fingers: { forearmFlexors: 1, forearmExtensors: 0.5, lats: 0.3 },
  kettlebell: { gluteMax: 1, hamstrings: 0.8, lowerBack: 0.6, shoulders: 0.5, forearms: 0.5, abs: 0.4, upperTraps: 0.3 },
  boulder: { forearmFlexors: 1, forearmExtensors: 0.6, lats: 0.9, rhomboids: 0.5, biceps: 0.6, brachialis: 0.6, shoulders: 0.5, abs: 0.5, calves: 0.2 },
  // AGI
  running: { calves: 0.8, quads: 0.6, hamstrings: 0.5, glutes: 0.5, hipFlexors: 0.4 },
  sprints: { hamstrings: 0.9, glutes: 0.9, quads: 0.8, calves: 0.8, hipFlexors: 0.6 },
  swim: { lats: 0.9, shoulders: 0.8, upperChest: 0.4, triceps: 0.4, abs: 0.3 },
  cycle: { quads: 1, gluteMax: 0.6, calves: 0.5, hamstrings: 0.3 },
  rope: { calves: 1, shoulders: 0.3, forearms: 0.3 },
  windsurf: { forearms: 0.9, lats: 0.8, rhomboids: 0.5, shoulders: 0.6, abs: 0.5, quads: 0.5, lowerBack: 0.4, calves: 0.3 },
  boxing: { shoulders: 0.9, obliques: 0.7, serratus: 0.5, abs: 0.4, triceps: 0.4, calves: 0.4, upperTraps: 0.3 },
  breakdance: { shoulders: 0.7, abs: 0.6, triceps: 0.5, obliques: 0.5, quads: 0.4, forearms: 0.4 },
  skate: { quads: 0.5, calves: 0.5, glutes: 0.4, abs: 0.3 },
  snowboard: { quads: 0.9, glutes: 0.7, calves: 0.5, abs: 0.5, obliques: 0.4, hamstrings: 0.3 },
  ski: { quads: 1, glutes: 0.7, hamstrings: 0.4, calves: 0.4, abs: 0.4, gluteMed: 0.4 },
  surf: { lats: 0.9, shoulders: 0.8, triceps: 0.4, quads: 0.4, abs: 0.4, lowerBack: 0.4 },
  tennis: { shoulders: 0.6, obliques: 0.6, forearms: 0.5, quads: 0.5, calves: 0.5 },
  football: { quads: 0.7, hamstrings: 0.6, calves: 0.6, glutes: 0.5, hipFlexors: 0.5, adductors: 0.4 },
  basketball: { calves: 0.7, quads: 0.6, glutes: 0.5, shoulders: 0.4, forearms: 0.3 },
  yoga: { abs: 0.4, shoulders: 0.4, hamstrings: 0.4, glutes: 0.3, lowerBack: 0.3 },
  footwork: { calves: 0.8, quads: 0.5, glutes: 0.3 },
  balance: { calves: 0.5, abs: 0.4, gluteMed: 0.6, tibialis: 0.4 },
  golf: { obliques: 0.6, forearms: 0.4, abs: 0.3, lats: 0.3 },
  // VIT
  walk: { calves: 0.4, quads: 0.3, glutes: 0.3 },
  zone2: { quads: 0.5, calves: 0.5, glutes: 0.3, hamstrings: 0.3 },
  posture: { rhomboids: 0.4, midTraps: 0.4, lowerTraps: 0.3, neck: 0.3 },
};

// Old gym sessions (push, pull, legs, full body, upper / lower), for gym quests without a split.
const GYM_MUSCLES = [
  { chest: 1, frontDelt: 0.9, sideDelt: 0.6, triceps: 0.9 },
  { back: 1, biceps: 0.9, traps: 0.6, forearms: 0.5, rearDelt: 0.6 },
  { quads: 1, glutes: 0.9, hamstrings: 0.9, calves: 0.6, lowerBack: 0.3, adductors: 0.6 },
  { chest: 0.6, back: 0.6, quads: 0.7, glutes: 0.6, hamstrings: 0.5, shoulders: 0.5, abs: 0.4 },
  { chest: 0.5, back: 0.5, shoulders: 0.5, quads: 0.5, glutes: 0.5, hamstrings: 0.4, biceps: 0.3, triceps: 0.3 },
];

// The weights per real muscle for a quest, or null when it trains no muscles.
// A gym quest from your split carries its own weights (q.muscles, from the exercises).
export function questMuscles(q) {
  if (!q?.skill) return null;
  if (q.muscles) return q.muscles;
  if (q.skill === "gym") return expand(GYM_MUSCLES[q.session] ?? GYM_MUSCLES[3]);
  return SKILL_MUSCLES[q.skill] ? expand(SKILL_MUSCLES[q.skill]) : null;
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

// Weeks saved before the real muscles used the 14 groups: spread those over the real muscles.
function readWeek(w = {}) {
  const out = {};
  Object.entries(w).forEach(([k, n]) => {
    if (muscleById[k]) { out[k] = Math.round(((out[k] ?? 0) + n) * 10) / 10; return; }
    Object.entries(GROUPS[k] ?? {}).forEach(([m, f]) => { out[m] = Math.round(((out[m] ?? 0) + n * f) * 10) / 10; });
  });
  return out;
}

export function weekLoad(muscleLoad, week) {
  return { load: readWeek(muscleLoad?.[week]), lastWeek: readWeek(muscleLoad?.[week - 1]) };
}

// 0–1 per muscle, and the week's coverage in percent (average over the main muscles, each capped at 100%).
export const level = (n) => Math.min(1, (n ?? 0) / WEEK_TARGET);
export function coverage(load) {
  return Math.round((MAJOR.reduce((sum, m) => sum + level(load[m.id]), 0) / MAJOR.length) * 100);
}

// ---- Recovery ----
// Each muscle has a fatigue number that goes up with training and halves every few hours.
// A 60-minute session where a muscle is the main one makes it "tired" (1.0). It's "recovering" from 0.35.
// Big muscles take longer: their fatigue halves every 30 hours, smaller ones every 20.
const BIG = new Set(["gluteMax", "rectusFemoris", "vastusLateralis", "vastusMedialis", "hamstringOuter", "hamstringInner", "lats", "lowerBack", "lowerChest", "upperChest", "adductors"]);
export const halfLifeHours = (m) => (BIG.has(m) ? 30 : 20);
export const TIRED = 0.7;
export const RECOVERING = 0.35;

// fatigue = { muscle: [value, timeMs] } as stored on the player.
export function fatigueNow(fatigue = {}, now = Date.now()) {
  const out = {};
  Object.entries(fatigue).forEach(([m, [v, at]]) => {
    const f = v * Math.pow(0.5, Math.max(0, now - at) / 3600000 / halfLifeHours(m));
    if (f >= 0.05) out[m] = Math.round(f * 100) / 100;
  });
  return out;
}

export function addFatigue(fatigue = {}, load = {}, now = Date.now()) {
  const cur = fatigueNow(fatigue, now);
  const next = {};
  Object.entries(cur).forEach(([m, v]) => { next[m] = [v, now]; });
  Object.entries(load).forEach(([m, n]) => {
    if (!muscleById[m]) return;
    next[m] = [Math.min(2, Math.round(((cur[m] ?? 0) + n / WEEK_TARGET) * 100) / 100), now];
  });
  return next;
}

export const recoveryState = (v) => (v >= TIRED ? "tired" : v >= RECOVERING ? "recovering" : "fresh");

// Hours until a muscle is fresh again (below RECOVERING).
export function hoursToFresh(m, v) {
  if (v < RECOVERING) return 0;
  return Math.ceil(halfLifeHours(m) * Math.log2(v / RECOVERING));
}

// The tired muscles right now, as a Set.
export function tiredSet(fatigue, now = Date.now()) {
  return new Set(Object.entries(fatigueNow(fatigue, now)).filter(([, v]) => v >= TIRED).map(([m]) => m));
}

// Does a quest lean on tired muscles? Only its main muscles count (weight 0.7 and up).
export function hitsTired(q, tired) {
  if (!tired?.size) return false;
  const w = questMuscles(q);
  return !!w && Object.entries(w).some(([m, k]) => k >= 0.7 && tired.has(m));
}
