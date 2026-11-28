// "I did something": log what you actually did, even without a quest. Three levels, so 5 minutes of playing
// around on your hands and an hour to your limit both count, just not the same. Pure rules; the sheet is
// components/DidIt.js and the write is completeQuest(…, "did") in lib/day.js.
import { skillById } from "./guild";
import { goalSkills } from "./goals";
import { interestSkills } from "./profile";

// play: no minimum, keeps the skill fresh (no rank session). train: a real session. push: to your limit.
export const DID_LEVELS = {
  play: { difficulty: "easy", minutes: [5, 10, 20], def: 5, session: false },
  train: { difficulty: "normal", minutes: [15, 30, 45, 60], def: 30, session: true },
  push: { difficulty: "hard", minutes: [10, 20, 30, 60, 90], def: 30, session: true },
};
export const DID_ORDER = ["play", "train", "push"];

export const didId = (skill, level, minutes) => `did:${skill}:${level}:${minutes}`;
export function didQuest(id) {
  const [, skill, level, m] = String(id).split(":");
  const s = skillById[skill];
  const L = DID_LEVELS[level];
  const minutes = Math.max(1, Math.min(240, Number(m) || 0));
  if (!s || !L || !minutes) return null;
  return { id, skill, stat: s.stat, type: s.type ?? skill, difficulty: L.difficulty, minutes, did: level, title: s.name, how: "", own: true };
}

// The skills to offer first: goal skills, then the ones you ticked, most recently done first.
export function didSkills(player) {
  const goal = goalSkills(player?.profile);
  const liked = interestSkills(player?.profile);
  const last = player?.lastDoneBySkill ?? {};
  const all = [...new Set([...goal, ...liked])].filter((id) => skillById[id]);
  return all.sort((a, b) => (goal.has(b) - goal.has(a)) || String(last[b] ?? "").localeCompare(String(last[a] ?? "")));
}

// An open quest on today's board for this skill: logging a real session there ticks that quest instead.
export function openQuestFor(day, skill, getQuest) {
  const slots = [
    ...(day?.mains ?? []).map((x) => [x, "main"]),
    ...(day?.guild ?? []).map((x) => [x, "guild"]),
    ...(day?.side ? [[day.side, "side"]] : []),
  ];
  for (const [x, slot] of slots) {
    if (x.done) continue;
    const q = getQuest(x.id);
    if (q?.skill === skill) return { id: x.id, slot, title: q.title };
  }
  return null;
}
