// Programs in Firestore: start, stop, and make your own.
import { deleteField, doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MAX_PROGRAMS } from "../game/programs";
import { todayKey } from "../game/quests";

const ref = (uid) => doc(db, "players", uid);

// Today's board already made: put the first session on it right away, instead of waiting for tomorrow.
function withSession(p, id, done) {
  const today = todayKey();
  if (p.day?.date !== today || !Array.isArray(p.day.mains)) return {};
  const qid = `p:${id}:${done}`;
  if (p.day.mains.some((m) => m.id === qid || m.id.startsWith(`p:${id}:`))) return {};
  return { day: { mains: [...p.day.mains, { id: qid, done: false }] } };
}

export async function startProgram(uid, id) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const active = Object.entries(p.programs ?? {}).filter(([, st]) => !st.paused).length;
    if (!p.programs?.[id] && active >= MAX_PROGRAMS) throw new Error("max");
    const done = p.programs?.[id]?.done ?? 0;
    tx.set(ref(uid), { programs: { [id]: { started: todayKey(), done } }, ...withSession(p, id, done), updatedAt: serverTimestamp() }, { merge: true });
  });
}

// A program already running whose session is due but isn't on today's board (started after the board was made).
export async function addSessionToday(uid, id) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const st = p.programs?.[id];
    if (!st) return;
    const extra = withSession(p, id, st.done ?? 0);
    if (extra.day) tx.set(ref(uid), { ...extra, updatedAt: serverTimestamp() }, { merge: true });
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
      ...(active < MAX_PROGRAMS ? { programs: { [id]: { started: todayKey(), done: 0 } }, ...withSession(p, id, 0) } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return id;
  });
}
