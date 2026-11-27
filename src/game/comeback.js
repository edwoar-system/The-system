// Never miss twice: a daily habit you track and kept up lately, but missed yesterday, comes back today as a
// main quest worth more ("cb:<habit>"). At most one a day: water first, then the habit you missed longest.
import { HABIT_IDS, tracked } from "./habits";
import { dayNum } from "./skills";
import { guildQuest } from "./guild";

const BUMP = { easy: "normal", normal: "hard", hard: "hard" };
export const COMEBACK_PREFIX = "cb:";

export function comebackFor(player, date) {
  const today = dayNum(date);
  const habits = tracked(player).filter((id) => HABIT_IDS.includes(id) && guildQuest(`g:${id}`));
  const missed = habits.filter((id) => {
    const days = player?.skills?.[id]?.days ?? [];
    const lately = days.some((d) => d < today - 1 && d >= today - 8); // kept it up in the week before
    return lately && !days.includes(today - 1);
  });
  if (!missed.length) return null;
  return missed.includes("water") ? "water" : missed[0];
}

// The quest: the habit's own task, one step harder (so it pays more), with a clear "don't miss twice".
export function comebackQuest(id) {
  const habit = id.slice(COMEBACK_PREFIX.length);
  const base = guildQuest(`g:${habit}`);
  if (!base) return null;
  return { ...base, id, difficulty: BUMP[base.difficulty] ?? "normal", comeback: true, title: `Don't miss twice · ${base.title}` };
}
