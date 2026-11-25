// Party quests in Firestore: parties/{id}, readable by its members and invited friends.
import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { db } from "./firebase";
import { levelFromXp } from "../game/economy";
import { todayKey } from "../game/quests";
import { MAX_PARTY, groupBonus, groupById, groupCoins, groupXp, partyCleared, raidById } from "../game/party";

const partyRef = (id) => doc(db, "parties", id);

// kind "group": what = group quest id (today). kind "raid": what = raid id, days = how long.
export function createParty(me, myName, kind, what, invitees, days = 5) {
  const invited = invitees.slice(0, MAX_PARTY - 1);
  const now = Date.now();
  return addDoc(collection(db, "parties"), {
    kind, leader: me, ...(kind === "group" ? { quest: what, date: todayKey() } : { raid: what, endsMs: now + days * 86400000, days }),
    members: [me], invited: invited.map((f) => f.uid),
    names: { [me]: myName ?? "Player", ...Object.fromEntries(invited.map((f) => [f.uid, f.name ?? "Player"])) },
    progress: {}, claimed: {}, createdAtMs: now, at: serverTimestamp(),
  });
}

export async function joinParty(me, myName, id) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(partyRef(id))).data();
    if (!p || !p.invited?.includes(me)) throw new Error("not-invited");
    if (p.members.length >= MAX_PARTY) throw new Error("full");
    tx.update(partyRef(id), { members: [...p.members, me], invited: p.invited.filter((x) => x !== me), names: { ...p.names, [me]: myName ?? p.names?.[me] ?? "Player" } });
  });
}

export async function declineParty(me, id) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(partyRef(id))).data();
    if (!p) return;
    tx.update(partyRef(id), { members: p.members, invited: p.invited.filter((x) => x !== me), names: p.names });
  });
}

export const cancelParty = (id) => deleteDoc(partyRef(id));

// Group quest: your part done. Pays like a normal quest (and shows in your quest log).
export async function doGroupPart(me, id) {
  const playerRef = doc(db, "players", me);
  const logRef = doc(collection(db, "players", me, "log"));
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(partyRef(id))).data();
    const pl = (await tx.get(playerRef)).data() ?? {};
    const q = groupById[p?.quest];
    if (!p || !q || p.progress?.[me] === true) return null;
    // One group quest a day pays coins; more that day still count for the party, with EXP only.
    const today = todayKey();
    const n = pl.partyDay?.date === today ? pl.partyDay.n ?? 0 : 0;
    const coins = n === 0 ? groupCoins(q) : 0;
    const xp = groupXp(q);
    const total = (pl.xp ?? 0) + xp;
    tx.update(partyRef(id), { progress: { ...p.progress, [me]: true }, claimed: p.claimed ?? {} });
    tx.set(playerRef, { partyDay: { date: today, n: n + 1 }, coins: (pl.coins ?? 0) + coins, xp: total, level: levelFromXp(total).level, statXp: { ...(pl.statXp ?? {}), [q.stat]: (pl.statXp?.[q.stat] ?? 0) + xp }, lastQuestAt: Date.now(), updatedAt: serverTimestamp() }, { merge: true });
    tx.set(logRef, { questId: `party:${q.id}`, title: q.title, coins, xp, stat: q.stat, slot: "party", date: todayKey(), at: serverTimestamp() });
    return { coins, xp, stat: q.stat, levelUp: levelFromXp(total).level > levelFromXp(pl.xp ?? 0).level ? levelFromXp(total).level : null };
  });
}

// Raid: add to your share of the goal.
export async function logRaid(me, id, amount) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(partyRef(id))).data();
    if (!p || !(amount > 0)) return;
    tx.update(partyRef(id), { progress: { ...p.progress, [me]: Math.round(((Number(p.progress?.[me]) || 0) + amount) * 10) / 10 }, claimed: p.claimed ?? {} });
  });
}

// When the party cleared it: the group bonus, or the raid reward. Once per player.
export async function claimParty(me, id) {
  const playerRef = doc(db, "players", me);
  const logRef = doc(collection(db, "players", me, "log"));
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(partyRef(id))).data();
    const pl = (await tx.get(playerRef)).data() ?? {};
    if (!p || !partyCleared(p) || p.claimed?.[me] || !p.members.includes(me)) return null;
    const raid = raidById[p.raid];
    const q = groupById[p.quest];
    const coins = p.kind === "group" ? groupBonus(q) : raid.reward;
    const xp = p.kind === "group" ? 5 : raid.reward;
    const stat = p.kind === "group" ? q.stat : raid.stat;
    const total = (pl.xp ?? 0) + xp;
    tx.update(partyRef(id), { progress: p.progress, claimed: { ...(p.claimed ?? {}), [me]: true } });
    tx.set(playerRef, { coins: (pl.coins ?? 0) + coins, xp: total, level: levelFromXp(total).level, statXp: { ...(pl.statXp ?? {}), [stat]: (pl.statXp?.[stat] ?? 0) + xp }, updatedAt: serverTimestamp() }, { merge: true });
    tx.set(logRef, { questId: `party:claim:${id}`, title: p.kind === "group" ? `Party bonus: ${q.title}` : `Raid cleared: ${raid.title}`, coins, xp, stat, slot: "party", date: todayKey(), at: serverTimestamp() });
    return { coins, xp };
  });
}

function useQueryList(field, uid) {
  const [list, setList] = useState(null);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(query(collection(db, "parties"), where(field, "array-contains", uid)),
      (snap) => setList(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setList([]));
  }, [field, uid]);
  return list;
}
export const useParties = (uid) => useQueryList("members", uid);
export const usePartyInvites = (uid) => useQueryList("invited", uid);
