// Skill actions that write to the player document: rank trials, achievements, retests.
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { ladderById } from "../game/ladders";
import { habitRank, isHabit, passTrial, SKILL_RULES, skillView, tickAchievement } from "../game/skills";
import { levelFromXp } from "../game/economy";

function rankXp(from, to) {
  let xp = 0;
  for (let r = from + 1; r <= to; r++) xp += SKILL_RULES.rankUpXp * r;
  return xp;
}

// Passes the rank trial for rank r (everything confirmed). Each rank pays EXP once, the first time it is reached.
export async function takeTrial(uid, skillId, r) {
  const ladder = ladderById[skillId];
  const ref = doc(db, "players", uid);
  return runTransaction(db, async (tx) => {
    const player = (await tx.get(ref)).data() ?? {};
    const old = player.skills?.[skillId] ?? {};
    const { entry } = passTrial(old, ladder, r);
    if (isHabit(ladder)) entry.rank = habitRank(entry, ladder);
    const best = player.skillBest?.[skillId] ?? old.rank ?? 0;
    const xp = rankXp(best, entry.rank);
    const totalXp = (player.xp ?? 0) + xp;
    const before = levelFromXp(player.xp ?? 0).level;
    const after = levelFromXp(totalXp).level;
    tx.set(ref, {
      skills: { ...(player.skills ?? {}), [skillId]: entry },
      skillBest: { ...(player.skillBest ?? {}), [skillId]: Math.max(best, entry.rank) },
      xp: totalXp,
      level: after,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { rank: entry.rank, gained: entry.rank - (old.rank ?? 0), xp, levelUp: after > before ? after : null };
  });
}

// Ticks (or unticks) one achievement. For habit skills this can raise the rank right away.
export async function setAchievement(uid, skillId, key, on) {
  const ladder = ladderById[skillId];
  const ref = doc(db, "players", uid);
  return runTransaction(db, async (tx) => {
    const player = (await tx.get(ref)).data() ?? {};
    let entry = tickAchievement(player.skills?.[skillId], key, on);
    const before = skillView(skillId, player.skills?.[skillId]).earned;
    if (isHabit(ladder)) entry = { ...entry, rank: habitRank(entry, ladder) };
    tx.set(ref, { skills: { ...(player.skills ?? {}), [skillId]: entry }, updatedAt: serverTimestamp() }, { merge: true });
    return { rank: entry.rank ?? 0, gained: (entry.rank ?? 0) - before };
  });
}
