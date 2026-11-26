// The questionnaire ("Tune the System"): optional parts you can answer any time, in any order.
// Each part changes something real: timing, which quests you get, and what your effort is worth to you.
// Everyone has their own mountain: what's hard for you pays more for you.

// Only questions that change something are asked.
export const PARTS = ["day", "interests", "drive", "energy", "mountains", "duties", "mind", "about"];

// What drives you: changes how reminders talk to you.
export const DRIVES = ["progress", "streak", "coins", "push", "friends"];
// When you have the most energy: quests are suggested in that part of the day first.
export const ENERGY = ["morning", "afternoon", "evening"];
// How good you are at each interest: 0 new, 1 some experience, 2 experienced (starts a tier higher).
export const LEVELS = [0, 1, 2];
// The skills of an interest, for looking up your level in a skill.
export const interestOfSkill = (skill) => INTERESTS.find((i) => i.skills.includes(skill))?.id ?? null;

// Interests: groups of skills. Picked interests are preferred in main quests and guild suggestions.
export const INTERESTS = [
  { id: "strength", name: "Strength training", skills: ["gym", "pushups", "pullups", "pistol", "iso", "core", "grip", "dips", "kettlebell", "handstand"] },
  { id: "climbing", name: "Climbing", skills: ["boulder", "fingers"] },
  { id: "endurance", name: "Running and endurance", skills: ["running", "rope", "sprints", "swim", "cycle", "zone2", "walk"] },
  { id: "sport", name: "Sports and moves", skills: ["skate", "golf", "windsurf", "footwork", "boxing", "breakdance", "snowboard", "ski", "surf", "tennis", "football", "basketball", "juggling"] },
  { id: "mobility", name: "Mobility and balance", skills: ["toes", "stretch", "balance", "posture", "yoga"] },
  { id: "health", name: "Health and sleep", skills: ["sleep", "winddown", "water", "cook", "light", "coldshower", "cold", "tidy"] },
  { id: "study", name: "Study and maths", skills: ["study", "maths", "memory", "docu", "typing"] },
  { id: "languages", name: "Languages", skills: ["japanese", "latin", "spanish", "french", "german", "italian", "portuguese", "korean", "mandarin", "morse"] },
  { id: "create", name: "Making things", skills: ["coding", "writing", "music", "crafts"] },
  { id: "games", name: "Chess and reading", skills: ["chess", "reading", "cube"] },
  { id: "mind", name: "Mind and philosophy", skills: ["meditation", "breath", "philosophy", "journal", "gratitude", "silent", "nophone", "hardfirst", "craving"] },
  { id: "social", name: "People", skills: ["reachout", "kindness", "conversation", "compliment", "thanks", "speaking", "plan", "listen", "helphome"] },
];
// Groups where you'd never want all of them (nobody learns ten languages): only the ones you tick count.
const PICK_ONLY = new Set(["languages", "sport"]);
// The skills you chose. Only these give you quests: a skill you never ticked never shows up.
// Older profiles picked whole groups; there every skill counts except the pick-only groups.
export const interestSkills = (profile) => {
  if (Array.isArray(profile?.picked)) return new Set(profile.picked);
  return new Set((profile?.interests ?? []).filter((id) => !PICK_ONLY.has(id)).flatMap((id) => INTERESTS.find((i) => i.id === id)?.skills ?? []));
};
// The groups that hold at least one skill you picked (for your level per group).
export const pickedGroups = (picked) => INTERESTS.filter((i) => i.skills.some((s) => picked.includes(s))).map((i) => i.id);

// Mountains: how hard each area is for you. Your own mountain pays more.
export const MOUNTAINS = [
  { id: "mornings", name: "Getting up and the first hour" },
  { id: "body", name: "Exercise" },
  { id: "focus", name: "Studying and focus" },
  { id: "habits", name: "Healthy habits" },
  { id: "phone", name: "Putting the phone away" },
  { id: "people", name: "Reaching out to people" },
];
export const MOUNTAIN_LEVELS = [1, 2, 3, 4]; // easy for me … very hard for me
export const MOUNTAIN_FACTOR = { 1: 0.9, 2: 1, 3: 1.15, 4: 1.3 };

