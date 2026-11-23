// The coin and XP formula. Pure functions only, so the numbers are easy to test and tune.
// Design: see the doc "The System — wat we willen" (Economie). Anchor: a normal good day ≈ 60 coins ≈ 60 min screen time.

export const ECONOMY = {
  coinsPerEffortMinute: 0.5, // 1 hour of real work = 30 minutes of screen time
  difficulty: { easy: 0.8, normal: 1, hard: 1.3 },
  urgentMultiplier: 1.5,
  choiceMultiplier: 1.2,
  allMainsBonus: 0.2, // +20% of the day's main-quest coins when all mains are done
  repeatFalloff: [1, 0.7, 0.4, 0.2], // same quest type again on one day pays less
  xpPerEffortMinute: 1,
  dailyScreenTimeTarget: 60, // minutes; tune after 1–2 weeks of real data
};

export function repeatFactor(timesAlreadyToday) {
  const f = ECONOMY.repeatFalloff;
  return f[Math.min(timesAlreadyToday, f.length - 1)];
}

// Coins for finishing a quest.
export function questCoins({ minutes, difficulty = "normal", urgent = false, choice = false, timesAlreadyToday = 0 }) {
  let c = minutes * ECONOMY.coinsPerEffortMinute * (ECONOMY.difficulty[difficulty] ?? 1);
  if (urgent) c *= ECONOMY.urgentMultiplier;
  if (choice) c *= ECONOMY.choiceMultiplier;
  c *= repeatFactor(timesAlreadyToday);
  return Math.max(1, Math.round(c));
}

export function questXp({ minutes, difficulty = "normal", timesAlreadyToday = 0 }) {
  const x = minutes * ECONOMY.xpPerEffortMinute * (ECONOMY.difficulty[difficulty] ?? 1) * repeatFactor(timesAlreadyToday);
  return Math.max(1, Math.round(x));
}

export function allMainsBonus(mainCoinsToday) {
  return Math.round(mainCoinsToday * ECONOMY.allMainsBonus);
}

// Levels get slower as you climb: XP needed to go from level n to n+1 = 100 · n^1.5.
export function xpToNext(level) {
  return Math.round(100 * Math.pow(level, 1.5));
}

export function levelFromXp(totalXp) {
  let level = 1;
  let rest = totalXp;
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level += 1;
  }
  return { level, xpIntoLevel: rest, xpForLevel: xpToNext(level) };
}
