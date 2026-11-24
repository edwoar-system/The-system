// Quick logs: one tap for a small thing you just did (a set of push-ups, a glass of water, a focus block).
// Each tap counts toward the skill and muscles right away, gives a little EXP, and adds up toward the
// matching main quest. When the total reaches the quest's goal, the quest finishes by itself.
import { todayKey } from "./quests";

// minutes: what one tap counts as for the skill. goal: taps that finish the matching quest (counted in goalUnit).
export const QUICK = [
  { id: "water", goalUnit: "glasses", label: "Glass of water", unit: "250 ml", skill: "water", minutes: 0.5, quest: "water", goal: 10 },
  { id: "pushups", goalUnit: "sets", label: "Set of push-ups", unit: "set", skill: "pushups", minutes: 4, quest: "pushups", goal: 5 },
  { id: "pullups", goalUnit: "sets", label: "Set of pull-ups", unit: "set", skill: "pullups", minutes: 4, quest: "pullups", goal: 5 },
  { id: "study", goalUnit: "blocks", label: "Focus block", unit: "25 min", skill: "study", minutes: 25, quest: ["study25", "study45"], goal: { study25: 1, study45: 2 } },
  { id: "walk", goalUnit: "× 10 min", label: "Walk", unit: "10 min", skill: "walk", minutes: 10, quest: "walk", goal: 3 },
  { id: "stretch", goalUnit: "× 5 min", label: "Stretch", unit: "5 min", skill: "stretch", minutes: 5, quest: "mobility", goal: 3 },
  { id: "meditate", goalUnit: "× 5 min", label: "Meditate", unit: "5 min", skill: "meditation", minutes: 5, quest: "meditate", goal: 2 },
  { id: "japanese", goalUnit: "× 5 min", label: "Japanese", unit: "5 min", skill: "japanese", minutes: 5, quest: "japanese", goal: 3 },
];
export const quickById = Object.fromEntries(QUICK.map((q) => [q.id, q]));
export const QUICK_XP_PER_MINUTE = 0.5; // a little EXP per tap; coins come when the quest finishes

const questsOf = (item) => (Array.isArray(item.quest) ? item.quest : [item.quest]);
export const goalFor = (item, questId) => (typeof item.goal === "number" ? item.goal : item.goal[questId]);

// Today's tap counts: { itemId: n }.
export const quickToday = (player) => (player?.quick?.date === todayKey() ? player.quick.counts ?? {} : {});

// The open main quest this item counts toward today, if any.
export function quickTarget(item, day) {
  const open = day?.mains?.find((m) => !m.done && questsOf(item).includes(m.id));
  return open ? { questId: open.id, goal: goalFor(item, open.id) } : null;
}

// Which buttons to show: items for today's open main quests first, then water, push-ups and a focus block.
export function quickBar(day) {
  const forMains = QUICK.filter((it) => quickTarget(it, day));
  const rest = ["water", "pushups", "study"].map((id) => quickById[id]).filter((it) => !forMains.includes(it));
  return [...forMains, ...rest].slice(0, 5);
}
