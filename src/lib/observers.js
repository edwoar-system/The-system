// Observers: your friends watching you, known only by their title (like a Constellation's modifier).
//   public/{uid}/events/{id} -> { kind: "watch" | "sponsor", from, title, amount?, atMs, seen }
// Opening a friend's profile leaves a "watch" (once a day). Sponsoring sends some of your own coins.
// The receiver gets a System message with the title only; the name shows when they tap it in Friends.
import { useEffect, useRef, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, limit, runTransaction, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { showSystem } from "./popup";
import { todayKey } from "../game/quests";
import { t } from "../i18n";

export const SPONSOR_AMOUNTS = [5, 20, 50];
const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const events = (uid) => collection(db, "public", uid, "events");

// You opened a friend's profile: they get "an observer is watching you" (at most once a day per friend).
export function watchFriend(me, myTitle, friendUid) {
  return setDoc(doc(events(friendUid), `w-${me}-${todayKey()}`), { kind: "watch", from: me, title: myTitle ?? null, atMs: Date.now(), seen: false, at: serverTimestamp() });
}

// Send some of your coins to a friend. They see your title, not your name.
export async function sponsorFriend(me, myTitle, friendUid, amount) {
  if (!SPONSOR_AMOUNTS.includes(amount)) throw new Error("bad-amount");
  const meRef = doc(db, "players", me);
  const evRef = doc(events(friendUid));
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(meRef)).data() ?? {};
    if ((p.coins ?? 0) < amount) throw new Error("no-coins");
    tx.set(evRef, { kind: "sponsor", from: me, title: myTitle ?? null, amount, atMs: Date.now(), seen: false, at: serverTimestamp() });
    tx.set(meRef, { coins: (p.coins ?? 0) - amount, coinsSponsored: (p.coinsSponsored ?? 0) + amount, updatedAt: serverTimestamp() }, { merge: true });
  });
}

export const observerName = (title) => (title ? fill(t.observers.named, { title }) : t.observers.nameless);

// Takes in new events once: sponsored coins go into your coins, then one System message for all of them.
export function useObserverEvents(uid) {
  const busy = useRef(false);
  useEffect(() => {
    if (!uid) return undefined;
    return onSnapshot(query(events(uid), where("seen", "==", false)), async (snap) => {
      if (busy.current || snap.empty) return;
      busy.current = true;
      const lines = [];
      try {
        for (const d of snap.docs) {
          const got = await runTransaction(db, async (tx) => {
            const ev = await tx.get(d.ref);
            if (!ev.exists() || ev.data().seen) return null;
            const e = ev.data();
            if (e.kind === "sponsor") {
              const meRef = doc(db, "players", uid);
              const p = (await tx.get(meRef)).data() ?? {};
              tx.set(meRef, { coins: (p.coins ?? 0) + (e.amount ?? 0), updatedAt: serverTimestamp() }, { merge: true });
            }
            tx.update(d.ref, { seen: true });
            return e;
          }).catch(() => null);
          if (!got) continue;
          const who = observerName(got.title);
          lines.push(got.kind === "sponsor" ? fill(t.observers.sponsored, { who, n: got.amount }) : fill(t.observers.watching, { who }));
        }
      } finally { busy.current = false; }
      if (!lines.length) return;
      showSystem({ title: lines[0], lines: lines.slice(1, 4).concat(lines.length > 4 ? [fill(t.observers.more, { n: lines.length - 4 })] : []), tone: "buff" });
    }, () => {});
  }, [uid]);
}

// The last observers (newest first) for the list in Friends.
export function useObservers(uid) {
  const [list, setList] = useState(null);
  useEffect(() => {
    if (!uid) return undefined;
    return onSnapshot(query(events(uid), orderBy("atMs", "desc"), limit(20)), (snap) => setList(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setList([]));
  }, [uid]);
  return list;
}
