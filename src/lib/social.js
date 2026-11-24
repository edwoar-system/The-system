// Friends in Firestore.
//   codes/{code}                    -> { uid, name }        find someone by their friend code
//   public/{uid}                    -> your public card     only you and your friends can read it
//   public/{uid}/requests/{fromUid} -> a friend request to you
//   public/{uid}/friends/{friendUid}-> one friend (both sides get a doc when a request is accepted)
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { TROLL_LEVELS, cardSignature, cleanCode, friendCode, publicCard, trollById, trollTitle, trollXp } from "../game/social";
import { levelFromXp } from "../game/economy";
import { currentDay, currentStreak } from "./day";

let lastSig = null;
let codeFor = null; // { uid, code } once claimed this session

// Claims your friend code (a new salt if someone else already has it).
async function claimCode(uid, name) {
  if (codeFor?.uid === uid) return codeFor.code;
  for (let salt = 0; salt < 5; salt++) {
    const code = friendCode(uid, salt);
    const ref = doc(db, "codes", code);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().uid === uid) {
      if (!snap.exists() || snap.data().name !== name) await setDoc(ref, { uid, name });
      codeFor = { uid, code };
      return code;
    }
  }
  throw new Error("no-code");
}

// Keeps your public card in line with your player document (only writes when it changed).
export async function syncPublic(uid, player) {
  const name = player?.name ?? "Player";
  const code = await claimCode(uid, name);
  const day = currentDay(player, uid);
  const card = publicCard(player, {
    code,
    streak: currentStreak(player),
    mainsDone: day.mains.filter((m) => m.done).length,
    mainsOf: day.mains.length,
  });
  const sig = `${uid}:${cardSignature(card)}`;
  if (sig === lastSig) return;
  await setDoc(doc(db, "public", uid), { ...card, updatedAt: serverTimestamp() });
  lastSig = sig;
}

export async function findByCode(code) {
  const c = cleanCode(code);
  if (c.length < 6) return null;
  const snap = await getDoc(doc(db, "codes", c));
  return snap.exists() ? { uid: snap.data().uid, name: snap.data().name, code: c } : null;
}

export function sendRequest(me, myName, myCode, targetUid) {
  return setDoc(doc(db, "public", targetUid, "requests", me), { name: myName ?? "Player", code: myCode ?? null, at: serverTimestamp() });
}

// Accepting writes both friend docs and removes the request, in one go.
export function acceptRequest(me, myName, them, theirName) {
  const b = writeBatch(db);
  b.set(doc(db, "public", me, "friends", them), { name: theirName ?? "Player", since: serverTimestamp() });
  b.set(doc(db, "public", them, "friends", me), { name: myName ?? "Player", since: serverTimestamp() });
  b.delete(doc(db, "public", me, "requests", them));
  return b.commit();
}

export function declineRequest(me, them) {
  const b = writeBatch(db);
  b.delete(doc(db, "public", me, "requests", them));
  return b.commit();
}

export function removeFriend(me, them) {
  const b = writeBatch(db);
  b.delete(doc(db, "public", me, "friends", them));
  b.delete(doc(db, "public", them, "friends", me));
  return b.commit();
}

export function useRequests(uid) {
  const [list, setList] = useState(null);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(collection(db, "public", uid, "requests"),
      (snap) => setList(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))),
      () => setList([]));
  }, [uid]);
  return list;
}

// Your friends with their live public cards.
export function useFriends(uid) {
  const [ids, setIds] = useState(null);
  const [cards, setCards] = useState({});
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(collection(db, "public", uid, "friends"),
      (snap) => { setIds(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))); setError(false); },
      () => { setIds([]); setError(true); });
  }, [uid]);
  const key = (ids ?? []).map((f) => f.uid).join(",");
  useEffect(() => {
    if (!key) return;
    const subs = key.split(",").map((fid) => onSnapshot(doc(db, "public", fid),
      (snap) => setCards((c) => ({ ...c, [fid]: snap.exists() ? snap.data() : null })),
      () => setCards((c) => ({ ...c, [fid]: null }))));
    return () => subs.forEach((u) => u());
  }, [key]);
  const friends = ids?.map((f) => ({ ...f, card: cards[f.uid] })) ?? null;
  return { friends, error };
}

export async function myCode(uid, name) {
  return claimCode(uid, name);
}

// ---- Troll quests ----
// public/{friend}/trolls/{id}: a troll quest you sent (you pay its coins). players/{me}/sent/{id} keeps your own
// list, so you can follow them and get your title's coins back once they're done.

