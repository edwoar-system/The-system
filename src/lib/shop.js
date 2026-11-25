// Buying app time: coins go down, the session starts (or gets longer), and it's written in your quest log.
import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { activeAppTime, priceFor, refundFor, usedToday } from "../game/shop";
import { todayKey } from "../game/quests";

export async function buyAppTime(uid, kind, minutes, title) {
  const ref = doc(db, "players", uid);
  const logRef = doc(collection(db, "players", uid, "log"));
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref)).data() ?? {};
    const today = todayKey();
    const now = Date.now();
    const cur = activeAppTime(p, now);
    if (cur && cur.kind !== kind) throw new Error("other-kind");
    const used = usedToday(p, kind, today);
    const cost = priceFor(kind, minutes, used);
    if ((p.coins ?? 0) < cost) throw new Error("no-coins");
    const appTime = cur
      ? { ...cur, end: cur.end + minutes * 60000, minutes: (cur.minutes ?? 0) + minutes, paid: (cur.paid ?? 0) + cost }
      : { kind, start: now, end: now + minutes * 60000, minutes, paid: cost };
    const appUse = { date: today, used: { ...(p.appUse?.date === today ? p.appUse.used : {}), [kind]: used + minutes } };
    tx.set(ref, { coins: (p.coins ?? 0) - cost, appTime, appUse, coinsSpent: (p.coinsSpent ?? 0) + cost, updatedAt: serverTimestamp() }, { merge: true });
    tx.set(logRef, { questId: `shop:${kind}:${minutes}`, title, coins: -cost, slot: "shop", date: today, at: serverTimestamp() });
    return { cost, appTime };
  });
}

// Ending early: the unused minutes come off today's use and half their cost comes back.
export async function endAppTime(uid, title) {
  const ref = doc(db, "players", uid);
  const logRef = doc(collection(db, "players", uid, "log"));
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref)).data() ?? {};
    const cur = activeAppTime(p);
    if (!cur) return { coins: 0 };
    const back = refundFor(cur);
    const today = todayKey();
    const used = usedToday(p, cur.kind, today);
    tx.set(ref, {
      coins: (p.coins ?? 0) + back.coins,
      appTime: { ...cur, end: Date.now() },
      appUse: { date: today, used: { ...(p.appUse?.date === today ? p.appUse.used : {}), [cur.kind]: Math.max(0, used - back.minutes) } },
      updatedAt: serverTimestamp(),
    }, { merge: true });
    if (back.coins) tx.set(logRef, { questId: "shop:refund", title, coins: back.coins, slot: "shop", date: today, at: serverTimestamp() });
    return back;
  });
}
