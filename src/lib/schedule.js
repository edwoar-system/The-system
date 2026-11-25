// Your schedule in Firestore: the usual week, and today's changes (skip a block, add a one-off).
import { deleteField, doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { todayKey } from "../game/quests";

const ref = (uid) => doc(db, "players", uid);

export function saveSchedule(uid, blocks) {
  return updateDoc(ref(uid), { schedule: blocks, updatedAt: serverTimestamp() });
}

function changeToday(uid, fn) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const date = todayKey();
    const cur = p.scheduleDay?.date === date ? p.scheduleDay : { date, skip: [], extra: [], edits: {}, gaps: [] };
    // Written whole (not merged), so yesterday's edits and gaps don't linger.
    tx.update(ref(uid), { scheduleDay: fn({ skip: [], extra: [], edits: {}, gaps: [], ...cur, date }), updatedAt: serverTimestamp() });
  });
}

export const skipToday = (uid, id, skip) => changeToday(uid, (d) => ({ ...d, skip: skip ? [...new Set([...d.skip, id])] : d.skip.filter((x) => x !== id) }));
export const addToday = (uid, block) => changeToday(uid, (d) => ({ ...d, extra: [...d.extra, { ...block, id: `x${Date.now().toString(36)}` }] }));
export const removeToday = (uid, id) => changeToday(uid, (d) => ({ ...d, extra: d.extra.filter((b) => b.id !== id) }));
// Today only: a block ended earlier or started later, a free hour in the middle, or undo all of that.
export const editToday = (uid, id, patch) => changeToday(uid, (d) => ({ ...d, edits: { ...d.edits, [id]: { ...(d.edits?.[id] ?? {}), ...patch } } }));
export const resetToday = (uid, id) => changeToday(uid, (d) => {
  const edits = { ...d.edits };
  delete edits[id];
  return { ...d, edits, skip: d.skip.filter((x) => x !== id), gaps: d.gaps.filter((g) => g.of !== id) };
});
export const addGap = (uid, of, start, end) => changeToday(uid, (d) => ({ ...d, gaps: [...d.gaps, { id: `g${Date.now().toString(36)}`, of, start, end }] }));
export const removeGap = (uid, id) => changeToday(uid, (d) => ({ ...d, gaps: d.gaps.filter((g) => g.id !== id) }));
export const clearOldDay = (uid) => updateDoc(ref(uid), { scheduleDay: deleteField() });
