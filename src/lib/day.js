import { collection, deleteField, doc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { allMainsBonus, levelFromXp, questCoins, questXp } from "../game/economy";
import { pickMainQuests, questById, todayKey } from "../game/quests";
import { guildQuest } from "../game/guild";
import { ladderById } from "../game/ladders";
import { dayNum, habitRank, isHabit, passTrial, recordTraining, skillView, SKILL_RULES, trialQuest, trialState, weekNum } from "../game/skills";
import { tierForRank } from "../game/tiers";
import { dutyQuest, interestSkills, mountainFactor } from "../game/profile";
import { addLoad, coverage, questLoad } from "../game/muscles";

export const MAX_GUILD_QUESTS = 6;

// Any quest by id: the fixed catalogue, a guild quest ("g:...") or a rank-trial part ("t:...").
export function getQuest(id) {
  if (questById[id]) return questById[id];
  if (id.startsWith("t:")) return trialQuest(id);
  if (id.startsWith("d:")) return dutyQuest(id);
  return guildQuest(id);
}

const rankXp = (from, to) => {
  let xp = 0;
  for (let r = from + 1; r <= to; r++) xp += SKILL_RULES.rankUpXp * r;
  return xp;
};

// Today's quest board lives in the player document as `day`. A new board is made the first time you open the app each day.
export function newDay(player, uid) {
  const date = todayKey();
  return {
    date,
    start: { id: "start", done: false },
    mains: pickMainQuests({ date, uid, lastDoneByStat: player?.lastDoneByStat ?? {}, mainSlots: player?.mainSlots ?? 3, liked: interestSkills(player?.profile) })
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
  const q = getQuest(questId);
  if (!q) throw new Error("unknown-quest");
  const ref = doc(db, "players", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const player = snap.data() ?? {};
    if (q.tier && q.tier > tierForRank(skillView(q.skill, player.skills?.[q.skill]).rank)) throw new Error("tier-locked");
    const day = JSON.parse(JSON.stringify(currentDay(player, uid)));
    if (day.guild.some((g) => g.id === questId && !g.done)) throw new Error("already-on-board");
    if (day.guild.filter((g) => !g.done).length >= MAX_GUILD_QUESTS) throw new Error("board-full");
    day.guild.push({ id: questId, done: false });
    tx.set(ref, { day, updatedAt: serverTimestamp() }, { merge: true });
  });
}

// Preview of what a quest pays right now (diminishing returns included).
// profile: the player's questionnaire answers (for the personal mountain factor).
export function rewardPreview(day, questId, profile = null) {
  const q = getQuest(questId);
  const times = day?.typeCounts?.[q.type] ?? 0;
  const mountain = mountainFactor(profile, q.type);
  return { coins: q.trial ? 0 : questCoins({ ...q, timesAlreadyToday: times, mountain }), xp: questXp({ ...q, timesAlreadyToday: times }) };
}

// Completes a quest: coins, XP, stat XP and the all-mains bonus in one transaction.
// slot: "start" | "main" | "guild" | "trial". log: optional { value, unit } ("reps" or "seconds").
// opts.quick: finished by quick logs, which already counted the minutes toward the skill and muscles.
export async function completeQuest(uid, questId, slot, log = null, opts = {}) {
  const ref = doc(db, "players", uid);
  const q = getQuest(questId);
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const player = snap.data() ?? {};
    const day = JSON.parse(JSON.stringify(currentDay(player, uid)));
    const today = dayNum(day.date);
    let trial = null; // the updated trial when this is a trial part
    let duties = null; // the updated duties list when this is a duty

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
    } else if (slot === "duty") {
      const week = weekNum(today);
      const d = player.duties ?? {};
      const todayList = d.date === day.date ? [...(d.today ?? [])] : [];
      const weekList = d.week === week ? [...(d.thisWeek ?? [])] : [];
      const list = q.freq === "daily" ? todayList : weekList;
      if (list.includes(q.duty)) throw new Error("already-done");
      list.push(q.duty);
      duties = { date: day.date, today: todayList, week, thisWeek: weekList };
    } else if (slot === "trial") {
      const ladder = ladderById[q.skill];
      const st = trialState(player.trials?.[q.skill], ladder, player.skills?.[q.skill]?.ticks, today);
      if (!st || st.rank !== q.trial.rank) throw new Error("no-trial");
      const part = st.parts.find((p) => p.key === q.trial.key);
      if (!part || part.done) throw new Error("already-done");
      const need = q.trial.need;
      if (need && log?.value != null && (need.kind === "min" ? log.value < need.value : log.value > need.value)) throw new Error("below-test");
      const done = { ...(st.expired ? {} : player.trials[q.skill].done ?? {}), [part.key]: { day: today, value: log?.value ?? null } };
      trial = { rank: st.rank, started: st.started ?? today, done, complete: st.parts.every((p) => p.done || p.key === part.key) };
    }

    const times = day.typeCounts[q.type] ?? 0;
    // Trial parts pay EXP but no coins: the rank is the reward, and a high placement shouldn't flood you with coins.
    const coins = slot === "trial" ? 0 : questCoins({ ...q, timesAlreadyToday: times, mountain: mountainFactor(player.profile, q.type) });
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

    // Skill progress: the quest's minutes count toward its skill.
    let skills = null;
    let skillUp = null;
    if (q.skill && ladderById[q.skill] && !opts.quick) {
      const ladder = ladderById[q.skill];
      const skillBefore = player.skills?.[q.skill]?.rank ?? 0;
      let entry = recordTraining(player.skills?.[q.skill], q.minutes, today);
      if (trial?.complete) entry = passTrial(entry, ladder, trial.rank).entry;
      if (isHabit(ladder)) entry = { ...entry, rank: habitRank({ ...entry, rank: skillBefore }, ladder, today) };
      const best = player.skillBest?.[q.skill] ?? 0;
      if (entry.rank > skillBefore) skillUp = { id: q.skill, rank: entry.rank, xp: rankXp(Math.max(best, skillBefore), entry.rank) };
      // Merge writes keep old map keys, so delete the days that dropped out of the last-14-days chart.
      const recent = { ...entry.recent };
      Object.keys(player.skills?.[q.skill]?.recent ?? {}).forEach((d) => { if (!(d in recent)) recent[d] = deleteField(); });
      skills = { ...(player.skills ?? {}), [q.skill]: { ...entry, recent } };
    }

    // Muscles: the quest's load goes into this week's body map.
    const load = opts.quick ? null : questLoad(q);
    const week = weekNum(today);
    const weekBefore = player.muscleLoad?.[week] ?? {};
    const weekAfter = load ? addLoad(weekBefore, load) : null;
    let muscleLoad = null;
    if (weekAfter) {
      muscleLoad = { [week]: weekAfter };
      Object.keys(player.muscleLoad ?? {}).forEach((k) => { if (Number(k) < week - 1) muscleLoad[k] = deleteField(); });
    }

    const totalXp = (player.xp ?? 0) + xp + (skillUp?.xp ?? 0);
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
      ...(skills ? { skills } : {}),
      ...(muscleLoad ? { muscleLoad } : {}),
      ...(duties ? { duties } : {}),
      ...(skillUp?.xp ? { skillBest: { ...(player.skillBest ?? {}), [q.skill]: skillUp.rank } } : {}),
      ...(trial ? { trials: { [q.skill]: trial.complete ? deleteField() : { rank: trial.rank, started: trial.started, done: trial.done } } } : {}),
      ...(q.school ? { philosophy: { ...(player.philosophy ?? {}), [q.school]: Math.max(player.philosophy?.[q.school] ?? 0, q.reading + 1) } } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return {
      coins, xp, bonus, levelUp: after > before ? after : null, stat: q.stat, streak, skillUp, trialDone: trial?.complete ?? false,
      muscles: weekAfter ? { hit: load, load: weekAfter, before: coverage(weekBefore), after: coverage(weekAfter) } : null,
    };
  });

  // Quest log (Settings > History, and the check-in answers). Separate write: if it fails, the reward still counts.
  const logRef = doc(collection(db, "players", uid, "log"));
  setDoc(logRef, {
    questId, slot, title: q.title, type: q.type, stat: q.stat, ...(log?.value != null ? { value: log.value, unit: log.unit ?? null } : {}),
    ...(opts.quick ? { quick: true } : {}),
    coins: result.coins, xp: result.xp, bonus: result.bonus, date: todayKey(), at: serverTimestamp(),
  }).catch(() => {});

  return { ...result, logId: logRef.id, slot };
}
