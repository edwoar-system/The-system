// Habit monitoring in Firestore: tracked habits, a tap for today, bad habits you're quitting, sleep and screen time.
import { deleteField, doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { acceptQuest } from "./day";
import { levelFromXp } from "../game/economy";
import { skillById } from "../game/guild";
import { ladderById } from "../game/ladders";
import { todayKey } from "../game/quests";
import { dayNum, habitRank, isHabit, recordTraining } from "../game/skills";
import { DAY_MS, SLEEP_KEEP_DAYS, cleanDays, staleKeys } from "../game/habits";

const ref = (uid) => doc(db, "players", uid);

export function setTracked(uid, ids) {
  return updateDoc(ref(uid), { habits: ids, updatedAt: serverTimestamp() });
}

// Today done for a habit: trains the skill (counts for its rank and streak) and gives a little EXP. No coins:
// coins come from quests.
export async function logHabit(uid, skillId) {
  const skill = skillById[skillId];
  const ladder = ladderById[skillId];
  if (!skill || !ladder) throw new Error("unknown-habit");
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const today = dayNum(todayKey());
    const old = p.skills?.[skillId];
    if (old?.days?.[old.days.length - 1] === today) return { already: true };
    let entry = recordTraining(old, skill.minutes ?? 10, today);
    if (isHabit(ladder)) entry = { ...entry, rank: habitRank({ ...entry, rank: old?.rank ?? 0 }, ladder, today) };
    const recent = { ...entry.recent };
    Object.keys(old?.recent ?? {}).forEach((d) => { if (!(d in recent)) recent[d] = deleteField(); });
    const xp = 3;
    const total = (p.xp ?? 0) + xp;
    tx.set(ref(uid), {
      skills: { ...(p.skills ?? {}), [skillId]: { ...entry, recent } },
      xp: total, level: levelFromXp(total).level,
      statXp: { ...(p.statXp ?? {}), [skill.stat]: (p.statXp?.[skill.stat] ?? 0) + xp },
      lastDoneBySkill: { ...(p.lastDoneBySkill ?? {}), [skillId]: todayKey() },
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { xp };
  });
}

// ---- Quitting ----
export async function addQuit(uid, quit) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const list = [...(p.quits ?? []).filter((q) => q.id !== quit.id), { id: quit.id, name: quit.name, since: quit.since ?? Date.now(), longest: 0, slips: 0 }];
    tx.update(ref(uid), { quits: list, updatedAt: serverTimestamp() });
  });
}

export async function removeQuit(uid, id) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    tx.update(ref(uid), { quits: (p.quits ?? []).filter((q) => q.id !== id), updatedAt: serverTimestamp() });
  });
}

// A slip: the clean-days counter starts over, your longest streak is kept. No penalty.
export async function slipQuit(uid, id) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const now = Date.now();
    const list = (p.quits ?? []).map((q) => (q.id !== id ? q : { ...q, longest: Math.max(q.longest ?? 0, cleanDays(q, now)), since: now, slips: (q.slips ?? 0) + 1, lastSlip: now }));
    tx.update(ref(uid), { quits: list, updatedAt: serverTimestamp() });
  });
}

// Optional redemption quest after a slip: put on today's board.
export const takeRedemption = (uid, questId) => acceptQuest(uid, questId);

// ---- Sleep and screen time ----
export async function logSleep(uid, bed, wake, date = todayKey()) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const log = { [date]: [Math.round(bed * 4) / 4 % 24, Math.round(wake * 4) / 4] };
    staleKeys(p.sleepLog, SLEEP_KEEP_DAYS, date).forEach((k) => { log[k] = deleteField(); });
    tx.set(ref(uid), { sleepLog: log, updatedAt: serverTimestamp() }, { merge: true });
  });
}

export async function logScreen(uid, minutes, date = todayKey()) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const log = { [date]: Math.max(0, Math.round(minutes)) };
    staleKeys(p.screenLog, SLEEP_KEEP_DAYS, date).forEach((k) => { log[k] = deleteField(); });
    tx.set(ref(uid), { screenLog: log, updatedAt: serverTimestamp() }, { merge: true });
  });
}

export const yesterdayKey = () => todayKey(new Date(Date.now() - DAY_MS));
