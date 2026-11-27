// "This week" items and choosing your own side quest (game/week.js).
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { WEEK_COINS, WEEK_MAX, mondayKey, weekDone, weekItems } from "../game/week";
import { guildQuest } from "../game/guild";
import { skillView } from "../game/skills";
import { tierForRank } from "../game/tiers";
import { todayKey } from "../game/quests";

const ref = (uid) => doc(db, "players", uid);

export function addWeekItem(uid, item) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const items = weekItems(p);
    const clean = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      ...(item.skill ? { skill: item.skill } : { text: String(item.text ?? "").trim().slice(0, 60) }),
      times: Math.max(1, Math.min(7, item.times ?? 1)),
      ...(item.day ? { day: item.day } : {}),
      ...(item.time ? { time: item.time } : {}),
    };
    if (!clean.skill && !clean.text) return null;
    tx.set(ref(uid), { week: { key: mondayKey(), items: [...items, clean].slice(-WEEK_MAX) }, updatedAt: serverTimestamp() }, { merge: true });
    return clean;
  });
}

export function removeWeekItem(uid, id) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    tx.set(ref(uid), { week: { key: mondayKey(), items: weekItems(p).filter((x) => x.id !== id) }, updatedAt: serverTimestamp() }, { merge: true });
  });
}

// The quest id for doing a skill today, at your rank's tier.
export function skillQuestId(player, skill) {
  const tier = Math.max(0, Math.min(2, tierForRank(skillView(skill, player?.skills?.[skill]).rank)));
  return tier && guildQuest(`g:${skill}:${tier}`) ? `g:${skill}:${tier}` : `g:${skill}`;
}

// You choose today's side quest yourself (a skill, a "This week" item or a to-do). Only while it isn't done.
export function setSide(uid, questId) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    if (p.day?.date !== todayKey()) throw new Error("no-day");
    if (p.day.side?.done) throw new Error("side-done");
    tx.update(ref(uid), { "day.side": { id: questId, done: false, chosen: true }, updatedAt: serverTimestamp() });
  });
}

// "I did it": +1 on a week item (a few coins), up to how often you wanted it.
export function tickWeekItem(uid, id) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const items = weekItems(p);
    const x = items.find((i) => i.id === id);
    if (!x) return null;
    const n = weekDone(p, x);
    if (n >= (x.times ?? 1)) return null;
    tx.set(ref(uid), { week: { key: mondayKey(), items: items.map((i) => (i.id === id ? { ...i, done: n + 1 } : i)) }, coins: (p.coins ?? 0) + WEEK_COINS, updatedAt: serverTimestamp() }, { merge: true });
    return { n: n + 1, of: x.times ?? 1, coins: WEEK_COINS };
  });
}

// Puts an item on a day (and time): your own choice or the System's suggestion.
export function planWeekItem(uid, id, day, time) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    tx.set(ref(uid), { week: { key: mondayKey(), items: weekItems(p).map((i) => (i.id === id ? { ...i, day, time: time ?? null } : i)) }, updatedAt: serverTimestamp() }, { merge: true });
  });
}
