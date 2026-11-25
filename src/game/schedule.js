// Your schedule: busy blocks in your usual week (school, training, work). Each day you can skip a block or add
// a one-off one, so the week stays flexible. Urgent quests and water reminders stay out of busy time, and your
// main quests get a suggested time in your free time.
//
// schedule = [{ id, label, days: [0..6] (Monday = 0), start, end }] with hours as decimals (16.5 = 16:30).
// scheduleDay = { date, skip: [block ids], extra: [{ id, label, start, end }] } for today's changes.
import { dayTimes } from "./profile";

export const weekdayOf = (dateKey) => (new Date(`${dateKey}T12:00:00`).getDay() + 6) % 7;
export const MAX_BLOCKS = 20;

// Today's busy blocks, sorted, with your changes for today.
export function busyBlocks(player, dateKey) {
  const day = player?.scheduleDay?.date === dateKey ? player.scheduleDay : null;
  const wd = weekdayOf(dateKey);
  const usual = (player?.schedule ?? []).filter((b) => b.days?.includes(wd) && !day?.skip?.includes(b.id));
  return [...usual, ...(day?.extra ?? [])].filter((b) => b.end > b.start).sort((a, b) => a.start - b.start);
}

export const isBusy = (blocks, hour) => blocks.some((b) => hour >= b.start && hour < b.end);

// If an hour falls in a busy block, move it to just after that block (5 minutes later). null if that's past `limit`.
export function outsideBusy(blocks, hour, limit = 24) {
  let h = hour;
  for (let i = 0; i < blocks.length + 1; i++) {
    const b = blocks.find((x) => h >= x.start && h < x.end);
    if (!b) return h <= limit ? h : null;
    h = b.end + 5 / 60;
  }
  return null;
}

// Free time between waking up (plus half an hour) and going to bed (minus an hour).
export function freeSlots(player, dateKey) {
  const { wake, bed } = dayTimes(player?.profile);
  const from = wake + 0.5;
  const to = Math.min(bed - 1, 23.5);
  const slots = [];
  let cur = from;
  busyBlocks(player, dateKey).forEach((b) => {
    if (b.start > cur) slots.push({ start: cur, end: Math.min(b.start, to) });
    cur = Math.max(cur, b.end);
  });
  if (cur < to) slots.push({ start: cur, end: to });
  return slots.filter((s) => s.end - s.start >= 0.25);
}

// A suggested start time for each quest ({ id, minutes }), in order, with 15 minutes between them.
// Quests that don't fit anywhere get no time.
export function suggestTimes(quests, player, dateKey, nowHour = null) {
  const slots = freeSlots(player, dateKey).map((s) => ({ ...s, start: nowHour != null ? Math.max(s.start, nowHour) : s.start })).filter((s) => s.end > s.start);
  const out = {};
  quests.forEach((q) => {
    const need = Math.max(10, q.minutes ?? 20) / 60;
    const slot = slots.find((s) => s.end - s.start >= need);
    if (!slot) return;
    out[q.id] = Math.round(slot.start * 4) / 4;
    slot.start += need + 0.25;
  });
  return out;
}

export const hhmm = (h) => { const m = Math.round(h * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
