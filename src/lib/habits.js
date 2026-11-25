// Habit monitoring in Firestore: tracked habits, a tap for today, bad habits you're quitting, sleep and screen time.
import { deleteField, doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { acceptQuest } from "./day";
import { levelFromXp } from "../game/economy";
import { skillById } from "../game/guild";
import { ladderById } from "../game/ladders";
import { todayKey } from "../game/quests";
import { dayNum, habitRank, isHabit, recordTraining } from "../game/skills";
import { CHECK_KEEP_DAYS, DAY_MS, DEFAULT_TRACKED, SLEEP_KEEP_DAYS, checkById, cleanDays, staleKeys } from "../game/habits";
import { showSystem } from "./popup";
import { t } from "../i18n";

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

// A check (pills, teeth...) done today: a little EXP for its stat, no coins.
export async function logCheck(uid, id) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const today = dayNum(todayKey());
    const days = (p.checkDays?.[id] ?? []).filter((d) => d > today - CHECK_KEEP_DAYS);
    if (days.includes(today)) return { already: true };
    const stat = checkById[id]?.stat ?? "WIL";
    const xp = 2;
    const total = (p.xp ?? 0) + xp;
    tx.set(ref(uid), {
      checkDays: { ...(p.checkDays ?? {}), [id]: [...days, today] },
      xp: total, level: levelFromXp(total).level,
      statXp: { ...(p.statXp ?? {}), [stat]: (p.statXp?.[stat] ?? 0) + xp },
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { xp };
  });
}

// Your own check, like "Stretch before bed". It's added to what you track.
export async function addCustomCheck(uid, name) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const id = `my${Date.now().toString(36)}`;
    const list = [...(p.customChecks ?? []), { id, name: String(name).trim().slice(0, 40) }];
    const habits = [...(p.habits?.length ? p.habits : DEFAULT_TRACKED), id];
    tx.update(ref(uid), { customChecks: list, habits, updatedAt: serverTimestamp() });
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
export async function logSleep(uid, bed, wake, quality = null, date = todayKey()) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const night = [Math.round(bed * 4) / 4 % 24, Math.round(wake * 4) / 4];
    const log = { [date]: quality ? [...night, quality] : night };
    staleKeys(p.sleepLog, SLEEP_KEEP_DAYS, date).forEach((k) => { log[k] = deleteField(); });
    tx.set(ref(uid), { sleepLog: log, updatedAt: serverTimestamp() }, { merge: true });
  }).then((r) => {
    // The System tells you what last night does for today.
    if (date === todayKey()) {
      const hours = Math.round((((wake - (bed < 12 ? bed + 24 : bed)) % 24) + 24) % 24 * 10) / 10;
      const bad = hours < 6 || (quality != null && quality <= 2);
      const good = hours >= 7.5 && (quality == null || quality >= 4);
      showSystem({
        title: bad ? t.popup.badSleep : good ? t.popup.rested : t.popup.sleepLogged,
        bar: { value: Math.min(hours, 8), max: 8, label: `${hours} h` },
        lines: [bad ? t.popup.debuffSleep : good ? t.popup.buffRested : t.popup.sleepOk],
        tone: bad ? "debuff" : "buff",
      });
    }
    return r;
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
