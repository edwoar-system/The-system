// Streak rules. The streak counts days with every main quest done.
// Normal: never miss twice. One missed day between two full days keeps the streak (the missed day just doesn't count);
// two missed days in a row break it. Research: missing once doesn't hurt a habit, quitting after a "broken" streak does.
// Hard mode: strict. Every day counts. A streak shield covers one more missed day in both modes.
import { todayKey } from "./quests";
import { isHard } from "./hard";

const DAY = 86400000;
const noon = (key) => Date.parse(`${key}T12:00:00`);
export const addDays = (key, n) => todayKey(new Date(noon(key) + n * DAY));

// Free missed days in a row.
export const missAllowance = (player, now = Date.now()) => (isHard(player, now) ? 0 : 1);

// Whole days from the last full day to today (0 = today, 1 = yesterday). No full day yet: Infinity.
export const daysSince = (dateKey, today = todayKey()) => (dateKey ? Math.round((noon(today) - noon(dateKey)) / DAY) : Infinity);

// The streak as it stands today (0 once it has broken).
export function liveStreak(player, today = todayKey(), now = Date.now()) {
  return daysSince(player?.lastAllMainsDate, today) <= 1 + missAllowance(player, now) ? player?.streak ?? 0 : 0;
}

// The streak after every main quest is done today.
export function nextStreak(player, today = todayKey(), now = Date.now()) {
  const d = daysSince(player?.lastAllMainsDate, today);
  if (d === 0) return Math.max(1, player?.streak ?? 0);
  return d <= 1 + missAllowance(player, now) ? (player?.streak ?? 0) + 1 : 1;
}

// At the start of a new day: if the streak would break today and you hold a shield, the shield covers one
// missed day. Returns the new lastAllMainsDate, or null when no shield is needed or there is none.
export function shieldCover(player, today = todayKey(), now = Date.now()) {
  if ((player?.streakShields ?? 0) <= 0 || (player?.streak ?? 0) <= 0) return null;
  const d = daysSince(player?.lastAllMainsDate, today);
  return d === 2 + missAllowance(player, now) ? addDays(player.lastAllMainsDate, 1) : null;
}

// Today decides the streak: done → it grows, missed → it breaks (normal mode: yesterday was already missed).
export function streakOnTheLine(player, today = todayKey(), now = Date.now()) {
  if ((player?.streak ?? 0) <= 0) return false;
  const d = daysSince(player?.lastAllMainsDate, today);
  return d >= 1 && d === 1 + missAllowance(player, now);
}

// Normal mode, yesterday missed but the streak lives: "don't miss twice".
export const missedYesterday = (player, today = todayKey(), now = Date.now()) =>
  !isHard(player, now) && (player?.streak ?? 0) > 0 && daysSince(player?.lastAllMainsDate, today) === 2;
