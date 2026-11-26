// Sub-scenarios (urgent quests): a short, optional task from a skill you picked, offered only while you're home.
// A small notice you can wave away; nothing is lost if you pass or run out of time. Pure data and rules.
import { questCoins, questXp } from "./economy";
import { busyBlocks, isBusy } from "./schedule";
import { interestSkills } from "./profile";
import { skillById } from "./guild";
import { needsFirst } from "./firstQuests";

export const URGENT = {
  acceptMinutes: 15, // the notice disappears after this
  extraMinutes: 5, // added to the task's own length after accepting
  idleHours: 2, // no quest for this long -> a sub-scenario
  minGapMinutes: 90, // at least this long between two offers
  randomChance: 0.2, // chance per check when you're not idle
  checkEveryMinutes: 30, // how often a random check may happen
  urgencyBonus: 2, // flat coins on top, so a 5-minute task is still worth it
  dayStartHour: 8,
  dayEndHour: 22,
  defaultPerDay: 2,
};

// How many a day (Settings). 0 turns them off.
export const urgentPerDayOf = (player) => player?.urgentOptIn ?? URGENT.defaultPerDay;

// Short tasks per skill. Only skills you ticked in Tune the System are ever offered.
const TASKS = [
  { id: "pushups", skill: "pushups", title: "20 push-ups", how: "Chest to a fist from the floor. Split into sets if you need to.", minutes: 5, difficulty: "hard" },
  { id: "pullups", skill: "pullups", title: "3 sets of pull-ups", how: "As many clean reps as you can, a minute's rest between sets.", minutes: 8, difficulty: "hard" },
  { id: "core", skill: "core", title: "Plank, 3 × 45 s", how: "Straight line, 30 s rest between holds.", minutes: 5, difficulty: "normal" },
  { id: "iso", skill: "iso", title: "Wall sit, 3 × 45 s", how: "Thighs level with the floor, back flat on the wall.", minutes: 5, difficulty: "normal" },
  { id: "dips", skill: "dips", title: "3 sets of dips", how: "Two chairs or a bench. Elbows back, slow down.", minutes: 6, difficulty: "normal" },
  { id: "handstand", skill: "handstand", title: "Handstand practice, 10 min", how: "Wall holds or kick-ups. Short tries, full rest.", minutes: 10, difficulty: "normal" },
  { id: "kettlebell", skill: "kettlebell", title: "50 kettlebell swings", how: "Or a heavy backpack. Hips snap, arms just hold on.", minutes: 6, difficulty: "normal" },
  { id: "rope", skill: "rope", title: "Jump rope, 5 × 1 min", how: "30 s rest between rounds.", minutes: 8, difficulty: "normal" },
  { id: "stretch", skill: "stretch", title: "Stretch, 10 min", how: "Hips, hamstrings and shoulders. Breathe out into each stretch.", minutes: 10, difficulty: "easy" },
  { id: "toes", skill: "toes", title: "Toe-touch work, 5 min", how: "Slow forward folds, knees soft, hold the last one.", minutes: 5, difficulty: "easy" },
  { id: "balance", skill: "balance", title: "Balance, 1 min each leg × 3", how: "Eyes closed for the last round if it's easy.", minutes: 6, difficulty: "easy" },
  { id: "posture", skill: "posture", title: "Posture reset, 5 min", how: "Wall angels and chin tucks, 3 rounds.", minutes: 5, difficulty: "easy" },
  { id: "yoga", skill: "yoga", title: "Yoga flow, 10 min", how: "Sun salutations at an easy pace.", minutes: 10, difficulty: "easy" },
  { id: "tidy", skill: "tidy", title: "Clear your desk, 10 min", how: "Everything off it that doesn't belong there.", minutes: 10, difficulty: "easy" },
  { id: "water", skill: "water", title: "Drink a big glass of water", how: "All of it, then refill it for later.", minutes: 2, difficulty: "easy" },
  { id: "cook", skill: "cook", title: "Prep one healthy snack", how: "Cut fruit or vegetables for later.", minutes: 10, difficulty: "easy" },
  { id: "study", skill: "study", title: "Study sprint, 15 min", how: "One section, phone in another room.", minutes: 15, difficulty: "normal" },
  { id: "maths", skill: "maths", title: "5 maths problems", how: "From your book. Check each answer.", minutes: 15, difficulty: "normal" },
  { id: "memory", skill: "memory", title: "Memory drill, 10 min", how: "Learn a list or a deck order, then test yourself.", minutes: 10, difficulty: "normal" },
  { id: "typing", skill: "typing", title: "Typing test × 3", how: "Eyes on the screen, not the keys.", minutes: 8, difficulty: "easy" },
  { id: "coding", skill: "coding", title: "Code for 15 minutes", how: "One small thing in your project, then commit.", minutes: 15, difficulty: "normal" },
  { id: "writing", skill: "writing", title: "Write 150 words", how: "No editing until you're done.", minutes: 10, difficulty: "normal" },
  { id: "music", skill: "music", title: "Practise your instrument, 15 min", how: "One hard bar, slowly, then up to speed.", minutes: 15, difficulty: "normal" },
  { id: "chess", skill: "chess", title: "Chess: 5 puzzles", how: "Find the move before you check.", minutes: 10, difficulty: "normal" },
  { id: "reading", skill: "reading", title: "Read 10 pages", how: "Phone face down.", minutes: 12, difficulty: "easy" },
  { id: "cube", skill: "cube", title: "Solve the cube 3 times", how: "Time the last one.", minutes: 8, difficulty: "easy" },
  { id: "meditation", skill: "meditation", title: "Meditate, 5 min", how: "Eyes closed, count breaths to ten, start again.", minutes: 5, difficulty: "normal" },
  { id: "breath", skill: "breath", title: "Box breathing, 5 min", how: "In 4, hold 4, out 4, hold 4.", minutes: 5, difficulty: "easy" },
  { id: "philosophy", skill: "philosophy", title: "Read one passage and answer its question", how: "Learn tab, Philosophy. Write one line back.", minutes: 10, difficulty: "normal" },
  { id: "journal", skill: "journal", title: "Write 5 lines in your journal", how: "What happened, what you'd do again.", minutes: 5, difficulty: "easy" },
  { id: "gratitude", skill: "gratitude", title: "Write 3 things you're glad about", how: "Small ones count.", minutes: 3, difficulty: "easy" },
  { id: "reachout", skill: "reachout", title: "Message a friend you haven't talked to in a while", how: "A real question, not just \"hey\".", minutes: 5, difficulty: "easy" },
  { id: "helphome", skill: "helphome", title: "Help out at home, 10 min", how: "Dishes, laundry, or ask what's needed.", minutes: 10, difficulty: "easy" },
];
// Any language you ticked gets the same task, with its name.
const LANGUAGES = ["japanese", "latin", "spanish", "french", "german", "italian", "portuguese", "korean", "mandarin"];
const langTask = (skill) => ({ id: `lang:${skill}`, skill, title: `${skillById[skill]?.name ?? skill}: 10 new words`, how: "Say each one out loud in a sentence.", minutes: 10, difficulty: "normal" });

