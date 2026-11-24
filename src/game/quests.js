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
export function pickMainQuests({ date, lastDoneByStat = {}, mainSlots = 3, uid = "", liked = null, tired = null }) {
  const rand = seeded(`${uid}:${date}`);
  const order = [...STATS].sort((a, b) => {
    const da = lastDoneByStat[a] ?? "";
    const db = lastDoneByStat[b] ?? "";
    if (da !== db) return da < db ? -1 : 1;
    return rand() - 0.5;
  });
  return order.slice(0, mainSlots).map((stat) => {
    const all = QUESTS.filter((q) => q.stat === stat && !q.side && q.kind !== "start");
    const rested = tired?.size ? all.filter((q) => !hitsTired(q, tired)) : all;
    const pool = rested.length ? rested : all;
    const fav = liked?.size ? pool.filter((q) => liked.has(q.skill)) : [];
    const from = fav.length && rand() < 0.75 ? fav : pool;
    return from[Math.floor(rand() * from.length)].id;
  });
}
