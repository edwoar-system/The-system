// Gym split: the exercises, the split templates, and today's gym day.
// You pick a template once, edit its exercises and choose your gym days. On a gym day your STR main quest
// is that day of the split; in the gym you only log weight and reps.

// Muscles per exercise: real muscle ids (see muscles.js), 1 = main muscle.
// bw: bodyweight exercise (weight is extra weight, may be 0).
export const EXERCISES = [
  // Chest
  { id: "bench", name: "Bench press", sets: 4, reps: 8, muscles: { lowerChest: 1, upperChest: 0.7, tricepsLateral: 0.7, tricepsLong: 0.4, frontDelt: 0.6 } },
  { id: "inclineDb", name: "Incline dumbbell press", sets: 3, reps: 10, muscles: { upperChest: 1, lowerChest: 0.5, frontDelt: 0.7, tricepsLateral: 0.5 } },
  { id: "dbBench", name: "Dumbbell bench press", sets: 3, reps: 10, muscles: { lowerChest: 1, upperChest: 0.6, frontDelt: 0.5, tricepsLateral: 0.5 } },
  { id: "chestFly", name: "Cable or machine fly", sets: 3, reps: 12, muscles: { lowerChest: 1, upperChest: 0.8, frontDelt: 0.3 } },
  { id: "dips", name: "Dips", sets: 3, reps: 10, bw: true, muscles: { lowerChest: 0.9, tricepsLateral: 1, tricepsLong: 0.7, frontDelt: 0.6 } },
  { id: "pushup", name: "Push-ups", sets: 3, reps: 15, bw: true, muscles: { lowerChest: 1, upperChest: 0.6, tricepsLateral: 0.7, frontDelt: 0.5, serratus: 0.4, upperAbs: 0.3 } },
  // Shoulders
  { id: "ohp", name: "Overhead press", sets: 4, reps: 8, muscles: { frontDelt: 1, sideDelt: 0.6, tricepsLateral: 0.6, tricepsLong: 0.5, upperTraps: 0.4, upperChest: 0.3 } },
  { id: "dbShoulder", name: "Dumbbell shoulder press", sets: 3, reps: 10, muscles: { frontDelt: 1, sideDelt: 0.6, tricepsLateral: 0.5 } },
  { id: "lateral", name: "Lateral raises", sets: 3, reps: 15, muscles: { sideDelt: 1, upperTraps: 0.3 } },
  { id: "facePull", name: "Face pulls", sets: 3, reps: 15, muscles: { rearDelt: 1, rotatorCuff: 0.8, midTraps: 0.6, rhomboids: 0.5 } },
  { id: "rearFly", name: "Rear delt fly", sets: 3, reps: 15, muscles: { rearDelt: 1, rhomboids: 0.5, midTraps: 0.5 } },
  { id: "shrug", name: "Shrugs", sets: 3, reps: 12, muscles: { upperTraps: 1, forearmFlexors: 0.4 } },
  // Back
  { id: "pullup", name: "Pull-ups", sets: 4, reps: 8, bw: true, muscles: { lats: 1, biceps: 0.7, brachialis: 0.6, rhomboids: 0.6, lowerTraps: 0.5, rearDelt: 0.4, forearmFlexors: 0.4 } },
  { id: "chinup", name: "Chin-ups", sets: 3, reps: 8, bw: true, muscles: { lats: 1, biceps: 0.9, brachialis: 0.6, rhomboids: 0.5 } },
  { id: "latPull", name: "Lat pulldown", sets: 3, reps: 10, muscles: { lats: 1, biceps: 0.6, rhomboids: 0.5, lowerTraps: 0.4 } },
  { id: "row", name: "Barbell row", sets: 4, reps: 8, muscles: { lats: 0.9, rhomboids: 1, midTraps: 0.8, rearDelt: 0.6, biceps: 0.5, lowerBack: 0.5 } },
  { id: "cableRow", name: "Seated cable row", sets: 3, reps: 10, muscles: { rhomboids: 1, midTraps: 0.8, lats: 0.8, rearDelt: 0.5, biceps: 0.5 } },
  { id: "dbRow", name: "One-arm dumbbell row", sets: 3, reps: 10, muscles: { lats: 1, rhomboids: 0.7, rearDelt: 0.5, biceps: 0.5 } },
  { id: "deadlift", name: "Deadlift", sets: 3, reps: 5, muscles: { lowerBack: 1, gluteMax: 1, hamstringOuter: 0.8, hamstringInner: 0.8, upperTraps: 0.6, forearmFlexors: 0.6, lats: 0.4, rectusFemoris: 0.4 } },
  { id: "backExt", name: "Back extensions", sets: 3, reps: 12, bw: true, muscles: { lowerBack: 1, gluteMax: 0.7, hamstringInner: 0.5 } },
  // Arms
  { id: "curl", name: "Biceps curls", sets: 3, reps: 12, muscles: { biceps: 1, brachialis: 0.6, forearmFlexors: 0.4 } },
  { id: "hammer", name: "Hammer curls", sets: 3, reps: 12, muscles: { brachialis: 1, biceps: 0.7, forearmExtensors: 0.6 } },
  { id: "pushdown", name: "Triceps pushdown", sets: 3, reps: 12, muscles: { tricepsLateral: 1, tricepsLong: 0.6 } },
  { id: "overheadExt", name: "Overhead triceps extension", sets: 3, reps: 12, muscles: { tricepsLong: 1, tricepsLateral: 0.5 } },
  { id: "skull", name: "Skull crushers", sets: 3, reps: 10, muscles: { tricepsLong: 1, tricepsLateral: 0.8 } },
  { id: "wristCurl", name: "Wrist curls", sets: 3, reps: 15, muscles: { forearmFlexors: 1, forearmExtensors: 0.3 } },
  // Legs
  { id: "squat", name: "Back squat", sets: 4, reps: 6, muscles: { rectusFemoris: 1, vastusLateralis: 1, vastusMedialis: 0.9, gluteMax: 0.9, adductors: 0.6, lowerBack: 0.5, hamstringInner: 0.3 } },
  { id: "frontSquat", name: "Front squat", sets: 3, reps: 6, muscles: { rectusFemoris: 1, vastusMedialis: 1, vastusLateralis: 0.9, gluteMax: 0.6, upperAbs: 0.4 } },
  { id: "legPress", name: "Leg press", sets: 3, reps: 10, muscles: { vastusLateralis: 1, vastusMedialis: 1, rectusFemoris: 0.8, gluteMax: 0.7, adductors: 0.4 } },
  { id: "rdl", name: "Romanian deadlift", sets: 3, reps: 8, muscles: { hamstringOuter: 1, hamstringInner: 1, gluteMax: 0.9, lowerBack: 0.6, forearmFlexors: 0.4 } },
  { id: "lunge", name: "Walking lunges", sets: 3, reps: 10, muscles: { rectusFemoris: 0.9, vastusLateralis: 0.8, gluteMax: 1, gluteMed: 0.6, adductors: 0.5 } },
  { id: "bulgarian", name: "Bulgarian split squat", sets: 3, reps: 8, muscles: { gluteMax: 1, rectusFemoris: 0.9, vastusMedialis: 0.8, gluteMed: 0.6, adductors: 0.5 } },
  { id: "legCurl", name: "Leg curl", sets: 3, reps: 12, muscles: { hamstringInner: 1, hamstringOuter: 1, gastrocnemius: 0.3 } },
  { id: "legExt", name: "Leg extension", sets: 3, reps: 12, muscles: { rectusFemoris: 1, vastusMedialis: 1, vastusLateralis: 1 } },
  { id: "hipThrust", name: "Hip thrust", sets: 3, reps: 10, muscles: { gluteMax: 1, gluteMed: 0.5, hamstringOuter: 0.5 } },
  { id: "adductor", name: "Adductor machine", sets: 3, reps: 12, muscles: { adductors: 1 } },
  { id: "abductor", name: "Abductor machine", sets: 3, reps: 12, muscles: { gluteMed: 1, gluteMax: 0.4 } },
  { id: "calfRaise", name: "Calf raises", sets: 4, reps: 12, muscles: { gastrocnemius: 1, soleus: 0.7 } },
  { id: "seatedCalf", name: "Seated calf raises", sets: 3, reps: 15, muscles: { soleus: 1, gastrocnemius: 0.4 } },
  // Core
  { id: "hangingRaise", name: "Hanging leg raises", sets: 3, reps: 12, bw: true, muscles: { lowerAbs: 1, hipFlexors: 0.9, upperAbs: 0.6, obliques: 0.4, forearmFlexors: 0.4 } },
  { id: "cableCrunch", name: "Cable crunch", sets: 3, reps: 12, muscles: { upperAbs: 1, lowerAbs: 0.6, obliques: 0.4 } },
  { id: "woodchop", name: "Cable woodchop", sets: 3, reps: 12, muscles: { obliques: 1, upperAbs: 0.4, serratus: 0.4 } },
  { id: "abWheel", name: "Ab wheel rollout", sets: 3, reps: 10, bw: true, muscles: { upperAbs: 1, lowerAbs: 0.8, lats: 0.4, serratus: 0.4 } },
  { id: "neckCurl", name: "Neck curls and extensions", sets: 2, reps: 15, muscles: { neck: 1, upperTraps: 0.4 } },
];
export const exerciseById = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

