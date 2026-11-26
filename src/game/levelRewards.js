// What a level-up gives, like in Solo Leveling: stat points to put where you want, coins, and a streak shield
// every fifth level. Rewards are claimed once per level (players/{uid}.levelPaid), whatever gave the EXP.
export const STAT_POINTS_PER_LEVEL = 3;
export const levelCoins = (level) => 10 * level;
export const SHIELD_EVERY = 5;

// Rewards for going from level `from` to `to` (exclusive of from).
export function levelRewards(from, to) {
  let coins = 0;
  let shields = 0;
  for (let l = from + 1; l <= to; l++) {
    coins += levelCoins(l);
    if (l % SHIELD_EVERY === 0) shields += 1;
  }
  return { coins, points: Math.max(0, to - from) * STAT_POINTS_PER_LEVEL, shields };
}

// statXp needed for a stat value (inverse of statValue in economy.js).
export const xpForStatValue = (v) => 4 * v * v;
