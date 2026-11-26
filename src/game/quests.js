// Quest catalog and the daily main-quest picker.
// Stats: STR (strength), AGI (agility), VIT (vitality/health), INT (intellect), WIL (willpower), CHA (charisma).
import { hitsTired } from "./muscles";

export const STATS = ["STR", "AGI", "VIT", "INT", "WIL", "CHA"];

// type = what counts as "the same kind of quest" for diminishing returns.
// skill = the skill the minutes count toward (Skills room).
export const QUESTS = [
  // Start of the day: always tiny, so the day begins with a win.
  { id: "start", type: "start", title: "Make your bed and drink a glass of water", stat: "VIT", minutes: 2, difficulty: "easy", kind: "start" },
  { id: "end", type: "health", title: "Get ready for bed", stat: "VIT", minutes: 10, difficulty: "easy", kind: "end" },

  // Main-quest pool. why = what it does for you (shown in the quest window); tiny = the 2-minute version
  // for days with no time or energy (it keeps the habit alive; the full quest still pays more).
  { id: "study45", skill: "study", type: "study", title: "Deep study: 45 minutes, phone in another room", stat: "INT", minutes: 45, difficulty: "normal",
    why: "Long, undistracted blocks are where real understanding happens. Just having your phone in another room measurably improves focus.", tiny: "10 minutes on the hardest page" },
  { id: "study25", skill: "study", type: "study", title: "Study sprint: 25 minutes on one section", stat: "INT", minutes: 25, difficulty: "normal",
    why: "One section and one timer. Starting is the hardest part, and 25 minutes is short enough to start right now.", tiny: "Read one page and write one question about it" },
  { id: "read20", skill: "reading", type: "reading", title: "Read 20 pages of a book", stat: "INT", minutes: 25, difficulty: "normal",
    why: "20 pages a day is about 25 books a year. A book holds years of someone's thinking; a feed holds seconds.", tiny: "Read 2 pages" },
  { id: "pushups", skill: "pushups", type: "workout", title: "Push-up session: 3 sets, the last one close to failure", stat: "STR", minutes: 20, difficulty: "hard",
    why: "Three hard sets is enough to make chest, shoulders and arms grow. Log your reps so you can see yourself beat last week.", tiny: "One set of push-ups" },
  { id: "pullups", skill: "pullups", type: "workout", title: "Pull-up session: 3 sets (negatives count)", stat: "STR", minutes: 20, difficulty: "hard",
    why: "Pulling builds your back and grip and balances all the pushing, for healthier shoulders and better posture. Slow negatives build the strength for your first reps.", tiny: "Hang from a bar for 20 seconds" },
  { id: "legs", skill: "pistol", type: "workout", title: "Legs at home: 4×20 squats, 3×10 lunges each side", stat: "STR", minutes: 15, difficulty: "normal",
    why: "Your legs hold about half your muscle. Strong legs make you faster, jump higher and protect your knees in every sport.", tiny: "20 squats" },
  { id: "run", skill: "running", type: "cardio", title: "Cardio: run or cycle 30 minutes", stat: "AGI", minutes: 30, difficulty: "normal",
    why: "Your heart is a muscle too. Regular cardio gives you more energy, better sleep and a clearer head for studying.", tiny: "10 minutes, any pace" },
  { id: "mobility", skill: "stretch", type: "mobility", title: "Mobility: 15 minutes of stretching", stat: "AGI", minutes: 15, difficulty: "easy",
    why: "Sitting all day tightens hips and hamstrings. A little every day keeps you moving freely and prevents the small injuries.", tiny: "One 2-minute stretch: deep squat hold" },
  { id: "water", skill: "water", type: "health", title: "Drink 2.5 L of water today", stat: "VIT", minutes: 5, difficulty: "easy",
    why: "Even being a bit dehydrated makes you tired and slower to think. Tap a glass each time; it adds up fast.", tiny: "Two glasses right now" },
  { id: "walk", skill: "walk", type: "walk", title: "Walk 30 minutes outside", stat: "VIT", minutes: 30, difficulty: "easy",
    why: "Daylight and movement reset your mood and your sleep rhythm. Many people do their best thinking on a walk.", tiny: "10 minutes around the block" },
  { id: "meditate", skill: "meditation", type: "mind", title: "Meditate 10 minutes", stat: "WIL", minutes: 10, difficulty: "hard",
    why: "Every time you notice your mind wandered and bring it back, you train the attention you need for everything else.", tiny: "10 slow breaths, eyes closed" },
  // Chosen the evening before (it starts the moment you wake), never handed out at random.
  { id: "nophone", skill: "nophone", type: "mind", title: "Phone-free first hour after waking", stat: "WIL", minutes: 15, difficulty: "hard", planned: true,
    why: "Whoever gets your first hour shapes your whole day. Start it with your own thoughts, not everyone else's.", tiny: "No phone until you're dressed" },
  { id: "japanese", skill: "japanese", type: "language", title: "Japanese: 15 minutes (next set in Learn)", stat: "INT", minutes: 15, difficulty: "normal",
    why: "A language is built from small daily reps. Fifteen minutes every day beats two hours once a week.", tiny: "Review 5 cards" },
  { id: "kindness", skill: "kindness", type: "social", title: "Do something kind nobody asked for, or give 3 real compliments", stat: "CHA", minutes: 10, difficulty: "normal",
    why: "Kindness makes the other person's day and, measurably, yours too. It's also how people learn they can count on you.", tiny: "Send someone a nice message" },
  { id: "callsomeone", skill: "reachout", type: "social", title: "Call or meet someone you care about", stat: "CHA", minutes: 20, difficulty: "normal",
    why: "Strong relationships are one of the best predictors of a long, happy life. They need time, not just texts.", tiny: "A 2-minute voice message" },
  { id: "tidyroom", skill: "tidy", type: "chores", title: "Reset your room: 10 minutes", stat: "VIT", minutes: 10, difficulty: "easy",
    why: "A clear room makes it easier to start things and harder to drift. Your environment does half the discipline for you.", tiny: "Clear one surface" },
  { id: "journal", skill: "journal", type: "journal", title: "Evening journal: 3 honest lines", stat: "WIL", minutes: 10, difficulty: "easy",
    why: "Writing down your day helps you see patterns, let things go and sleep better. Honest beats pretty.", tiny: "One line: the best part of today" },
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
  const usable = (q) => !q.side && !q.kind && !q.planned && !avoid.includes(q.id);
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
  const all = QUESTS.filter((q) => !q.side && !q.kind && !q.planned && !avoid.includes(q.id) && !(liked?.has(q.skill)));
  const r = tired?.size ? all.filter((q) => !hitsTired(q, tired)) : all;
  const from = r.length ? r : all;
  return from.length ? from[Math.floor(rand() * from.length)].id : null;
}
