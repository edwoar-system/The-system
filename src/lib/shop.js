// Buying app time: coins go down, the session starts (or gets longer), and it's written in your quest log.
import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { EFFECT_PRICE, MAX_SHIELDS, NAME_CHANGE_PRICE, NAME_EFFECTS, SHIELD_PRICE, SKINS, skinPrice, activeAppTime, lateExtra, priceFor, refundFor, usedToday } from "../game/shop";
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
    const cost = priceFor(kind, minutes, used, lateExtra(p));
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

// ---- Other things to buy ----

// One transaction: check coins, pay, apply, write the log.
function purchase(uid, cost, title, apply) {
  const ref = doc(db, "players", uid);
  const logRef = doc(collection(db, "players", uid, "log"));
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref)).data() ?? {};
    const fields = apply(p);
    const price = typeof cost === "function" ? cost(p) : cost;
    if ((p.coins ?? 0) < price) throw new Error("no-coins");
    tx.set(ref, { ...fields, coins: (p.coins ?? 0) - price, coinsSpent: (p.coinsSpent ?? 0) + price, updatedAt: serverTimestamp() }, { merge: true });
    if (price) tx.set(logRef, { questId: "shop:item", title, coins: -price, slot: "shop", date: todayKey(), at: serverTimestamp() });
    return { price };
  });
}

export const buyShield = (uid, title) => purchase(uid, SHIELD_PRICE, title, (p) => {
  if ((p.streakShields ?? 0) >= MAX_SHIELDS) throw new Error("have-shield");
  return { streakShields: (p.streakShields ?? 0) + 1 };
});

// Buying a skin also puts it on. Owned skins switch for free.
export const buySkin = (uid, id, title) => purchase(uid, (p) => ((p.skins ?? []).includes(id) ? 0 : skinPrice(id)), title, (p) => {
  if (!SKINS[id]) throw new Error("unknown");
  return { skin: id, skins: [...new Set([...(p.skins ?? []), id])] };
});

export const buyEffect = (uid, id, title) => purchase(uid, (p) => ((p.nameEffects ?? []).includes(id) || id === "none" ? 0 : EFFECT_PRICE), title, (p) => {
  if (!NAME_EFFECTS[id]) throw new Error("unknown");
  return { nameEffect: id, nameEffects: [...new Set([...(p.nameEffects ?? []), id])] };
});

// Changing your name: the first change is free, after that it costs coins.
export const changeName = (uid, name, title) => purchase(uid, (p) => ((p.nameChanges ?? 0) > 0 ? NAME_CHANGE_PRICE : 0), title, (p) => {
  const n = String(name ?? "").trim().slice(0, 24);
  if (n.length < 2) throw new Error("bad-name");
  if (n === p.name) throw new Error("same-name");
  return { name: n, nameChanges: (p.nameChanges ?? 0) + 1 };
});
