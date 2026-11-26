// Tester tools: only for accounts with tester: true on their player doc (set by hand in the Firebase
// console, never from the app). For trying everything in the shop, and for running the new-player flow again.
import { collection, doc, getDocs, runTransaction, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { EFFECT_IDS, MAX_SHIELDS, SKIN_IDS } from "../game/shop";

export const TESTER_COINS = 999999;
export const isTester = (player) => player?.tester === true;

const ref = (uid) => doc(db, "players", uid);

// Lots of coins, every skin and name effect, a full shield.
export function testerFill(uid) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    if (!isTester(p)) throw new Error("not-tester");
    tx.set(ref(uid), { coins: TESTER_COINS, skins: SKIN_IDS, nameEffects: EFFECT_IDS, streakShields: MAX_SHIELDS, updatedAt: serverTimestamp() }, { merge: true });
  });
}

async function clear(path) {
  const snap = await getDocs(collection(db, ...path));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// Start over as a brand-new player (name and tester flag stay). Friends and your public card are left alone.
export async function testerReset(uid, player) {
  if (!isTester(player)) throw new Error("not-tester");
  for (const sub of ["log", "sent", "courses", "proof"]) await clear(["players", uid, sub]).catch(() => {});
  await setDoc(ref(uid), { name: player.name ?? null, tester: true, coins: 0, xp: 0, level: 1, createdAt: serverTimestamp() });
}
