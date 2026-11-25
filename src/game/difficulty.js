// Difficulty: how hard the System makes things for you. Two parts:
//  1. Your level: numbers scale with your rank in the skill (a beginner's 3 push-ups, a strong person's 150).
//  2. Your setting (Settings): Easy, Normal, Hard or Extreme, on top of your level.
export const DIFFICULTIES = ["easy", "normal", "hard", "extreme"];
export const DIFF_FACTOR = { easy: 0.7, normal: 1, hard: 1.3, extreme: 1.6 };
export const DIFF_TIER = { easy: -1, normal: 0, hard: 1, extreme: 1 }; // harder quest tiers for skills
export const DIFF_SETS = { easy: 4, normal: 5, hard: 6, extreme: 7 }; // sets in a set-based quest
export const difficultyOf = (player) => (DIFFICULTIES.includes(player?.difficulty) ? player.difficulty : "normal");

// What a person at each rank (F … S+) can do, as a rough middle of the rank.
export const MAX_PUSHUPS = [5, 15, 30, 45, 65, 90, 125, 160];
export const RUN_KM = [2, 3, 5, 6, 8, 10, 12, 15]; // a comfortable distance
export const RANK_FACTOR = [0.35, 0.55, 0.8, 1, 1.25, 1.5, 1.8, 2.1]; // general body work vs a rank-C person

// Rounds to something that reads well: 3, 5, 10, 25 steps.
export function nice(n) {
  if (n < 10) return Math.max(1, Math.round(n));
  if (n < 30) return Math.round(n / 5) * 5;
  if (n < 100) return Math.round(n / 10) * 10;
  return Math.round(n / 25) * 25;
}
