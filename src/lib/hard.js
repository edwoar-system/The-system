// Hard mode in Firestore: lock in for some days; leaving early costs coins or a streak shield.
import { collection, deleteField, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { hardExitPrice, isHard } from "../game/hard";
import { todayKey } from "../game/quests";

const DAY = 86400000;

export async function startHard(uid, days) {
  const ref = doc(db, "players", uid);
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref)).data() ?? {};
    if (isHard(p)) throw new Error("already-hard");
    const now = Date.now();
    tx.set(ref, { hard: { since: now, until: now + days * DAY, days }, updatedAt: serverTimestamp() }, { merge: true });
  });
}

// how: "coins" | "shield". Written in the quest log, so leaving early is on the record.
export async function leaveHard(uid, how, title) {
  const ref = doc(db, "players", uid);
  const logRef = doc(collection(db, "players", uid, "log"));
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref)).data() ?? {};
    if (!isHard(p)) return { cost: 0 };
    if (how === "shield") {
      if ((p.shields ?? 0) < 1) throw new Error("no-shield");
      tx.set(ref, { hard: deleteField(), shields: p.shields - 1, updatedAt: serverTimestamp() }, { merge: true });
      tx.set(logRef, { questId: "shop:hard-exit", title, coins: 0, slot: "shop", date: todayKey(), at: serverTimestamp() });
      return { cost: 0 };
    }
    const cost = hardExitPrice(p);
    if ((p.coins ?? 0) < cost) throw new Error("no-coins");
    tx.set(ref, { hard: deleteField(), coins: p.coins - cost, coinsSpent: (p.coinsSpent ?? 0) + cost, updatedAt: serverTimestamp() }, { merge: true });
    tx.set(logRef, { questId: "shop:hard-exit", title, coins: -cost, slot: "shop", date: todayKey(), at: serverTimestamp() });
    return { cost };
  });
}
