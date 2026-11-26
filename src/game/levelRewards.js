// What a level-up gives: coins, and a streak shield every fifth level. No stat points: a stat only grows
// from doing quests of that stat, so your stats always show what you actually did. Rewards are claimed once per level (players/{uid}.levelPaid), whatever gave the EXP.
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
  return { coins, shields };
}

