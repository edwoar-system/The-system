// Your schedule: busy blocks in your usual week (school, training, work). Each day you can skip a block or add
// a one-off one, so the week stays flexible. Urgent quests and water reminders stay out of busy time, and your
// main quests get a suggested time in your free time.
//
// schedule = [{ id, label, days: [0..6] (Monday = 0), start, end }] with hours as decimals (16.5 = 16:30).
// scheduleDay = { date, skip: [block ids], extra: [{ id, label, start, end }] } for today's changes.
import { dayTimes } from "./profile";

export const weekdayOf = (dateKey) => (new Date(`${dateKey}T12:00:00`).getDay() + 6) % 7;
export const MAX_BLOCKS = 20;

// Cuts free gaps out of blocks: a free hour in the middle of school splits it in two.
function minusGaps(blocks, gaps) {
  let out = blocks;
  (gaps ?? []).forEach((g) => {
    out = out.flatMap((b) => {
      if (g.end <= b.start || g.start >= b.end) return [b];
      const parts = [];
      if (g.start > b.start) parts.push({ ...b, id: `${b.id}-a`, end: g.start });
      if (g.end < b.end) parts.push({ ...b, id: `${b.id}-b`, start: g.end });
      return parts;
    });
  });
  return out;
}

// Today's busy blocks, sorted, with your changes for today:
// scheduleDay = { date, skip: [ids], extra: [blocks], edits: { id: { start, end } }, gaps: [{ id, start, end }] }.
// Calendar events (calendarBusy[date], from your iPhone Calendar) count as busy too.
export function busyBlocks(player, dateKey) {
  const day = player?.scheduleDay?.date === dateKey ? player.scheduleDay : null;
  const wd = weekdayOf(dateKey);
  const usual = (player?.schedule ?? []).filter((b) => b.days?.includes(wd) && !day?.skip?.includes(b.id))
    .map((b) => ({ ...b, ...(day?.edits?.[b.id] ?? {}) }));
  const cal = (player?.calendarBusy?.[dateKey] ?? []).map((e, i) => ({ id: `cal${i}`, label: e.label ?? null, start: e.start, end: e.end, calendar: true }));
  return minusGaps([...usual, ...(day?.extra ?? []), ...cal], day?.gaps).filter((b) => b.end > b.start).sort((a, b) => a.start - b.start);
}

// ---- Editing the week one day at a time ----
// Blocks can be shared by several days (days: [0, 2, 4]). Changing one on a single day splits it off.
const newId = () => `b${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
export const blocksOn = (schedule, d) => (schedule ?? []).filter((b) => b.days?.includes(d)).sort((a, b) => a.start - b.start);
export function editOnDay(schedule, id, d, patch) {
  const b = schedule.find((x) => x.id === id);
  if (!b) return schedule;
  if (b.days.length === 1) return schedule.map((x) => (x.id === id ? { ...x, ...patch } : x));
  return [...schedule.map((x) => (x.id === id ? { ...x, days: x.days.filter((k) => k !== d) } : x)), { ...b, ...patch, id: newId(), days: [d] }];
}
export function removeOnDay(schedule, id, d) {
  return schedule.map((x) => (x.id === id ? { ...x, days: x.days.filter((k) => k !== d) } : x)).filter((x) => x.days.length);
}
export const addOnDay = (schedule, d, block) => [...schedule, { ...block, id: newId(), days: [d] }];
// Copy one day to other days: those days get exactly the same blocks.
export function copyDay(schedule, from, to) {
  const targets = to.filter((d) => d !== from);
  return schedule.map((x) => {
    const days = x.days.filter((k) => !targets.includes(k));
    return { ...x, days: x.days.includes(from) ? [...new Set([...days, ...targets])].sort() : days };
  }).filter((x) => x.days.length);
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
  let slots = freeSlots(player, dateKey).map((s) => ({ ...s, start: nowHour != null ? Math.max(s.start, nowHour) : s.start })).filter((s) => s.end > s.start);
  // Your best time of day ("Your energy" in Tune) goes first: free time is cut at its edges and that part is filled first.
  const win = { morning: [0, 12], afternoon: [12, 17], evening: [17, 30] }[player?.profile?.energy];
  if (win) {
    const pieces = slots.flatMap((s) => [[s.start, Math.min(s.end, win[0])], [Math.max(s.start, win[0]), Math.min(s.end, win[1])], [Math.max(s.start, win[1]), s.end]])
      .filter(([a, b]) => b > a).map(([a, b]) => ({ start: a, end: b, inWin: a >= win[0] && b <= win[1] }));
    slots = [...pieces.filter((p) => p.inWin), ...pieces.filter((p) => !p.inWin)];
  }
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