// The task for an id, with its stat from the skill.
export function taskById(id) {
  const base = id?.startsWith("lang:") ? langTask(id.slice(5)) : TASKS.find((x) => x.id === id);
  return base ? { ...base, stat: skillById[base.skill]?.stat ?? "WIL" } : null;
}

// What you could be offered: tasks of the skills you picked.
export function urgentTasks(player) {
  const liked = interestSkills(player?.profile);
  return [...TASKS.filter((x) => liked.has(x.skill)).map((x) => x.id), ...LANGUAGES.filter((l) => liked.has(l)).map((l) => `lang:${l}`)];
}
export function pickTask(player, rand = Math.random) {
  const ids = urgentTasks(player);
  return ids.length ? ids[Math.floor(rand() * ids.length)] : null;
}

// What it pays: ×1.5 plus a flat bonus.
export function taskReward(task) {
  return { coins: questCoins({ ...task, urgent: true }) + URGENT.urgencyBonus, xp: questXp(task) + 5, stat: task.stat };
}
// The rank letter shown as the scenario's difficulty.
export const DIFF_LETTER = { easy: "F", normal: "E", hard: "D" };

// Should the System offer one right now? Returns "idle", "random", "checked" or null.
// Only while you're home (situation from game/situation.js), awake, not busy, and only if you picked a skill that has one.
export function urgentReason(player, now = Date.now(), todayKey, situation = null, rand = Math.random) {
  if (situation !== "home" || needsFirst(player)) return null;
  if (!urgentTasks(player).length) return null;
  const u = player?.urgent;
  if (u && ["offered", "active"].includes(u.status)) return null;
  const hour = new Date(now).getHours();
  if (hour < URGENT.dayStartHour || hour >= URGENT.dayEndHour) return null;
  const d = new Date(now);
  if (todayKey && isBusy(busyBlocks(player, todayKey), d.getHours() + d.getMinutes() / 60)) return null;
  const perDay = urgentPerDayOf(player);
  const count = player?.urgentToday?.date === todayKey ? player.urgentToday.count : 0;
  if (count >= perDay) return null;
  if (u?.offeredAt && now - u.offeredAt < URGENT.minGapMinutes * 60000) return null;
  if (player?.lastQuestAt && now - player.lastQuestAt > URGENT.idleHours * 3600000) return "idle";
  if (now - (player?.lastUrgentCheckAt ?? 0) > URGENT.checkEveryMinutes * 60000) return rand() < URGENT.randomChance ? "random" : "checked";
  return null;
}
