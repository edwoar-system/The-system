// Friends in Firestore.
//   codes/{code}                    -> { uid, name }        find someone by their friend code
//   public/{uid}                    -> your public card     only you and your friends can read it
//   public/{uid}/requests/{fromUid} -> a friend request to you
//   public/{uid}/friends/{friendUid}-> one friend (both sides get a doc when a request is accepted)
import { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { cardSignature, cleanCode, friendCode, publicCard } from "../game/social";
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
