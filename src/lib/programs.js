// Programs in Firestore: start, stop, and make your own.
import { deleteField, doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MAX_PROGRAMS } from "../game/programs";
import { todayKey } from "../game/quests";

const ref = (uid) => doc(db, "players", uid);

export async function startProgram(uid, id) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const active = Object.entries(p.programs ?? {}).filter(([, st]) => !st.paused).length;
    if (!p.programs?.[id] && active >= MAX_PROGRAMS) throw new Error("max");
    tx.set(ref(uid), { programs: { [id]: { started: todayKey(), done: p.programs?.[id]?.done ?? 0 } }, updatedAt: serverTimestamp() }, { merge: true });
  });
}

// Stopping removes it (your progress in it is gone); a finished one stays as done.
export const stopProgram = (uid, id) => updateDoc(ref(uid), { [`programs.${id}`]: deleteField(), updatedAt: serverTimestamp() });

// Your own program from the formula; it starts right away if there's room.
export async function createProgram(uid, c) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const id = `my${Date.now().toString(36)}`;
    const active = Object.entries(p.programs ?? {}).filter(([, st]) => !st.paused).length;
    const list = [...(p.customPrograms ?? []), { ...c, id }];
    tx.set(ref(uid), {
      customPrograms: list,
      ...(active < MAX_PROGRAMS ? { programs: { [id]: { started: todayKey(), done: 0 } } } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return id;
  });
}
