// Quick logs: one tap for a small thing you just did (a set of push-ups, a glass of water, a focus block).
// Each tap counts toward the skill and muscles right away, gives a little EXP, and adds up toward the
// matching main quest. When the total reaches the quest's goal, the quest finishes by itself.
import { todayKey } from "./quests";

// minutes: what one tap counts as for the skill. goal: taps that finish the matching quest (counted in goalUnit).
export const QUICK = [
  { id: "water", goalUnit: "glasses", label: "Glass of water", unit: "250 ml", skill: "water", minutes: 0.5, quest: "water", goal: 10, allDay: true },
  { id: "pushups", goalUnit: "sets", label: "Set of push-ups", unit: "set", skill: "pushups", minutes: 4, quest: "pushups", goal: 5 },
  { id: "pullups", goalUnit: "sets", label: "Set of pull-ups", unit: "set", skill: "pullups", minutes: 4, quest: "pullups", goal: 5 },
  { id: "study", goalUnit: "blocks", label: "Focus block", unit: "25 min", skill: "study", minutes: 25, quest: ["study25", "study45"], goal: { study25: 1, study45: 2 } },
  { id: "walk", goalUnit: "× 10 min", label: "Walk", unit: "10 min", skill: "walk", minutes: 10, quest: "walk", goal: 3 },
  { id: "stretch", goalUnit: "× 5 min", label: "Stretch", unit: "5 min", skill: "stretch", minutes: 5, quest: "mobility", goal: 3 },
  { id: "meditate", goalUnit: "× 5 min", label: "Meditate", unit: "5 min", skill: "meditation", minutes: 5, quest: "meditate", goal: 2 },
  { id: "japanese", goalUnit: "× 5 min", label: "Japanese", unit: "5 min", skill: "japanese", minutes: 5, quest: "japanese", goal: 3 },
  { id: "run", goalUnit: "× 10 min", label: "Run or cycle", unit: "10 min", skill: "running", minutes: 10, quest: "run", goal: 3 },
  { id: "kindness", goalUnit: "done", label: "Kind act", unit: "one", skill: "kindness", minutes: 10, quest: "kindness", goal: 1 },
  { id: "call", goalUnit: "done", label: "Called someone", unit: "call or meet", skill: "reachout", minutes: 20, quest: "callsomeone", goal: 1 },
  { id: "journal", goalUnit: "done", label: "Journal", unit: "3 lines", skill: "journal", minutes: 10, quest: "journal", goal: 1 },
];
export const quickById = Object.fromEntries(QUICK.map((q) => [q.id, q]));
export const QUICK_XP_PER_MINUTE = 0.5; // a little EXP per tap; coins come when the quest finishes

const questsOf = (item) => (Array.isArray(item.quest) ? item.quest : [item.quest]);
export const goalFor = (item, questId) => (typeof item.goal === "number" ? item.goal : item.goal[questId]);

// Today's tap counts: { itemId: n }.
export const quickToday = (player) => (player?.quick?.date === todayKey() ? player.quick.counts ?? {} : {});

// Guild quests for the same skill count too ("g:pushups", "g:pushups:2").
const isGuildOf = (item, id) => id === `g:${item.skill}` || id.startsWith(`g:${item.skill}:`);
// Sets per guild tier (tier 0, I, II), matching the quest text. Tier 0 follows your difficulty (4–7 sets).
const SET_GOALS = { pushups: [3, 5, 4], pullups: [3, 4, 4] };
function goalOf(item, id, sets) {
  if (!isGuildOf(item, id)) return item.goalUnit === "sets" && sets ? sets : goalFor(item, id);
  const tier = Number(id.split(":")[2] ?? 0);
  if (tier === 0 && sets) return sets;
  return SET_GOALS[item.id]?.[tier] ?? (typeof item.goal === "number" ? item.goal : 1);
}

// The open main quest this item counts toward today, if any. sets: your difficulty's set count (DIFF_SETS).
export function quickTarget(item, day, sets = null) {
  // A harder guild tier (a 75-minute run) isn't finished by a few short taps; only set-based tiers count sets.
  const tierOk = (id) => item.goalUnit === "sets" || Number(id.split(":")[2] ?? 0) === 0;
  const open = day?.mains?.find((m) => !m.done && (questsOf(item).includes(m.id) || (isGuildOf(item, m.id) && tierOk(m.id))));
  return open ? { questId: open.id, goal: goalOf(item, open.id, sets) } : null;
}

// Set-based quests (push-ups, pull-ups): the quick item that logs one set, or null.
export const setItemFor = (q) => (q && !q.trial ? QUICK.find((it) => it.goalUnit === "sets" && it.skill === q.skill) ?? null : null);

// Reps of each set logged today: { itemId: [12, 10, ...] }.
export const quickReps = (player) => (player?.quick?.date === todayKey() ? player.quick.reps ?? {} : {});

export const QUICK_DEFAULT = ["water", "pushups", "study"];
export const QUICK_MAX = 8;

// Which buttons to show: items for today's open main quests first, then the ones you pinned
// (water, push-ups and a focus block until you pick your own).
export function quickBar(day, pins = null) {
  const forMains = QUICK.filter((it) => quickTarget(it, day));
  const rest = (pins?.length ? pins : QUICK_DEFAULT).map((id) => quickById[id]).filter((it) => it && !forMains.includes(it));
  return [...forMains, ...rest].slice(0, QUICK_MAX);
}
