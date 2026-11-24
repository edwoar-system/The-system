// Urgent quests: a pop-up with a rest option and a short task. Pure data and rules, no Firestore here.
import { questCoins, questXp } from "./economy";

export const URGENT = {
  acceptMinutes: 10, // the pop-up disappears after this
  extraMinutes: 5, // added to the quest's own length after accepting
  followUpMinutes: 60, // after the rest option: time to do something productive
  idleHours: 2, // no quest for this long -> urgent quest
  minGapMinutes: 90, // at least this long between two offers
  randomChance: 0.2, // chance per check when you're not idle
  checkEveryMinutes: 30, // how often a random check may happen
  urgencyBonus: 2, // flat coins on top of the task, so a 5-minute task is still worth accepting
  dayStartHour: 8,
  dayEndHour: 22,
  defaultPerDay: 2,
};

export const REST_OPTIONS = [
  { id: "nap", title: "Power nap, 20 min", how: "Phone face down, lie down, the timer runs.", minutes: 20 },
  { id: "foryou", title: "Do something for yourself, 20 min", how: "Music, a coffee, a short walk. No scrolling.", minutes: 20 },
  { id: "breathe", title: "Lie down and breathe, 10 min", how: "Eyes closed, slow breaths, nothing else.", minutes: 10 },
];

export const TASK_OPTIONS = [
  { id: "squats", title: "30 squats, now", how: "Full depth, in one go or in three sets.", minutes: 5, difficulty: "normal", stat: "STR" },
  { id: "pushups", title: "20 push-ups", how: "Chest to a fist from the floor. Split into sets if you need to.", minutes: 5, difficulty: "hard", stat: "STR" },
  { id: "plank", title: "Plank, 3 × 45 s", how: "Straight line, 30 s rest between holds.", minutes: 5, difficulty: "normal", stat: "STR" },
  { id: "jacks", title: "50 jumping jacks", how: "Steady pace, no stopping.", minutes: 5, difficulty: "normal", stat: "AGI" },
  { id: "desk", title: "Clear your desk, 10 min", how: "Everything off it that doesn't belong there.", minutes: 10, difficulty: "easy", stat: "VIT" },
  { id: "walk", title: "Walk 10 minutes outside", how: "Out the door, no phone in your hand.", minutes: 10, difficulty: "easy", stat: "VIT" },
  { id: "words", title: "Japanese: 10 new words", how: "Say each one out loud in a sentence.", minutes: 10, difficulty: "normal", stat: "INT" },
  { id: "puzzles", title: "Chess: 5 puzzles", how: "Find the move before you check.", minutes: 10, difficulty: "normal", stat: "INT" },
];

// After the rest option you pick one of these within an hour.
export const FOLLOW_UPS = [
  { id: "japanese", title: "Japanese, 15 min", minutes: 15, difficulty: "normal", stat: "INT" },
  { id: "chess", title: "Chess: 10 puzzles", minutes: 15, difficulty: "normal", stat: "INT" },
  { id: "study", title: "Study, 20 min", minutes: 20, difficulty: "normal", stat: "INT" },
  { id: "stretch", title: "Stretching, 15 min", minutes: 15, difficulty: "easy", stat: "AGI" },
  { id: "meditate", title: "Meditate, 10 min", minutes: 10, difficulty: "hard", stat: "WIL" },
  { id: "pushups", title: "Push-ups: 3 sets", minutes: 10, difficulty: "hard", stat: "STR" },
];

const byId = (list) => Object.fromEntries(list.map((o) => [o.id, o]));
export const restById = byId(REST_OPTIONS);
export const taskById = byId(TASK_OPTIONS);
export const followById = byId(FOLLOW_UPS);

// What an option pays. The task pays the urgent ×1.5 plus a flat bonus; rest pays half of the task it was offered with.
export function taskReward(task) {
  return { coins: questCoins({ ...task, urgent: true }) + URGENT.urgencyBonus, xp: questXp(task) + 5, stat: task.stat };
}
export function restReward(rest, task) {
  const tr = taskReward(task);
  return { coins: Math.max(1, Math.round(tr.coins / 2)), xp: Math.max(1, Math.round(tr.xp / 2)), stat: "VIT" };
}
export function followReward(f) {
  return { coins: questCoins({ ...f, urgent: true }), xp: questXp(f), stat: f.stat };
}
export const skipCost = (task) => Math.max(1, Math.round(taskReward(task).coins / 4));
export const failCost = (reward) => Math.ceil(reward.coins / 2);
export const FOLLOW_FAIL_COST = Math.ceil(questCoins({ minutes: 15, urgent: true }) / 2);

// Should the System offer an urgent quest right now? Returns "idle", "random" or null.
// A random roll only happens once per checkEveryMinutes (the caller stores lastUrgentCheckAt).
export function urgentReason(player, now = Date.now(), todayKey, rand = Math.random) {
  const u = player?.urgent;
  if (u && ["offered", "active", "followup"].includes(u.status)) return null;
  const hour = new Date(now).getHours();
  if (hour < URGENT.dayStartHour || hour >= URGENT.dayEndHour) return null;
  const perDay = player?.urgentPerDay ?? URGENT.defaultPerDay;
  const count = player?.urgentToday?.date === todayKey ? player.urgentToday.count : 0;
  if (count >= perDay) return null;
  if (u?.offeredAt && now - u.offeredAt < URGENT.minGapMinutes * 60000) return null;
  if (player?.lastQuestAt && now - player.lastQuestAt > URGENT.idleHours * 3600000) return "idle";
  if (now - (player?.lastUrgentCheckAt ?? 0) > URGENT.checkEveryMinutes * 60000) return rand() < URGENT.randomChance ? "random" : "checked";
  return null;
}

// Two options: one rest, one task, picked at random.
export function pickOptions(rand = Math.random) {
  return { rest: REST_OPTIONS[Math.floor(rand() * REST_OPTIONS.length)].id, task: TASK_OPTIONS[Math.floor(rand() * TASK_OPTIONS.length)].id };
}
