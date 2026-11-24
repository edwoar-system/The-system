// Skill progress: ranks, the I–IV progress bar, rust, habit ranks and streaks. Pure functions only.
// Rules: "The System — Skill database v0.2" (Trials, rust and proof v0.3; Habit ladder).
import { RANKS, ladderById } from "./ladders";
import { todayKey } from "./quests";

export const SKILL_RULES = {
  rustPhysicalDays: 10, // STR, AGI and VIT skills start to rust after 10 days without training
  rustKnowledgeDays: 21, // INT, WIL and CHA skills after 3 weeks
  rankDropDays: 60, // the rank drops one step after 2 months; one retest restores it
  drainPerDay: 0.05, // a rusting bar loses 5% of the rank band per day
  habitMaxRank: 5, // habit skills cap at A
  keepDays: 400, // training days kept per skill (enough for the 365-day habit window)
  rankUpXp: 25, // EXP for a rank-up, times the new rank's number (E = 1 … S+ = 7)
};

// Sessions in a rank before its bar is full ("ready for the trial"). Short at the bottom, so the next step is always close.
const SESSIONS = [5, 12, 25, 40, 60, 90, 120, 150];

// Habit rungs: [count needed, window length]. Daily habits count days, weekly habits count weeks.
const HABIT_RUNGS = {
  daily: [[1, 1], [5, 7], [24, 30], [72, 90], [150, 180], [300, 365]],
  weekly: [[1, 1], [3, 4], [10, 13], [20, 26], [42, 52], [84, 104]],
};

const PHYSICAL = ["STR", "AGI", "VIT"];

