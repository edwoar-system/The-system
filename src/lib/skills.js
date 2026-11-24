// Skill actions that write to the player document: starting and stopping a rank trial.
// The trial parts themselves are finished as quests (completeQuest with slot "trial").
import { deleteField, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { ladderById } from "../game/ladders";
import { skillView } from "../game/skills";

// Starts the trial for rank r: the next rank, a higher one (placement) or, when rusty, a retest of your rank.
export async function startTrial(uid, skillId, r) {
  const ladder = ladderById[skillId];
  const ref = doc(db, "players", uid);
  return runTransaction(db, async (tx) => {
    const player = (await tx.get(ref)).data() ?? {};
    const v = skillView(skillId, player.skills?.[skillId]);
    const ok = (v.rusty && r === v.earned) || (r > v.rank && r <= v.max);
    if (!ladder || !ok) throw new Error("bad-trial");
    tx.set(ref, { trials: { [skillId]: { rank: r, started: null, done: {} } }, updatedAt: serverTimestamp() }, { merge: true });
  });
}

export async function stopTrial(uid, skillId) {
  const ref = doc(db, "players", uid);
  return runTransaction(db, async (tx) => {
    tx.set(ref, { trials: { [skillId]: deleteField() }, updatedAt: serverTimestamp() }, { merge: true });
  });
}
