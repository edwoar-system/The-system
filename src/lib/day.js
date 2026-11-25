import { collection, deleteField, doc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { allMainsBonus, levelFromXp, questCoins, questXp } from "../game/economy";
import { QUESTS, SIDE_BONUS, pickMainQuests, pickSideQuest, questById, todayKey, widenBy } from "../game/quests";
import { PROGRAM_DONE_BONUS, dueSessions, programById, programQuest, weekKey } from "../game/programs";
import { guildQuest } from "../game/guild";
import { ladderById } from "../game/ladders";
import { dayNum, habitRank, isHabit, passTrial, recordTraining, skillView, SKILL_RULES, trialQuest, trialState, weekNum } from "../game/skills";
import { tierForRank } from "../game/tiers";
import { dutiesDue, dutyQuest, interestSkills, mountainFactor } from "../game/profile";
import { hitsTired, questLoad, tiredSet } from "../game/muscles";
import { swapPrice } from "../game/shop";
import { gymToday, splitQuest } from "../game/gym";
import { penaltyDue } from "../game/penalty";
import { trainMuscles } from "./muscles";

export const MAX_GUILD_QUESTS = 6;

// Any quest by id: the fixed catalogue, a guild quest ("g:...") or a rank-trial part ("t:...").
// Your gym split, for gym quests ("gs:<day>") looked up without the player at hand (Shell keeps it current).
// Your own programs too ("p:..."). Shell keeps this current with setQuestCache(player).
let playerCache = null;
export const setQuestCache = (player) => { playerCache = player ?? null; };
export const setGymCache = (gym) => { playerCache = { ...(playerCache ?? {}), gym }; };

export function getQuest(id, player = null) {
  if (questById[id]) return questById[id];
  if (id.startsWith("gs:")) return splitQuest(id, (player ?? playerCache)?.gym);
  if (id.startsWith("p:")) return programQuest(id, player ?? playerCache);
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
// Muscles that are still tired steer the picks; on a gym day the split's day takes the STR slot (or the last one).
// Program sessions due today come first; the rest comes from your focus (your interests), widening with your streak.
export function newDay(player, uid) {
  const date = todayKey();
  const tired = tiredSet(player?.fatigue);
  const slots = player?.mainSlots ?? 3;
  const liked = interestSkills(player?.profile);
  const programs = dueSessions(player, date).slice(0, slots);
  const outside = Math.min(slots - programs.length, widenBy(currentStreak(player)));
  // Every skill you're into has a guild quest, at the tier your rank in it unlocks.
  const programSkills = new Set(programs.map((id) => programQuest(id, player)?.skill).filter(Boolean));
  const extra = [...liked].filter((id) => !programSkills.has(id)).map((id) => {
    const tier = tierForRank(skillView(id, player?.skills?.[id]).rank);
    return guildQuest(tier ? `g:${id}:${tier}` : `g:${id}`) ?? guildQuest(`g:${id}`);
  }).filter(Boolean);
  const mains = [...programs, ...pickMainQuests({ date, uid, lastDoneByStat: player?.lastDoneByStat ?? {}, mainSlots: slots - programs.length, liked, tired, outside, extra })];
  const gym = gymToday(player?.gym, date, (muscles) => Object.entries(muscles).some(([m, k]) => k >= 0.7 && tired.has(m)));
  if (gym) {
    const at = mains.findIndex((id) => !id.startsWith("p:") && getQuest(id, player)?.stat === "STR");
    let free = -1;
    mains.forEach((id, k) => { if (!id.startsWith("p:")) free = k; });
    const i = at >= 0 ? at : free;
    if (i >= 0) mains[i] = `gs:${gym.index}`;
  }
  // Weekly duties on (or past) their day become real main quests, on top of the usual ones.
  dutiesDue(player, date, weekNum(dayNum(date))).forEach((id) => mains.push(`d:${id}`));
  // The side quest: optional, outside your focus, a bonus for stepping out of your comfort zone.
  const side = liked.size ? pickSideQuest({ date, uid, liked, tired, avoid: mains }) : null;
  return {
    date,
    start: { id: "start", done: false },
    end: { id: "end", done: false },
    mains: mains.map((id) => ({ id, done: false })),
    ...(side ? { side: { id: side, done: false } } : {}),
    ...(gym ? { gym: { planned: gym.planned, index: gym.index, swapped: gym.swapped, allTired: !!gym.allTired } } : {}),
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

// Saves today's board the first time it's needed, so it stays the same all day
// (it's picked from how tired your muscles are, which changes as you train).
export async function ensureDay(uid) {
  const ref = doc(db, "players", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const player = snap.data();
    if (player.day?.date === todayKey()) return;
    // Yesterday's board still waiting for the penalty check: leave it, the check runs first.
    if (player.day && penaltyDue(player.day, player)) return;
    // Streak shield: one missed day (all mains done the day before yesterday, not yesterday) keeps the streak.
    const twoDaysAgo = todayKey(new Date(Date.now() - 2 * 86400000));
    const shield = (player.streakShields ?? 0) > 0 && player.lastAllMainsDate === twoDaysAgo && (player.streak ?? 0) > 0
      ? { streakShields: player.streakShields - 1, lastAllMainsDate: yesterdayKey(), shieldUsed: yesterdayKey() } : {};
    tx.set(ref, { day: newDay(player, uid), ...shield, updatedAt: serverTimestamp() }, { merge: true });
  });
}

// Swaps an open main quest for another of the same stat. The first swap of the day is free, then 10, 20, 40...
export async function swapMain(uid, questId) {
  const ref = doc(db, "players", uid);
  return runTransaction(db, async (tx) => {
    const player = (await tx.get(ref)).data() ?? {};
    const day = player.day?.date === todayKey() ? player.day : newDay(player, uid);
    const i = day.mains.findIndex((m) => m.id === questId);
    if (i < 0 || day.mains[i].done) throw new Error("not-open");
    const q = getQuest(questId, player);
    const swaps = day.swaps ?? 0;
    const cost = swapPrice(swaps);
    if ((player.coins ?? 0) < cost) throw new Error("no-coins");
    const onBoard = new Set(day.mains.map((m) => m.id));
    const tired = tiredSet(player.fatigue);
    const pool = QUESTS.filter((x) => x.stat === (q?.stat ?? "STR") && !x.side && !x.kind && !onBoard.has(x.id));
    const rested = pool.filter((x) => !hitsTired(x, tired));
    const from = rested.length ? rested : pool;
    if (!from.length) throw new Error("no-other");
    const next = from[Math.floor(Math.random() * from.length)];
    const mains = day.mains.map((m, k) => (k === i ? { id: next.id, done: false } : m));
    tx.set(ref, { day: { ...day, mains, swaps: swaps + 1 }, coins: (player.coins ?? 0) - cost, updatedAt: serverTimestamp() }, { merge: true });
    return { id: next.id, cost };
  });
}

// The start-the-day and get-ready-for-bed quests are short checklists: tick each part; returns the ticks so far.
export const START_PARTS = ["bed", "water"];
export const END_PARTS = ["teeth", "phone", "tomorrow"];
export async function tickStart(uid, part, which = "start") {
  const ref = doc(db, "players", uid);
  const key = which === "end" ? "endTicks" : "startTicks";
  return runTransaction(db, async (tx) => {
    const player = (await tx.get(ref)).data() ?? {};
    const day = player.day?.date === todayKey() ? player.day : newDay(player, uid);
    const ticks = { ...(day[key] ?? {}), [part]: true };
    tx.set(ref, { day: { ...day, [key]: ticks }, updatedAt: serverTimestamp() }, { merge: true });
    return ticks;
  });
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
  let q = getQuest(questId);
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const player = snap.data() ?? {};
    if (questId.startsWith("gs:") || questId.startsWith("p:")) q = getQuest(questId, player);
    if (!q) throw new Error("unknown-quest");
    // A logged gym session counts what you actually did: its muscles and (at most the planned) minutes.
    if (opts.gym) q = { ...q, muscles: opts.gym.muscles, minutes: Math.min(q.minutes, opts.gym.minutes ?? q.minutes) };
    const day = JSON.parse(JSON.stringify(currentDay(player, uid)));
    const today = dayNum(day.date);
    let trial = null; // the updated trial when this is a trial part
    let duties = null; // the updated duties list when this is a duty

    if (slot === "start") {
      if (day.start.done) throw new Error("already-done");
      day.start.done = true;
    } else if (slot === "end") {
      if (day.end?.done) throw new Error("already-done");
      day.end = { id: "end", done: true };
    } else if (slot === "main") {
      const m = day.mains.find((x) => x.id === questId && !x.done);
      if (!m) throw new Error("already-done");
      m.done = true;
    } else if (slot === "guild") {
      const g = day.guild.find((x) => x.id === questId && !x.done);
      if (!g) throw new Error("already-done");
      g.done = true;
    } else if (slot === "side") {
      if (!day.side || day.side.id !== questId || day.side.done) throw new Error("already-done");
      day.side.done = true;
    }
    if (slot === "duty" || (slot === "main" && questId.startsWith("d:"))) {
      const week = weekNum(today);
      const d = player.duties ?? {};
      const todayList = d.date === day.date ? [...(d.today ?? [])] : [];
      const weekList = d.week === week ? [...(d.thisWeek ?? [])] : [];
      const list = q.freq === "daily" ? todayList : weekList;
      if (list.includes(q.duty)) throw new Error("already-done");
      list.push(q.duty);
      duties = { date: day.date, today: todayList, week, thisWeek: weekList };
      // Ticked from the duties list while it's also a main quest today: the main counts as done too.
      const m = day.mains.find((x) => x.id === questId && !x.done);
      if (slot === "duty" && m) m.done = true;
    }
    if (slot === "trial") {
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

    let bonus = slot === "side" ? Math.round(coins * SIDE_BONUS) : 0;
    // Program session: the program moves on (missed ones wait, so it's always the next session).
    let programs = null;
    let programDone = null;
    if (q.program) {
      const st = player.programs?.[q.program] ?? { started: day.date, done: 0 };
      const wk = weekKey(day.date);
      const total = programById(q.program, player)?.sessions.length ?? 0;
      const done = Math.max(st.done ?? 0, q.session + 1);
      programs = { ...(player.programs ?? {}), [q.program]: { ...st, done, lastDone: day.date, week: { key: wk, count: (st.week?.key === wk ? st.week.count : 0) + 1 } } };
      if (done >= total && (st.done ?? 0) < total) { programDone = q.program; bonus += PROGRAM_DONE_BONUS; }
    }
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

    // Muscles: the quest's load goes into this week's body map and each muscle's fatigue.
    const trained = opts.quick ? null : trainMuscles(player, questLoad(q), weekNum(today));

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
      ...(trained ? trained.fields : {}),
      ...(q.gymDay != null && player.gym?.days?.length ? { gym: { next: (q.gymDay + 1) % player.gym.days.length } } : {}),
      ...(duties ? { duties } : {}),
      ...(programs ? { programs } : {}),
      ...(skillUp?.xp ? { skillBest: { ...(player.skillBest ?? {}), [q.skill]: skillUp.rank } } : {}),
      ...(trial ? { trials: { [q.skill]: trial.complete ? deleteField() : { rank: trial.rank, started: trial.started, done: trial.done } } } : {}),
      ...(q.school ? { philosophy: { ...(player.philosophy ?? {}), [q.school]: Math.max(player.philosophy?.[q.school] ?? 0, q.reading + 1) } } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return {
      programDone, coins, xp, bonus, levelUp: after > before ? after : null, stat: q.stat, streak, skillUp, trialDone: trial?.complete ?? false,
      muscles: trained ? trained.report : null,
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
