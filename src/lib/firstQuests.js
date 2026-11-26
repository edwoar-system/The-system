// First quests in Firestore: pays 5 coins for each cleared step; when all are cleared, today's real board is built.
import { doc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { newDay } from "./day";
import { FIRST_COINS, firstAllCleared, firstToPay } from "../game/firstQuests";

const ref = (uid) => doc(db, "players", uid);

// Pays what's cleared and not paid yet. Returns { paid: [ids], coins, allDone } or null.
export function claimFirst(uid) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data();
    if (!p || p.firstDone) return null;
    const ids = firstToPay(p);
    if (!ids.length) return null;
    const firstPaid = { ...(p.firstPaid ?? {}), ...Object.fromEntries(ids.map((id) => [id, true])) };
    const coins = ids.length * FIRST_COINS;
    const next = { ...p, firstPaid, coins: (p.coins ?? 0) + coins, firstDone: firstAllCleared(p) };
    // All cleared: today's board is built now, from the answers.
    tx.set(ref(uid), { firstPaid, coins: next.coins, ...(next.firstDone ? { firstDone: true, day: newDay(next, uid) } : {}), updatedAt: serverTimestamp() }, { merge: true });
    return { paid: ids, coins, allDone: next.firstDone };
  });
}

// "Not for me" on a step that allows it (busy times, maxes).
export const skipFirst = (uid, id) => setDoc(ref(uid), { firstSkip: { [id]: true }, updatedAt: serverTimestamp() }, { merge: true });