// Templates: one entry per day of the split.
export const TEMPLATES = {
  ppl: { name: "Push, pull, legs", sub: "3 days that repeat. Good for 3 to 6 gym days a week.", days: [
    { name: "Push", ex: ["bench", "ohp", "inclineDb", "lateral", "pushdown", "overheadExt"] },
    { name: "Pull", ex: ["pullup", "row", "facePull", "curl", "hammer", "shrug"] },
    { name: "Legs", ex: ["squat", "rdl", "legPress", "legCurl", "calfRaise", "hangingRaise"] },
  ] },
  upperLower: { name: "Upper and lower", sub: "2 days that repeat. Good for 4 gym days a week.", days: [
    { name: "Upper", ex: ["bench", "row", "ohp", "pullup", "curl", "pushdown"] },
    { name: "Lower", ex: ["squat", "rdl", "bulgarian", "legCurl", "calfRaise", "cableCrunch"] },
  ] },
  fullBody: { name: "Full body", sub: "Two full-body days that swap. Good for 2 or 3 gym days a week.", days: [
    { name: "Full body A", ex: ["squat", "bench", "row", "lateral", "curl", "hangingRaise"] },
    { name: "Full body B", ex: ["deadlift", "ohp", "pullup", "lunge", "pushdown", "woodchop"] },
  ] },
  bodyPart: { name: "Body-part split", sub: "One muscle group a day, 5 days. For 5 gym days a week.", days: [
    { name: "Chest", ex: ["bench", "inclineDb", "chestFly", "dips"] },
    { name: "Back", ex: ["deadlift", "pullup", "row", "cableRow", "shrug"] },
    { name: "Shoulders", ex: ["ohp", "lateral", "facePull", "rearFly"] },
    { name: "Arms", ex: ["curl", "hammer", "skull", "pushdown", "wristCurl"] },
    { name: "Legs", ex: ["squat", "legPress", "rdl", "legExt", "legCurl", "calfRaise"] },
  ] },
};
export const TEMPLATE_IDS = Object.keys(TEMPLATES);
export const LOG_MODES = ["sets", "lines"];
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]; // Monday first

