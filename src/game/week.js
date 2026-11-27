// This week: things you want to do this week without knowing when yet ("climb at least once", "start
// breakdancing"). Optionally on a day (and time). players/{uid}.week = { key: Monday's date, items: [...] }
//   item: { id, skill?: skillId, text?: free text, times: 1–7, day?: 1–7 (Monday = 1), time?: "HH:MM", done?: n }
// Skill items count every day you trained that skill this week; text items count when cleared as a side quest.
import { todayKey } from "./quests";
import { dayNum } from "./skills";
import { weekdayOf } from "./weekplan";
import { freeSlots } from "./schedule";
import { guildQuest } from "./guild";

export const WEEK_MAX = 12;
export const mondayKey = (now = new Date()) => {
  const d = new Date(now);
  d.setDate(d.getDate() - (weekdayOf(d) - 1));
  return todayKey(d);
};
// Only this week's list counts; a new week starts empty.
export const weekItems = (player, now = new Date()) => (player?.week?.key === mondayKey(now) ? player.week.items ?? [] : []);

// Skill items: the days you trained it this week, or what you ticked yourself, whichever is more.
export function weekDone(player, item, now = new Date()) {
  if (!item.skill) return item.done ?? 0;
  const mon = dayNum(mondayKey(now));
  return Math.max(item.done ?? 0, (player?.skills?.[item.skill]?.days ?? []).filter((d) => d >= mon).length);
}
export const WEEK_COINS = 3;

const hhmm = (h) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
// When could you do it? The first free slot long enough on each day left this week (from your wake and bed
// times and Your week), skipping days that already have something planned. Returns [{ day, time }].
export function suggestWhen(player, item, now = new Date(), max = 3) {
  const hours = (item.skill ? guildQuest(`g:${item.skill}`)?.minutes ?? 45 : 60) / 60;
  const taken = new Set(weekItems(player, now).filter((x) => x.day && x.id !== item.id).map((x) => x.day));
  const out = [];
  for (let i = 0; i < 7 && out.length < max; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const wd = weekdayOf(d);
    if (i > 0 && wd === 1) break; // next week
    if (taken.has(wd)) continue;
    const soonest = i === 0 ? now.getHours() + now.getMinutes() / 60 + 1 : 0;
    const slot = freeSlots(player, todayKey(d)).map((s) => ({ ...s, start: Math.ceil(Math.max(s.start, soonest) * 2) / 2 })).find((s) => s.end - s.start >= hours);
    if (slot) out.push({ day: wd, time: hhmm(slot.start), today: i === 0 });
  }
  return out;
}
export const weekLeft = (player, item, now) => Math.max(0, (item.times ?? 1) - weekDone(player, item, now));

// Planned for today and not done yet: skill ones go on the board, a text one becomes today's side quest.
export const weekToday = (player, now = new Date()) => weekItems(player, now).filter((x) => x.day === weekdayOf(now) && weekLeft(player, x, now) > 0);
