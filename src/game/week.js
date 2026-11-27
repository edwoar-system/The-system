// This week: things you want to do this week without knowing when yet ("climb at least once", "start
// breakdancing"). Optionally on a day (and time). players/{uid}.week = { key: Monday's date, items: [...] }
//   item: { id, skill?: skillId, text?: free text, times: 1–7, day?: 1–7 (Monday = 1), time?: "HH:MM", done?: n }
// Skill items count every day you trained that skill this week; text items count when cleared as a side quest.
import { todayKey } from "./quests";
import { dayNum } from "./skills";
import { weekdayOf } from "./weekplan";

export const WEEK_MAX = 12;
export const mondayKey = (now = new Date()) => {
  const d = new Date(now);
  d.setDate(d.getDate() - (weekdayOf(d) - 1));
  return todayKey(d);
};
// Only this week's list counts; a new week starts empty.
export const weekItems = (player, now = new Date()) => (player?.week?.key === mondayKey(now) ? player.week.items ?? [] : []);

export function weekDone(player, item, now = new Date()) {
  if (!item.skill) return item.done ?? 0;
  const mon = dayNum(mondayKey(now));
  return (player?.skills?.[item.skill]?.days ?? []).filter((d) => d >= mon).length;
}
export const weekLeft = (player, item, now) => Math.max(0, (item.times ?? 1) - weekDone(player, item, now));

// Planned for today and not done yet: skill ones go on the board, a text one becomes today's side quest.
export const weekToday = (player, now = new Date()) => weekItems(player, now).filter((x) => x.day === weekdayOf(now) && weekLeft(player, x, now) > 0);
