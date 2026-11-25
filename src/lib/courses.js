// Course progress in Firestore: players/{uid}/courses/{courseId} = { passed: { setId: dayNum }, cards: { itemId: [box, dueDay] } }.
// Passing a set or doing a review also trains the course's skill (minutes, EXP), and passing a set finishes
// an open quest of that skill on today's board.
import { useEffect, useState } from "react";
import { deleteField, doc, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { completeQuest, currentDay } from "./day";
import { reviewCard } from "../game/courses";
import { dayNum, recordTraining } from "../game/skills";
import { skillById } from "../game/guild";
import { levelFromXp } from "../game/economy";
import { todayKey } from "../game/quests";

const XP_PER_MINUTE = 1.2;
const progressRef = (uid, courseId) => doc(db, "players", uid, "courses", courseId);
const playerRef = (uid) => doc(db, "players", uid);

export function useCourse(uid, courseId) {
  const [progress, setProgress] = useState(null);
  useEffect(() => {
    if (!uid || !courseId) return undefined;
    return onSnapshot(progressRef(uid, courseId), (snap) => setProgress(snap.data() ?? {}), () => setProgress({}));
  }, [uid, courseId]);
  return progress;
}

// Training time for the skill: a training day, minutes and a little EXP (like a quick log).
export async function practise(uid, skill, minutes) {
  if (!skillById[skill]) return null;
  return runTransaction(db, async (tx) => {
    const player = (await tx.get(playerRef(uid))).data() ?? {};
    const today = dayNum(todayKey());
    const entry = recordTraining(player.skills?.[skill], minutes, today);
    const recent = { ...entry.recent };
    Object.keys(player.skills?.[skill]?.recent ?? {}).forEach((d) => { if (!(d in recent)) recent[d] = deleteField(); });
    const xp = Math.max(1, Math.round(minutes * XP_PER_MINUTE));
    const total = (player.xp ?? 0) + xp;
    const stat = skillById[skill].stat;
    tx.set(playerRef(uid), {
      skills: { ...(player.skills ?? {}), [skill]: { ...entry, recent } },
      xp: total, level: levelFromXp(total).level,
      statXp: { ...(player.statXp ?? {}), [stat]: (player.statXp?.[stat] ?? 0) + xp },
      lastDoneBySkill: { ...(player.lastDoneBySkill ?? {}), [skill]: todayKey() },
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { xp, open: openQuestFor(currentDay(player, uid), skill) };
  });
}

// An open quest of this skill on today's board (main or guild), if any. Only the first-tier quest
// ("learn the next set") counts; a harder tier (a podcast, a conversation) is done outside the course.
function openQuestFor(day, skill) {
  const isOf = (id) => id === skill || id === `g:${skill}` || id === `g:${skill}:0`;
  const m = day?.mains?.find((x) => !x.done && isOf(x.id));
  if (m) return { id: m.id, slot: "main" };
  const g = day?.guild?.find((x) => !x.done && isOf(x.id));
  return g ? { id: g.id, slot: "guild" } : null;
}

// A set's test passed: the set is done, its cards start their reviews tomorrow.
// minutes: roughly how long the lesson took. Returns { xp, quest } (quest = the finished quest's reward, if any).
export async function passSet(uid, course, set, minutes) {
  const today = dayNum(todayKey());
  await runTransaction(db, async (tx) => {
    const p = (await tx.get(progressRef(uid, course.id))).data() ?? {};
    // Doing a passed set again keeps its cards where they are in the reviews.
    const cards = Object.fromEntries(set.items.filter((it) => !p.cards?.[it.id]).map((it) => [it.id, [0, today + 1]]));
    tx.set(progressRef(uid, course.id), { passed: { [set.id]: p.passed?.[set.id] ?? today }, cards, updatedAt: serverTimestamp() }, { merge: true });
  });
  const r = await practise(uid, course.skill, minutes).catch(() => null);
  let quest = null;
  if (r?.open) {
    try { quest = await completeQuest(uid, r.open.id, r.open.slot, null, { quick: true }); } catch { /* already done */ }
  }
  return { xp: r?.xp ?? 0, quest };
}

// A review session: each card moves up a box when right, back to the start when wrong.
export async function saveReview(uid, course, results, minutes) {
  const today = dayNum(todayKey());
  await runTransaction(db, async (tx) => {
    const p = (await tx.get(progressRef(uid, course.id))).data() ?? {};
    const cards = {};
    Object.entries(results).forEach(([id, right]) => { cards[id] = reviewCard(p.cards?.[id], right, today); });
    tx.set(progressRef(uid, course.id), { cards, updatedAt: serverTimestamp() }, { merge: true });
  });
  return practise(uid, course.skill, minutes).catch(() => null);
}
