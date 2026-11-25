// Buying app time: coins go down, the session starts (or gets longer), and it's written in your quest log.
import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { activeAppTime, priceFor } from "../game/shop";
import { todayKey } from "../game/quests";

export async function buyAppTime(uid, kind, minutes, title) {
  const cost = priceFor(minutes);
  if (!cost) throw new Error("unknown-length");
  const ref = doc(db, "players", uid);
  const logRef = doc(collection(db, "players", uid, "log"));
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref)).data() ?? {};
    if ((p.coins ?? 0) < cost) throw new Error("no-coins");
    const now = Date.now();
    const cur = activeAppTime(p, now);
    const appTime = cur ? { kind: cur.kind === kind ? kind : "mixed", start: cur.start, end: cur.end + minutes * 60000 } : { kind, start: now, end: now + minutes * 60000 };
    tx.set(ref, { coins: (p.coins ?? 0) - cost, appTime, coinsSpent: (p.coinsSpent ?? 0) + cost, updatedAt: serverTimestamp() }, { merge: true });
    tx.set(logRef, { questId: `shop:${kind}:${minutes}`, title, coins: -cost, slot: "shop", date: todayKey(), at: serverTimestamp() });
    return { cost, appTime };
  });
}

// Ending early: the time is gone (no coins back).
export async function endAppTime(uid) {
  const ref = doc(db, "players", uid);
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref)).data() ?? {};
    if (!p.appTime) return;
    tx.set(ref, { appTime: { ...p.appTime, end: Date.now() }, updatedAt: serverTimestamp() }, { merge: true });
  });
}
