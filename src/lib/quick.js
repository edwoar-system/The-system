// Quick logs in Firestore: one tap adds to today's count, the skill, the muscles and a little EXP.
// When the count reaches the goal of an open main quest, that quest is completed (full reward).
import { deleteField, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { completeQuest, currentDay } from "./day";
import { QUICK_XP_PER_MINUTE, quickById, quickReps, quickTarget, quickToday } from "../game/quick";
import { todayKey } from "../game/quests";
import { skillById } from "../game/guild";
import { ladderById } from "../game/ladders";
import { dayNum, habitRank, isHabit, recordTraining, weekNum } from "../game/skills";
import { questLoad } from "../game/muscles";
import { trainMuscles } from "./muscles";
import { levelFromXp } from "../game/economy";
import { DIFF_SETS, difficultyOf } from "../game/difficulty";

const ref = (uid) => doc(db, "players", uid);

// Today's counts, with yesterday's keys deleted (merge writes keep old map keys otherwise).
function countsWrite(player, counts, reps = null) {
  const out = { ...counts };
  const stale = player.quick?.date !== todayKey();
  if (stale) Object.keys(player.quick?.counts ?? {}).forEach((k) => { if (!(k in out)) out[k] = deleteField(); });
  const w = { date: todayKey(), counts: out };
  if (reps) {
    const r = { ...reps };
    if (stale) Object.keys(player.quick?.reps ?? {}).forEach((k) => { if (!(k in r)) r[k] = deleteField(); });
    w.reps = r;
  } else if (stale && player.quick?.reps) w.reps = deleteField();
  return w;
}

// reps: for a set, how many reps it had (shown in the quest's set list).
export async function quickLog(uid, itemId, reps = null) {
  const item = quickById[itemId];
  if (!item) throw new Error("unknown-item");
  const skill = skillById[item.skill];
  const ladder = ladderById[item.skill];

  const res = await runTransaction(db, async (tx) => {
    const player = (await tx.get(ref(uid))).data() ?? {};
    const today = dayNum(todayKey());
    const counts = { ...quickToday(player) };
    counts[itemId] = (counts[itemId] ?? 0) + 1;
    const repsToday = { ...quickReps(player) };
    if (reps != null) repsToday[itemId] = [...(repsToday[itemId] ?? []), reps];

    // Skill: minutes and a training day (habit skills can rank up from this too).
    let entry = recordTraining(player.skills?.[item.skill], item.minutes, today);
    if (isHabit(ladder)) entry = { ...entry, rank: habitRank({ ...entry, rank: player.skills?.[item.skill]?.rank ?? 0 }, ladder, today) };
    const recent = { ...entry.recent };
    Object.keys(player.skills?.[item.skill]?.recent ?? {}).forEach((d) => { if (!(d in recent)) recent[d] = deleteField(); });

    // Muscles for this week.
    const trained = trainMuscles(player, questLoad({ skill: item.skill, minutes: item.minutes }), weekNum(today));

    const xp = Math.max(1, Math.round(item.minutes * QUICK_XP_PER_MINUTE));
    const totalXp = (player.xp ?? 0) + xp;
    const before = levelFromXp(player.xp ?? 0).level;
    const after = levelFromXp(totalXp).level;

    tx.set(ref(uid), {
      quick: countsWrite(player, counts, reps != null ? repsToday : null),
      skills: { ...(player.skills ?? {}), [item.skill]: { ...entry, recent } },
      ...(trained ? trained.fields : {}),
      xp: totalXp,
      level: after,
      statXp: { ...(player.statXp ?? {}), [skill.stat]: (player.statXp?.[skill.stat] ?? 0) + xp },
      lastDoneBySkill: { ...(player.lastDoneBySkill ?? {}), [item.skill]: todayKey() },
      lastQuestAt: Date.now(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    const target = quickTarget(item, currentDay(player, uid), DIFF_SETS[difficultyOf(player)]);
    return { count: counts[itemId], xp, levelUp: after > before ? after : null, target };
  });

  // Goal reached: finish the main quest (full reward, minutes already counted).
  if (res.target && res.count >= res.target.goal) {
    try {
      res.completed = await completeQuest(uid, res.target.questId, "main", null, { quick: true });
      res.completedQuest = res.target.questId;
    } catch {
      // Already done in the meantime: nothing to finish.
    }
  }
  return res;
}

// Takes back the last tap (a mis-tap): the count and the minutes. A quest that already finished stays finished.
export async function quickUndo(uid, itemId) {
  const item = quickById[itemId];
  return runTransaction(db, async (tx) => {
    const player = (await tx.get(ref(uid))).data() ?? {};
    const counts = { ...quickToday(player) };
    if (!counts[itemId]) return null;
    counts[itemId] -= 1;
    const repsToday = { ...quickReps(player) };
    if (repsToday[itemId]?.length) repsToday[itemId] = repsToday[itemId].slice(0, -1);
    const e = player.skills?.[item.skill];
    const today = dayNum(todayKey());
    const fix = e ? {
      skills: { ...(player.skills ?? {}), [item.skill]: {
        ...e,
        minutes: Math.max(0, (e.minutes ?? 0) - item.minutes),
        sessions: Math.max(0, (e.sessions ?? 0) - 1),
        recent: { ...(e.recent ?? {}), [today]: Math.max(0, (e.recent?.[today] ?? 0) - item.minutes) },
      } },
    } : {};
    tx.set(ref(uid), { quick: countsWrite(player, counts, repsToday), ...fix, updatedAt: serverTimestamp() }, { merge: true });
    return counts[itemId];
  });
}