// Day number since 1970 in local time, from a "YYYY-MM-DD" key.
export function dayNum(key = todayKey()) {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
const weekNum = (n) => Math.floor((n + 3) / 7); // weeks start on Monday

export const isHabit = (ladder) => ladder?.basis === "habit";
export const maxRank = (ladder) => (isHabit(ladder) ? SKILL_RULES.habitMaxRank : RANKS.length - 1);

// Achievements needed for rank r: every trial at r and below that isn't ticked yet.
export function trialItems(ladder, r) {
  const items = [];
  RANKS.forEach((letter, i) => {
    if (i > r || i === 0) return;
    const text = ladder.trials?.[letter];
    if (!text) return;
    text.split(/;\s*/).forEach((part, k) => items.push({ key: `${letter}.${k}`, rank: i, text: part.replace(/\.$/, "") }));
  });
  return items;
}

function habitCount(days, freq, window, today) {
  if (freq === "weekly") {
    const w = weekNum(today);
    return new Set(days.filter((d) => weekNum(d) > w - window).map(weekNum)).size;
  }
  return days.filter((d) => d > today - window).length;
}

// The highest habit rank the days support (trials not included).
export function habitRungRank(entry, ladder, today = dayNum()) {
  const days = entry?.days ?? [];
  const rungs = HABIT_RUNGS[ladder.freq ?? "daily"];
  let r = -1;
  rungs.forEach(([need, window], i) => { if (habitCount(days, ladder.freq, window, today) >= need) r = i; });
  return r;
}

// Habit rank = highest rung met whose trials (at that rank and below) are all ticked.
export function habitRank(entry, ladder, today = dayNum()) {
  const rung = habitRungRank(entry, ladder, today);
  let r = 0;
  for (let i = 1; i <= rung; i++) {
    if (trialItems(ladder, i).every((it) => entry?.ticks?.[it.key])) r = i;
    else break;
  }
  return Math.max(r, entry?.rank ?? 0);
}

function streakOf(days, freq, today) {
  if (!days.length) return 0;
  if (freq === "weekly") {
    const weeks = new Set(days.map(weekNum));
    let w = weekNum(today);
    if (!weeks.has(w)) w -= 1;
    let n = 0;
    while (weeks.has(w)) { n++; w--; }
    return n;
  }
  const set = new Set(days);
  let d = set.has(today) ? today : today - 1;
  let n = 0;
  while (set.has(d)) { n++; d--; }
  return n;
}

// Everything the Skills screens show about one skill.
export function skillView(id, entry = {}, today = dayNum()) {
  const ladder = ladderById[id];
  const days = entry.days ?? [];
  const last = days.length ? days[days.length - 1] : null;
  const since = last == null ? null : today - last;
  const rustAfter = PHYSICAL.includes(ladder.stat) ? SKILL_RULES.rustPhysicalDays : SKILL_RULES.rustKnowledgeDays;
  const earned = isHabit(ladder) ? habitRank(entry, ladder, today) : entry.rank ?? 0;
  const rusty = earned > 0 && (entry.rusty || (since != null && since > SKILL_RULES.rankDropDays));
  const rank = rusty ? earned - 1 : earned;
  const hours = (entry.minutes ?? 0) / 60;

  // Progress bar: habits fill toward the next rung; other skills fill with sessions trained in the current rank.
  let bar;
  let next = null;
  if (isHabit(ladder)) {
    const rungs = HABIT_RUNGS[ladder.freq ?? "daily"];
    const target = rungs[Math.min(rank + 1, rungs.length - 1)];
    next = { count: habitCount(days, ladder.freq, target[1], today), need: target[0], window: target[1] };
    bar = rank >= maxRank(ladder) ? 1 : Math.min(1, next.count / next.need);
  } else {
    const inRank = (entry.sessions ?? 0) - (entry.sessionsAtRank ?? 0);
    next = { count: inRank, need: SESSIONS[rank] };
    bar = Math.min(1, inRank / SESSIONS[rank]);
  }
  const rustDays = since == null ? 0 : Math.max(0, since - rustAfter);
  const draining = rustDays > 0;
  if (draining) bar = Math.max(0, bar - rustDays * SKILL_RULES.drainPerDay);

  // Minutes per day for the last 14 days (oldest first).
  const recent = entry.recent ?? {};
  const last14 = Array.from({ length: 14 }, (_, i) => recent[today - 13 + i] ?? 0);

  return {
    id, ladder, rank, earned, rusty, letter: RANKS[rank], max: maxRank(ladder),
    trained: days.length > 0, since, hours, minutes: entry.minutes ?? 0, sessions: entry.sessions ?? 0,
    bar, step: Math.min(4, Math.floor(bar * 4) + 1), next,
    rustIn: since == null ? null : rustAfter - since, draining,
    streak: streakOf(days, ladder.freq, today), last14,
    ticks: entry.ticks ?? {},
  };
}

// A finished quest in this skill: adds minutes and today's training day.
export function recordTraining(entry = {}, minutes, today = dayNum()) {
  const days = [...(entry.days ?? [])];
  const lastDay = days.length ? days[days.length - 1] : null;
  const rusty = entry.rusty || (lastDay != null && today - lastDay > SKILL_RULES.rankDropDays && (entry.rank ?? 0) > 0);
  if (lastDay !== today) days.push(today);
  const recent = Object.fromEntries(Object.entries(entry.recent ?? {}).filter(([d]) => Number(d) > today - 14));
  recent[today] = (recent[today] ?? 0) + minutes;
  return {
    ...entry,
    rank: entry.rank ?? 0,
    minutes: (entry.minutes ?? 0) + minutes,
    sessions: (entry.sessions ?? 0) + 1,
    days: days.slice(-SKILL_RULES.keepDays),
    recent,
    ...(rusty ? { rusty: true } : {}),
  };
}

// A rank trial: the main test for rank r plus every open achievement up to r, all confirmed.
// Returns the new entry and the rank gained (0 if none). r may skip ranks (placement).
export function passTrial(entry = {}, ladder, r) {
  const ticks = { ...(entry.ticks ?? {}) };
  trialItems(ladder, r).forEach((it) => { ticks[it.key] = true; });
  const before = entry.rank ?? 0;
  const rank = Math.min(maxRank(ladder), Math.max(before, r));
  const out = { ...entry, ticks, rank, tested: { ...(entry.tested ?? {}), [RANKS[r]]: todayKey() } };
  if (rank > before) out.sessionsAtRank = entry.sessions ?? 0;
  delete out.rusty;
  return { entry: out, gained: rank - before };
}

// One achievement ticked on its own (habit skills tick them as they go).
export function tickAchievement(entry = {}, key, on = true) {
  return { ...entry, ticks: { ...(entry.ticks ?? {}), [key]: on } };
}

export const rankLetter = (player, id) => (ladderById[id] ? skillView(id, player?.skills?.[id]).letter : "F");
