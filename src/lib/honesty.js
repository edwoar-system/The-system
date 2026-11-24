// The check-in after an important quest: how it went and whether you cheated.
// Saying yes costs nothing; it's counted so Settings can show you your own record.
import { doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const HOW = ["rough", "ok", "good", "great"];
export const CHEAT = ["no", "bit", "yes"];

export async function checkIn(uid, logId, { how, cheat }) {
  const player = doc(db, "players", uid);
  const log = doc(db, "players", uid, "log", logId);
  return runTransaction(db, async (tx) => {
    tx.set(log, { how: how ?? null, cheat: cheat ?? null }, { merge: true });
    tx.set(player, {
      honesty: { checked: increment(1), ...(cheat && cheat !== "no" ? { cheated: increment(1) } : {}) },
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}
