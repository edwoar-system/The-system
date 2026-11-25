// Quest catalog and the daily main-quest picker.
// Stats: STR (strength), AGI (agility), VIT (vitality/health), INT (intellect), WIL (willpower), CHA (charisma).
import { hitsTired } from "./muscles";

export const STATS = ["STR", "AGI", "VIT", "INT", "WIL", "CHA"];

// type = what counts as "the same kind of quest" for diminishing returns.
// skill = the skill the minutes count toward (Skills room).
export const QUESTS = [
  // Start of the day: always tiny, so the day begins with a win.
  { id: "start", type: "start", title: "Make your bed and drink a glass of water", stat: "VIT", minutes: 2, difficulty: "easy", kind: "start" },

  // Main-quest pool, grouped by stat.
  { id: "study45", skill: "study", type: "study", title: "Study 45 minutes (or 18 questions)", stat: "INT", minutes: 45, difficulty: "normal" },
  { id: "study25", skill: "study", type: "study", title: "Study 25 minutes: one chapter section", stat: "INT", minutes: 25, difficulty: "normal" },
  { id: "pushups", skill: "pushups", type: "workout", title: "Push-up session: 5 sets close to failure", stat: "STR", minutes: 20, difficulty: "hard" },
  { id: "pullups", skill: "pullups", type: "workout", title: "Pull-up session: 5 sets", stat: "STR", minutes: 20, difficulty: "hard" },
  { id: "run", skill: "running", type: "cardio", title: "Run or cycle 30 minutes", stat: "AGI", minutes: 30, difficulty: "normal" },
  { id: "mobility", skill: "stretch", type: "mobility", title: "Stretch and mobility, 15 minutes", stat: "AGI", minutes: 15, difficulty: "easy" },
  { id: "water", skill: "water", type: "health", title: "Drink 2.5 L of water today", stat: "VIT", minutes: 5, difficulty: "easy" },
  { id: "walk", skill: "walk", type: "walk", title: "Walk 30 minutes outside", stat: "VIT", minutes: 30, difficulty: "easy" },
  { id: "meditate", skill: "meditation", type: "mind", title: "Meditate 10 minutes", stat: "WIL", minutes: 10, difficulty: "hard" },
  { id: "nophone", skill: "nophone", type: "mind", title: "First hour after waking: no phone", stat: "WIL", minutes: 15, difficulty: "hard" },
  { id: "japanese", skill: "japanese", type: "language", title: "Japanese: 15 minutes of kana or kanji", stat: "INT", minutes: 15, difficulty: "normal" },
  { id: "kindness", skill: "kindness", type: "social", title: "Do something kind for someone", stat: "CHA", minutes: 10, difficulty: "normal" },
  { id: "callsomeone", skill: "reachout", type: "social", title: "Call or meet a friend or family member", stat: "CHA", minutes: 20, difficulty: "normal" },
  { id: "journal", skill: "journal", type: "journal", title: "Evening journal: 3 lines about today", stat: "WIL", minutes: 10, difficulty: "easy" },
];

export const questById = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Small deterministic random generator, so the same day always gives the same quests.
function seeded(seedText) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Picks today's main quests: one per stat, rotating so the stats you trained least recently come first.
// mainSlots grows with rank later (room 3): F–E 3, D–C 4–5, B+ 6.
// liked: skills from your interests; a quest for one of them is picked 3 times out of 4 when the stat has one.
// tired: muscles that are still tired; quests that lean on them are skipped when there's another choice.
// extra: more quests for the focus pool (guild quests for every skill you're into), so focus never runs dry.
export function pickMainQuests({ date, lastDoneByStat = {}, mainSlots = 3, uid = "", liked = null, tired = null, outside = null, avoid = [], extra = [] }) {
  const rand = seeded(`${uid}:${date}`);
  const usable = (q) => !q.side && q.kind !== "start" && !avoid.includes(q.id);
  const rest = (list) => { const r = tired?.size ? list.filter((q) => !hitsTired(q, tired)) : list; return r.length ? r : list; };
  const pick = (list) => list[Math.floor(rand() * list.length)];

  // Focus first: with interests set, all main quests come from them, except `outside` ones
  // (the System widens your focus as your streak grows).
  if (liked?.size && outside != null) {
    const inFocus = rest([...QUESTS.filter((q) => usable(q) && liked.has(q.skill)), ...extra.filter((q) => !avoid.includes(q.id))]);
    const byId = Object.fromEntries(inFocus.map((q) => [q.id, q]));
    const picked = [];
    const skillsUsed = new Set();
    const nFocus = Math.max(0, mainSlots - outside);
    // Spread over stats: the least recently done stat first.
    const byStat = [...STATS].sort((x, y) => ((lastDoneByStat[x] ?? "") < (lastDoneByStat[y] ?? "") ? -1 : 1));
    for (let i = 0; i < nFocus && inFocus.length; i++) {
      const open = (q) => !picked.includes(q.id) && !skillsUsed.has(q.skill);
      const stat = byStat.find((st) => inFocus.some((q) => q.stat === st && open(q))) ?? null;
      const from = inFocus.filter((q) => open(q) && (!stat || q.stat === stat));
      if (!from.length) break;
      const q = pick(from);
      picked.push(q.id);
      skillsUsed.add(q.skill);
      if (stat) byStat.push(byStat.splice(byStat.indexOf(stat), 1)[0]);
    }
    const usedStats = new Set(picked.map((id) => byId[id].stat));
    const others = byStat.filter((st) => !usedStats.has(st));
    while (picked.length < mainSlots) {
      const st = others.shift() ?? STATS[Math.floor(rand() * STATS.length)];
      const from = rest(QUESTS.filter((q) => usable(q) && q.stat === st && !liked.has(q.skill) && !picked.includes(q.id)));
      if (!from.length) break;
      picked.push(pick(from).id);
    }
    return picked;
  }

  const order = [...STATS].sort((a, b) => {
    const da = lastDoneByStat[a] ?? "";
    const db = lastDoneByStat[b] ?? "";
    if (da !== db) return da < db ? -1 : 1;
    return rand() - 0.5;
  });
  return order.slice(0, mainSlots).map((stat) => {
    const pool = rest(QUESTS.filter((q) => q.stat === stat && usable(q)));
    const fav = liked?.size ? pool.filter((q) => liked.has(q.skill)) : [];
    const from = fav.length && rand() < 0.75 ? fav : pool;
    return pick(from).id;
  });
}

// How many main quests come from outside your focus: none at first, 1 after a 7-day streak, 2 after 30.
export const widenBy = (streak) => (streak >= 30 ? 2 : streak >= 7 ? 1 : 0);

// The optional side quest: one quest outside your focus, for a bonus.
export const SIDE_BONUS = 0.25;
export function pickSideQuest({ date, uid = "", liked = null, tired = null, avoid = [] }) {
  const rand = seeded(`${uid}:${date}:side`);
  const all = QUESTS.filter((q) => !q.side && q.kind !== "start" && !avoid.includes(q.id) && !(liked?.has(q.skill)));
  const r = tired?.size ? all.filter((q) => !hitsTired(q, tired)) : all;
  const from = r.length ? r : all;
  return from.length ? from[Math.floor(rand() * from.length)].id : null;
}
