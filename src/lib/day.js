import { addDoc, collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { allMainsBonus, levelFromXp, questCoins, questXp } from "../game/economy";
import { pickMainQuests, questById, todayKey } from "../game/quests";
import { guildQuest } from "../game/guild";

export const MAX_GUILD_QUESTS = 6;

// Any quest by id: the fixed catalogue, or a guild quest ("g:...").
export function getQuest(id) {
  return questById[id] ?? guildQuest(id);
}

// Today's quest board lives in the player document as `day`. A new board is made the first time you open the app each day.
export function newDay(player, uid) {
  const date = todayKey();
  return {
    date,
    start: { id: "start", done: false },
    mains: pickMainQuests({ date, uid, lastDoneByStat: player?.lastDoneByStat ?? {}, mainSlots: player?.mainSlots ?? 3 })
      .map((id) => ({ id, done: false })),
    guild: [],
    typeCounts: {},
    mainCoins: 0,
    bonusPaid: false,
  };
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

// The streak still counts if the last full day was today or yesterday.
export function currentStreak(player) {
  const last = player?.lastAllMainsDate;
  return last === todayKey() || last === yesterdayKey() ? player.streak ?? 0 : 0;
}

export function currentDay(player, uid) {
  const day = player?.day?.date === todayKey() ? player.day : newDay(player, uid);
  return day.guild ? day : { ...day, guild: [] };
}

// Puts a guild quest on today's board.
export async function acceptQuest(uid, questId) {
  if (!getQuest(questId)) throw new Error("unknown-quest");
  const ref = doc(db, "players", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const player = snap.data() ?? {};
    const day = JSON.parse(JSON.stringify(currentDay(player, uid)));
    if (day.guild.some((g) => g.id === questId && !g.done)) throw new Error("already-on-board");
    if (day.guild.filter((g) => !g.done).length >= MAX_GUILD_QUESTS) throw new Error("board-full");
    day.guild.push({ id: questId, done: false });
    tx.set(ref, { day, updatedAt: serverTimestamp() }, { merge: true });
  });
}

// Preview of what a quest pays right now (diminishing returns included).
export function rewardPreview(day, questId) {
  const q = getQuest(questId);
  const times = day?.typeCounts?.[q.type] ?? 0;
  return { coins: questCoins({ ...q, timesAlreadyToday: times }), xp: questXp({ ...q, timesAlreadyToday: times }) };
}

// Completes a quest: coins, XP, stat XP and the all-mains bonus in one transaction.
// slot: "start" | "main" | "guild"
export async function completeQuest(uid, questId, slot) {
  const ref = doc(db, "players", uid);
  const q = getQuest(questId);
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const player = snap.data() ?? {};
    const day = JSON.parse(JSON.stringify(currentDay(player, uid)));

    if (slot === "start") {
      if (day.start.done) throw new Error("already-done");
      day.start.done = true;
    } else if (slot === "main") {
      const m = day.mains.find((x) => x.id === questId && !x.done);
      if (!m) throw new Error("already-done");
      m.done = true;
    } else if (slot === "guild") {
      const g = day.guild.find((x) => x.id === questId && !x.done);
      if (!g) throw new Error("already-done");
      g.done = true;
    }

    const times = day.typeCounts[q.type] ?? 0;
    const coins = questCoins({ ...q, timesAlreadyToday: times });
    const xp = questXp({ ...q, timesAlreadyToday: times });
    day.typeCounts[q.type] = times + 1;
    if (slot === "main") day.mainCoins += coins;

    let bonus = 0;
    let streak = player.streak ?? 0;
    let lastAllMainsDate = player.lastAllMainsDate ?? null;
    if (slot === "main" && !day.bonusPaid && day.mains.every((x) => x.done)) {
      bonus = allMainsBonus(day.mainCoins);
      day.bonusPaid = true;
      // Streak = days in a row with every main quest done.
      streak = lastAllMainsDate === yesterdayKey() ? streak + 1 : 1;
      lastAllMainsDate = day.date;
    }

    const totalXp = (player.xp ?? 0) + xp;
    const before = levelFromXp(player.xp ?? 0).level;
    const after = levelFromXp(totalXp).level;

    tx.set(ref, {
      day,
      coins: (player.coins ?? 0) + coins + bonus,
      xp: totalXp,
      level: after,
      statXp: { ...(player.statXp ?? {}), [q.stat]: (player.statXp?.[q.stat] ?? 0) + xp },
      lastDoneByStat: { ...(player.lastDoneByStat ?? {}), [q.stat]: day.date },
      streak,
      lastAllMainsDate,
      lastQuestAt: Date.now(),
      ...(q.skill ? { lastDoneBySkill: { ...(player.lastDoneBySkill ?? {}), [q.skill]: day.date } } : {}),
      ...(q.school ? { philosophy: { ...(player.philosophy ?? {}), [q.school]: Math.max(player.philosophy?.[q.school] ?? 0, q.reading + 1) } } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { coins, xp, bonus, levelUp: after > before ? after : null, stat: q.stat, streak };
  });

  // Quest log for balancing later. Separate write: if it fails, the reward still counts.
  addDoc(collection(db, "players", uid, "log"), {
    questId, slot, title: q.title, type: q.type, stat: q.stat,
    coins: result.coins, xp: result.xp, bonus: result.bonus, date: todayKey(), at: serverTimestamp(),
  }).catch(() => {});

  return result;
}
