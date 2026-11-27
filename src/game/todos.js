// Your own to-dos: one-off things for today or tomorrow (take out the trash, clean your room). Not part of the
// quest board or the streak; each done one pays a little, the first few a day.
export const TODO_COINS = 2;
export const TODO_PAID_PER_DAY = 5;
export const TODO_MAX = 40;
export const TODO_KEEP_DAYS = 7;

// Open ones from today and before (they roll over), plus the ones done today.
export function todosToday(player, today) {
  return (player?.todos ?? []).filter((x) => (x.done ? x.doneOn === today : x.date <= today));
}
export const todosLater = (player, today) => (player?.todos ?? []).filter((x) => !x.done && x.date > today);
export const paidToday = (player, today) => (player?.todoPaid?.date === today ? player.todoPaid.n : 0);