// A fresh split from a template: each exercise with its default sets and reps.
export function splitFrom(templateId, weekdays = [0, 2, 4]) {
  const tpl = TEMPLATES[templateId];
  return {
    template: templateId,
    days: tpl.days.map((d) => ({ name: d.name, ex: d.ex.map((id) => ({ id, sets: exerciseById[id].sets, reps: exerciseById[id].reps })) })),
    weekdays,
    log: "sets",
    next: 0,
  };
}

// Muscle weights for a split day (or for the sets you actually did): a muscle that gets about
// 6 hard sets as a main muscle counts as fully worked (1).
export function dayMuscles(exercises) {
  const sum = {};
  exercises.forEach(({ id, sets }) => {
    const e = exerciseById[id];
    if (!e) return;
    Object.entries(e.muscles).forEach(([m, k]) => { sum[m] = (sum[m] ?? 0) + (sets ?? e.sets) * k; });
  });
  return Object.fromEntries(Object.entries(sum).map(([m, v]) => [m, Math.min(1, Math.round((v / 6) * 100) / 100)]));
}

// About 2.5 minutes per set, warm-up included.
export const dayMinutes = (day) => Math.max(20, Math.min(120, Math.round((day.ex.reduce((n, e) => n + (e.sets ?? 3), 0) * 2.5) / 5) * 5));

// Monday = 0.
export const weekdayOf = (dateKey) => (new Date(`${dateKey}T12:00:00`).getDay() + 6) % 7;

// Gym quests from your split have ids "gs:<day index>".
export function splitQuest(id, gym) {
  const i = Number(id.split(":")[1]);
  const day = gym?.days?.[i];
  if (!day) return null;
  return {
    id, skill: "gym", stat: "STR", type: "gym", difficulty: "hard", gymDay: i,
    minutes: dayMinutes(day), title: `Gym: ${day.name} day`, muscles: dayMuscles(day.ex),
    counts: day.ex.map((e) => exerciseById[e.id]?.name).filter(Boolean).join(", "),
  };
}

// Today's split day, if today is a gym day: the next day in the cycle, or the first one
// whose main muscles aren't tired (tiredHit(muscles) says if a day leans on tired muscles).
export function gymToday(gym, dateKey, tiredHit = () => false) {
  if (!gym?.days?.length || !gym.weekdays?.includes(weekdayOf(dateKey))) return null;
  const n = gym.days.length;
  const planned = (gym.next ?? 0) % n;
  for (let k = 0; k < n; k++) {
    const i = (planned + k) % n;
    if (!tiredHit(dayMuscles(gym.days[i].ex))) return { index: i, planned, swapped: i !== planned };
  }
  return { index: planned, planned, swapped: false, allTired: true };
}