// Which mountain a quest type climbs.
const TYPE_MOUNTAIN = {
  start: "mornings", sleep: "mornings",
  workout: "body", gym: "body", climb: "body", cardio: "body", sport: "body", mobility: "body", skill: "body", walk: "body",
  study: "focus", reading: "focus", language: "focus", chess: "focus", create: "focus",
  health: "habits", chores: "habits", cold: "habits", journal: "habits", duty: "habits",
  mind: "phone",
  social: "people",
};
export function mountainFactor(profile, type) {
  const m = TYPE_MOUNTAIN[type];
  const level = m ? profile?.mountains?.[m] : null;
  return level ? MOUNTAIN_FACTOR[level] ?? 1 : 1;
}

// Duties: everyday things not everybody has. Ticked ones become your own quests.
// freq: "daily" shows every day; "weekly" stays until done that week.
export const DUTIES = [
  { id: "trash", name: "Take out the trash", minutes: 5, freq: "weekly" },
  { id: "dishes", name: "Do the dishes", minutes: 15, freq: "daily" },
  { id: "laundry", name: "Do the laundry", minutes: 20, freq: "weekly" },
  { id: "groceries", name: "Do the groceries", minutes: 30, freq: "weekly" },
  { id: "dinner", name: "Cook dinner for the household", minutes: 40, freq: "weekly" },
  { id: "pet", name: "Walk or feed the pet", minutes: 20, freq: "daily" },
  { id: "bed", name: "Change the bed sheets", minutes: 10, freq: "weekly" },
  { id: "bathroom", name: "Clean the bathroom", minutes: 20, freq: "weekly" },
  { id: "homework", name: "Homework for tomorrow", minutes: 30, freq: "daily" },
  { id: "plants", name: "Water the plants", minutes: 5, freq: "weekly" },
  { id: "sibling", name: "Help a brother or sister", minutes: 15, freq: "weekly" },
  { id: "bag", name: "Pack your bag for tomorrow", minutes: 5, freq: "daily" },
];
export const dutyById = Object.fromEntries(DUTIES.map((d) => [d.id, d]));

// A duty as a quest: "d:<id>".
export function dutyQuest(id) {
  const d = dutyById[id.slice(2)];
  if (!d) return null;
  return { id, duty: d.id, stat: "VIT", type: "duty", difficulty: "easy", minutes: d.minutes, title: d.name, freq: d.freq };
}

// Weekly duties have a day (0 = Monday … 6 = Sunday; Saturday when you haven't picked one).
// From that day on, a weekly duty that isn't done yet becomes a real main quest, and it waits until it's done that week.
export const DEFAULT_DUTY_DAY = 5;
export const dutyDay = (profile, id) => profile?.dutyDays?.[id] ?? DEFAULT_DUTY_DAY;
const weekdayOfKey = (key) => (new Date(`${key}T12:00:00`).getDay() + 6) % 7;
export function dutiesDue(player, todayKey, week) {
  const doneWeek = player?.duties?.week === week ? player.duties.thisWeek ?? [] : [];
  return (player?.profile?.duties ?? []).filter((id) => dutyById[id]?.freq === "weekly" && !doneWeek.includes(id) && weekdayOfKey(todayKey) >= dutyDay(player.profile, id));
}

// Your duties today: daily ones, and weekly ones not yet done this week.
export function dutiesToday(player, todayKey, week) {
  const mine = player?.profile?.duties ?? [];
  const doneToday = player?.duties?.date === todayKey ? player.duties.today ?? [] : [];
  const doneWeek = player?.duties?.week === week ? player.duties.thisWeek ?? [] : [];
  return mine.map((id) => dutyById[id]).filter(Boolean).map((d) => ({
    ...d,
    done: d.freq === "daily" ? doneToday.includes(d.id) : doneWeek.includes(d.id),
  }));
}

// Day timing from the "Your day" part. Defaults when not answered.
export function dayTimes(profile) {
  const parse = (v, dflt) => {
    const m = String(v ?? "").match(/^(\d{1,2}):(\d{2})$/);
    return m ? Number(m[1]) + Number(m[2]) / 60 : dflt;
  };
  const wake = parse(profile?.wake, 7.5);
  let bed = parse(profile?.bed, 23);
  if (bed <= wake) bed += 24; // after midnight
  return { wake, bed };
}

// Which parts are answered.
export function partsDone(profile) {
  const p = profile ?? {};
  return {
    about: p.age != null || p.sex != null || p.weight != null,
    day: !!p.wake || !!p.bed,
    interests: (p.picked ?? p.interests ?? []).length > 0,
    mountains: Object.keys(p.mountains ?? {}).length > 0,
    mind: (p.schools ?? []).length > 0,
    duties: Array.isArray(p.duties) && p.duties.length > 0,
    drive: !!p.drive,
    energy: !!p.energy,
  };
}
