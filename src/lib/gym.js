// Gym split and gym sessions in Firestore.
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { completeQuest } from "./day";
import { dayMuscles, exerciseById } from "../game/gym";

// Saves the whole split (template, days, gym days, log mode). The position in the cycle is kept.
export function saveSplit(uid, gym) {
  return updateDoc(doc(db, "players", uid), { gym, updatedAt: serverTimestamp() });
}
export function clearSplit(uid) {
  return updateDoc(doc(db, "players", uid), { gym: null, updatedAt: serverTimestamp() });
}

// A set's weight: the best (heaviest) set of an exercise this session.
const topSet = (sets) => sets.reduce((b, s) => (!b || (s.w ?? 0) > (b.w ?? 0) || ((s.w ?? 0) === (b.w ?? 0) && s.r > b.r) ? s : b), null);

// Finishes a session: completes the gym quest with the muscles of the sets you actually did, then saves
// the sets as "last time" (to pre-fill next time), your bests and the details in the quest log.
// session: { questId, slot, exercises: [{ id, sets: [{ w, r }] }] } (only finished sets).
export async function finishGym(uid, player, session) {
  const done = session.exercises.filter((e) => e.sets.length);
  const muscles = dayMuscles(done.map((e) => ({ id: e.id, sets: e.sets.length })));
  // About 2.5 minutes per finished set (warm-up included), at least 10.
  const minutes = Math.max(10, Math.round(done.reduce((n, e) => n + e.sets.length, 0) * 2.5));
  const r = await completeQuest(uid, session.questId, session.slot, null, { gym: { muscles, minutes } });
  const last = {};
  const best = {};
  const prs = [];
  done.forEach((e) => {
    last[e.id] = e.sets.map((s) => ({ w: s.w ?? 0, r: s.r ?? 0 }));
    const top = topSet(e.sets);
    const old = player.gymBest?.[e.id];
    if (top && (!old || (top.w ?? 0) > (old.w ?? 0) || ((top.w ?? 0) === (old.w ?? 0) && top.r > old.r))) {
      best[e.id] = { w: top.w ?? 0, r: top.r };
      if (old) prs.push({ id: e.id, name: exerciseById[e.id]?.name ?? e.id, w: top.w ?? 0, r: top.r });
    }
  });
  await setDoc(doc(db, "players", uid), { gymLast: last, ...(Object.keys(best).length ? { gymBest: best } : {}), updatedAt: serverTimestamp() }, { merge: true });
  if (r.logId) {
    setDoc(doc(db, "players", uid, "log", r.logId), { gym: done.map((e) => ({ id: e.id, sets: e.sets })) }, { merge: true }).catch(() => {});
  }
  return { ...r, prs };
}
