// Programs in Firestore: start, stop, and make your own.
import { deleteField, doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MAX_PROGRAMS } from "../game/programs";
import { todayKey } from "../game/quests";

const ref = (uid) => doc(db, "players", uid);

// Put a session on today's program list right away (when you ask for it; otherwise it starts tomorrow).
function withSession(p, id, done) {
  const today = todayKey();
  if (p.day?.date !== today) return {};
  const qid = `p:${id}:${done}`;
  const list = p.day.programs ?? [];
  if (list.some((m) => m.id.startsWith(`p:${id}:`)) || (p.day.mains ?? []).some((m) => m.id.startsWith(`p:${id}:`))) return {};
  return { day: { programs: [...list, { id: qid, done: false }] } };
}

export async function startProgram(uid, id, today = false) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const active = Object.entries(p.programs ?? {}).filter(([, st]) => !st.paused).length;
    if (!p.programs?.[id] && active >= MAX_PROGRAMS) throw new Error("max");
    const done = p.programs?.[id]?.done ?? 0;
    // The first session comes on tomorrow's board (today is already planned); "start today" adds it now.
    tx.set(ref(uid), { programs: { [id]: { started: todayKey(), done } }, ...(today ? withSession(p, id, done) : {}), updatedAt: serverTimestamp() }, { merge: true });
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
      ...(active < MAX_PROGRAMS ? { programs: { [id]: { started: todayKey(), done: 0 } } } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return id;
  });
}
