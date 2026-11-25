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
    const cur = p.scheduleDay?.date === date ? p.scheduleDay : { date, skip: [], extra: [] };
    tx.set(ref(uid), { scheduleDay: fn({ skip: [], extra: [], ...cur, date }), updatedAt: serverTimestamp() }, { merge: true });
  });
}

export const skipToday = (uid, id, skip) => changeToday(uid, (d) => ({ ...d, skip: skip ? [...new Set([...d.skip, id])] : d.skip.filter((x) => x !== id) }));
export const addToday = (uid, block) => changeToday(uid, (d) => ({ ...d, extra: [...d.extra, { ...block, id: `x${Date.now().toString(36)}` }] }));
export const removeToday = (uid, id) => changeToday(uid, (d) => ({ ...d, extra: d.extra.filter((b) => b.id !== id) }));
export const clearOldDay = (uid) => updateDoc(ref(uid), { scheduleDay: deleteField() });