export async function sendTroll(me, myName, friendUid, friendName, trollId) {
  const x = trollById[trollId];
  const cost = TROLL_LEVELS[x.level];
  const meRef = doc(db, "players", me);
  const trollRef = doc(collection(db, "public", friendUid, "trolls"));
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(meRef)).data() ?? {};
    if ((p.coins ?? 0) < cost) throw new Error("no-coins");
    tx.set(trollRef, { from: me, fromName: myName ?? "Player", troll: trollId, cost, status: "new", atMs: Date.now(), at: serverTimestamp() });
    tx.set(doc(db, "players", me, "sent", trollRef.id), { friend: friendUid, friendName: friendName ?? "Player", troll: trollId, cost, atMs: Date.now(), settled: false });
    tx.set(meRef, { coins: (p.coins ?? 0) - cost, updatedAt: serverTimestamp() }, { merge: true });
    return { id: trollRef.id, cost };
  });
}

// Troll quests you sent to one friend (newest first), with their live status.
export function useSentTrolls(me, friendUid) {
  const [sent, setSent] = useState([]);
  const [status, setStatus] = useState({});
  useEffect(() => {
    if (!me || !friendUid) return;
    return onSnapshot(query(collection(db, "players", me, "sent"), where("friend", "==", friendUid)),
      (snap) => setSent(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.atMs - a.atMs).slice(0, 10)), () => setSent([]));
  }, [me, friendUid]);
  const key = sent.filter((x) => !x.settled).map((x) => x.id).join(",");
  useEffect(() => {
    if (!key) return;
    const subs = key.split(",").map((id) => onSnapshot(doc(db, "public", friendUid, "trolls", id),
      (snap) => setStatus((s) => ({ ...s, [id]: snap.exists() ? snap.data().status : "gone" })), () => {}));
    return () => subs.forEach((u) => u());
  }, [key, friendUid]);
  return sent.map((x) => ({ ...x, status: x.settled ? "done" : status[x.id] ?? "new" }));
}

// Troll quests sent to you that aren't done.
export function useTrolls(uid) {
  const [list, setList] = useState([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(query(collection(db, "public", uid, "trolls"), where("status", "==", "new")),
      (snap) => setList(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setList([]));
  }, [uid]);
  return list;
}

// Done: a little EXP and stat EXP, no coins. The sender sees it straight away.
export async function completeTroll(uid, troll) {
  const x = trollById[troll.troll];
  if (!x) return null;
  const xp = trollXp(x);
  const playerRef = doc(db, "players", uid);
  const trollRef = doc(db, "public", uid, "trolls", troll.id);
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(playerRef)).data() ?? {};
    const tr = await tx.get(trollRef);
    if (!tr.exists() || tr.data().status === "done") return null;
    const total = (p.xp ?? 0) + xp;
    tx.set(playerRef, { xp: total, level: levelFromXp(total).level, statXp: { ...(p.statXp ?? {}), [x.stat]: (p.statXp?.[x.stat] ?? 0) + xp }, updatedAt: serverTimestamp() }, { merge: true });
    tx.update(trollRef, { status: "done", doneAtMs: Date.now() });
    return { xp, stat: x.stat, levelUp: levelFromXp(total).level > levelFromXp(p.xp ?? 0).level ? levelFromXp(total).level : null };
  });
}

// For the sender: counts finished troll quests toward your title and pays your title's share back.
// Runs when the app opens. Returns the coins paid back (0 if none).
export async function settleTrolls(me) {
  const snap = await getDocs(query(collection(db, "players", me, "sent"), where("settled", "==", false)));
  let back = 0;
  for (const d of snap.docs) {
    const s = d.data();
    let status = null;
    try { const tr = await getDoc(doc(db, "public", s.friend, "trolls", d.id)); status = tr.exists() ? tr.data().status : "gone"; } catch { continue; }
    if (status !== "done" && status !== "gone") continue;
    back += await runTransaction(db, async (tx) => {
      const meRef = doc(db, "players", me);
      const p = (await tx.get(meRef)).data() ?? {};
      const sentRef = doc(db, "players", me, "sent", d.id);
      const cur = (await tx.get(sentRef)).data();
      if (!cur || cur.settled) return 0;
      const done = status === "done" ? (p.trollsDone ?? 0) + 1 : p.trollsDone ?? 0;
      const title = trollTitle(done);
      const coins = status === "done" && title ? Math.round(s.cost * title.back) : 0;
      tx.update(sentRef, { settled: true, result: status });
      tx.set(meRef, { trollsDone: done, coins: (p.coins ?? 0) + coins, updatedAt: serverTimestamp() }, { merge: true });
      return coins;
    });
  }
  return back;
}
