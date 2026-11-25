// Hard mode: you lock yourself in for a number of days you pick. While it runs, your reminders can't be turned off,
// your Tune the System answers and quest swaps are locked, reminders come every hour, and late app time costs more.
// The only ways out early: pay coins (more the more days are left) or burn a streak shield.
export const HARD_DAYS = [3, 7, 14, 30, 60];
export const HARD_EXIT_PER_DAY = 40;
export const HARD_EXIT_MIN = 100;
const DAY = 86400000;

export const isHard = (player, now = Date.now()) => (player?.hard?.until ?? 0) > now;
export const hardDaysLeft = (player, now = Date.now()) => (isHard(player, now) ? Math.ceil((player.hard.until - now) / DAY) : 0);
export const hardExitPrice = (player, now = Date.now()) => Math.max(HARD_EXIT_MIN, hardDaysLeft(player, now) * HARD_EXIT_PER_DAY);
