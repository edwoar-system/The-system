import { addDoc, collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { allMainsBonus, levelFromXp, questCoins, questXp } from "../game/economy";
import { pickMainQuests, questById, todayKey } from "../game/quests";

// Today's quest board lives in the player document as `day`. A new board is made the first time you open the app each day.
export function newDay(player, uid) {
  const date = todayKey();
  return {
    date,
    start: { id: "start", done: false },
    mains: pickMainQuests({ date, uid, lastDoneByStat: player?.lastDoneByStat ?? {}, mainSlots: player?.mainSlots ?? 3 })
      .map((id) => ({ id, done: false })),
    typeCounts: {},
    mainCoins: 0,
    bonusPaid: false,
  };
}

export function currentDay(player, uid) {
  return player?.day?.date === todayKey() ? player.day : newDay(player, uid);
}

// Preview of what a quest pays right now (diminishing returns included).
export function rewardPreview(day, questId) {
  const q = questById[questId];
  const times = day?.typeCounts?.[q.type] ?? 0;
  return { coins: questCoins({ ...q, timesAlreadyToday: times }), xp: questXp({ ...q, timesAlreadyToday: times }) };
}

// Completes a quest: coins, XP, stat XP and the all-mains bonus in one transaction.
// slot: "start" | "main" | "side"
export async function completeQuest(uid, questId, slot) {
  const ref = doc(db, "players", uid);
  const q = questById[questId];
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
    }

    const times = day.typeCounts[q.type] ?? 0;
    const coins = questCoins({ ...q, timesAlreadyToday: times });
    const xp = questXp({ ...q, timesAlreadyToday: times });
    day.typeCounts[q.type] = times + 1;
    if (slot === "main") day.mainCoins += coins;

    let bonus = 0;
    if (slot === "main" && !day.bonusPaid && day.mains.every((x) => x.done)) {
      bonus = allMainsBonus(day.mainCoins);
      day.bonusPaid = true;
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
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { coins, xp, bonus, levelUp: after > before ? after : null, stat: q.stat };
  });

  // Quest log for balancing later. Separate write: if it fails, the reward still counts.
  addDoc(collection(db, "players", uid, "log"), {
    questId, slot, title: q.title, type: q.type, stat: q.stat,
    coins: result.coins, xp: result.xp, bonus: result.bonus, date: todayKey(), at: serverTimestamp(),
  }).catch(() => {});

  return result;
}
