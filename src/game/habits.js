// Habit monitoring: the habits you track, the bad habits you're quitting, your sleep and your screen time.
import { LADDERS } from "./ladders";
import { todayKey } from "./quests";
import { dayNum } from "./skills";
import { dayTimes } from "./profile";

// Habits are the habit skills (water, sleep, walk...). Their days come from the skill's training days,
// so quests, quick logs and a tap on the Habits screen all count.
export const HABIT_IDS = LADDERS.filter((l) => l.basis === "habit").map((l) => l.id);

// Checks: simple daily yes/no habits that aren't skills (pills, brushing teeth...), plus your own.
// Their days live in checkDays = { id: [day numbers] }.
export const CHECKS = [
  { id: "pills", stat: "VIT" },
  { id: "teeth", stat: "VIT" },
  { id: "sleepBack", stat: "VIT" },
  { id: "morningJournal", stat: "WIL" },
  { id: "noPhoneMorning", stat: "WIL" },
  { id: "noSocialMorning", stat: "WIL" },
];
export const checkById = Object.fromEntries(CHECKS.map((c) => [c.id, c]));
export const isCheck = (id, player) => !!checkById[id] || (player?.customChecks ?? []).some((c) => c.id === id);
export const CHECK_KEEP_DAYS = 60;

export const DEFAULT_TRACKED = ["water", "sleep", "walk", "nophone"];
export const MAX_TRACKED = 10;
export const tracked = (player) => (player?.habits?.length ? player.habits : DEFAULT_TRACKED)
  .filter((id) => HABIT_IDS.includes(id) || isCheck(id, player));

// The days a habit was done, whether it's a skill or a check.
export const habitEntry = (player, id) => (HABIT_IDS.includes(id) ? player?.skills?.[id] : { days: player?.checkDays?.[id] ?? [] });

// Done/not done for each of the last `weeks` weeks (Monday first), oldest first. null = in the future.
export function habitGrid(entry, today = dayNum(), weeks = 5) {
  const set = new Set(entry?.days ?? []);
  const weekday = (new Date(`${todayKey()}T12:00:00`).getDay() + 6) % 7;
  const start = today - weekday - (weeks - 1) * 7;
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const n = start + w * 7 + d;
    return n > today ? null : set.has(n);
  }));
}

// Days in a row up to today (or up to yesterday, if today isn't done yet).
export function habitStreak(entry, today = dayNum()) {
  const set = new Set(entry?.days ?? []);
  let n = set.has(today) ? today : today - 1;
  let streak = 0;
  while (set.has(n)) { streak += 1; n -= 1; }
  return streak;
}

// Share of the last 7 days that were done.
export function weekPct(entry, today = dayNum()) {
  const set = new Set(entry?.days ?? []);
  let done = 0;
  for (let i = 0; i < 7; i++) if (set.has(today - i)) done += 1;
  return Math.round((done / 7) * 100);
}

// ---- Quitting bad habits ----
export const QUIT_PRESETS = ["vaping", "smoking", "junkfood", "sugar", "energy", "doomscroll", "socialmedia", "gaming", "nails", "snooze"];
export const DAY_MS = 86400000;
export const cleanDays = (quit, now = Date.now()) => Math.max(0, Math.floor((now - (quit.since ?? now)) / DAY_MS));
export const longestClean = (quit, now = Date.now()) => Math.max(quit.longest ?? 0, cleanDays(quit, now));
// Milestones to look forward to.
export const QUIT_MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];
export const nextMilestone = (days) => QUIT_MILESTONES.find((m) => m > days) ?? null;

// After a slip you may take a redemption quest. It's optional: it goes on your board as a guild quest.
export const REDEMPTION_QUESTS = ["g:walk", "g:coldshower", "g:journal", "g:meditation"];

// ---- Sleep ----
// sleepLog = { "<wake date>": [bedHour, wakeHour, quality] } with hours as decimals (23.5 = 23:30, 0.5 = 00:30)
// and quality 1–5 (how well you slept; may be missing on old nights).
// Bedtimes are compared on an evening scale (after midnight counts as 24+), so averages work across midnight.
const evening = (h) => (h < 12 ? h + 24 : h);
export const SLEEP_KEEP_DAYS = 35;
export const hhmm = (h) => { const m = Math.round(h * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
export function sleepNights(log = {}, n = 14) {
  return Object.entries(log).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-n)
    .map(([date, [bed, wake, quality]]) => ({ date, bed: evening(bed), wake, quality: quality ?? null, hours: Math.round((wake + 24 - evening(bed)) * 10) / 10 }));
}
export function sleepSummary(log, profile) {
  const nights = sleepNights(log, 7);
  if (!nights.length) return null;
  const avg = (k) => nights.reduce((s, x) => s + x[k], 0) / nights.length;
  const { wake, bed } = dayTimes(profile);
  const avgBed = avg("bed");
  const rated = nights.filter((x) => x.quality);
  const quality = rated.length ? Math.round((rated.reduce((a, x) => a + x.quality, 0) / rated.length) * 10) / 10 : null;
  return { quality, nights: nights.length, hours: Math.round(avg("hours") * 10) / 10, bed: avgBed, wake: avg("wake"), lateBy: Math.round((avgBed - bed) * 60), targetBed: bed, targetWake: wake };
}

// ---- Screen time ----
// screenLog = { "<date>": minutes }, typed in from the iPhone's Screen Time (it can't leave the phone otherwise).
export function screenDays(log = {}, n = 14) {
  return Object.entries(log).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-n).map(([date, minutes]) => ({ date, minutes }));
}

// Old keys to delete so a log keeps only its last `keep` days.
export function staleKeys(log = {}, keep, today = todayKey()) {
  const cut = dayNum(today) - keep;
  return Object.keys(log).filter((d) => dayNum(d) < cut);
}
