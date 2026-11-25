// Programs: structured quests that build week by week. Each session is one of your main quests on the days
// it's due. A missed session waits: the program only moves on when you do it.
// You can follow up to MAX_PROGRAMS at once, and make your own from a simple formula.

export const MAX_PROGRAMS = 2;
export const PROGRAM_DONE_BONUS = 25; // coins when you finish a whole program

// A session: { title, detail, minutes, skill } (skill = the skill it trains, for ranks and muscles).
const strengthSessions = () => {
  const weeks = [
    { push: "Push-ups 4×10", pull: "Australian rows 4×10", legs: "Squats 4×15", core: "Hollow hold 3×20 s", skill: "Planche lean 4×10 s, tuck front lever 4×5 s" },
    { push: "Push-ups 4×12", pull: "Negative pull-ups 4×4 (5 s down)", legs: "Split squats 3×10 each", core: "Hanging knee raises 3×10", skill: "Planche lean 4×15 s, tuck front lever 4×7 s" },
    { push: "Diamond push-ups 4×8", pull: "Pull-ups 4×5", legs: "Bulgarian split squats 3×8 each", core: "L-sit tuck 4×10 s", skill: "Pseudo planche push-ups 3×6, tuck front lever 4×10 s" },
    { push: "Diamond push-ups 4×10", pull: "Pull-ups 4×6", legs: "Assisted pistol squats 3×5 each", core: "Hanging leg raises 3×8", skill: "Tuck planche 5×5 s, tuck front lever 5×10 s" },
    { push: "Pseudo planche push-ups 4×8", pull: "Pull-ups 5×6", legs: "Pistol squat negatives 3×5 each", core: "L-sit 4×10 s", skill: "Tuck planche 5×8 s, advanced tuck front lever 4×5 s" },
    { push: "Archer push-ups 4×5 each", pull: "Archer pull-up negatives 4×3 each", legs: "Pistol squats 3×3 each", core: "Dragon flag negatives 3×4", skill: "Tuck planche 5×10 s, advanced tuck front lever 5×6 s" },
  ];
  const out = [];
  weeks.forEach((w, i) => {
    out.push({ title: `Push and core (week ${i + 1})`, detail: `${w.push}, then ${w.core}. 90 s rest between sets.`, minutes: 25, skill: "pushups" });
    out.push({ title: `Pull and legs (week ${i + 1})`, detail: `${w.pull}, then ${w.legs}. 90 s rest between sets.`, minutes: 30, skill: "pullups" });
    out.push({ title: `Skills (week ${i + 1})`, detail: `${w.skill}. Rest 2 min between holds; stop before your form breaks.`, minutes: 25, skill: "handstand" });
  });
  return out;
};

const meditationSessions = () => {
  const weeks = [
    { min: 5, how: "Breath: count each out-breath from 1 to 10, then start again. Lost count? Back to 1, no judging." },
    { min: 10, how: "Body scan: move your attention slowly from your toes to your head. Notice, don't change." },
    { min: 15, how: "Noting: when something pulls you away, label it softly (\"thinking\", \"hearing\", \"itching\") and come back to the breath." },
    { min: 20, how: "Open awareness: don't focus on anything. Let sounds, thoughts and feelings come and go." },
  ];
  return weeks.flatMap((w, i) => Array.from({ length: 7 }, (_, d) => ({
    title: `Meditate ${w.min} min (week ${i + 1}, day ${d + 1})`, detail: w.how, minutes: w.min, skill: "meditation",
  })));
};

const stretchSessions = () => {
  const focus = [
    ["Hips", "Pigeon pose, frog stretch, deep squat hold"],
    ["Hamstrings", "Standing forward fold, seated pike, single-leg stretch"],
    ["Shoulders", "Doorway chest stretch, thread the needle, wall slides"],
    ["Splits", "Low lunge, half splits, side lunge holds"],
    ["Full body", "Cat-cow, world's greatest stretch, child's pose"],
  ];
  return Array.from({ length: 30 }, (_, i) => {
    const [area, moves] = focus[i % focus.length];
    const min = 10 + Math.floor(i / 10) * 5;
    const hold = 30 + Math.floor(i / 10) * 15;
    return { title: `Stretch: ${area.toLowerCase()} (day ${i + 1})`, detail: `${moves}. Hold each ${hold} s, both sides, breathe out into it. Never stretch into pain.`, minutes: min, skill: "stretch" };
  });
};

const snowboardSessions = () => {
  const weeks = [
    { legs: "Squats 3×15, wall sit 3×45 s", balance: "Single-leg stand 3×45 s each, eyes closed for the last 10 s", jump: "Squat jumps 3×8, soft landings" },
    { legs: "Jump squats 3×10, lateral lunges 3×10 each", balance: "Balance board or a pillow: 4×45 s in snowboard stance", jump: "180° jumps 3×6 each way, land in stance" },
    { legs: "Bulgarian split squats 3×10 each, wall sit 3×60 s", balance: "Single-leg squats on a pillow 3×8 each", jump: "Box or stair jumps 4×6, ollie pops on the spot 3×10" },
    { legs: "Skater jumps 4×12, squat holds 3×60 s", balance: "Balance board with knee bends 4×60 s", jump: "360° jump attempts 3×4 each way, tuck jumps 3×8" },
    { legs: "Pistol squat practice 3×5 each, jump squats 4×10", balance: "Board stance on the balance board, rotate upper body 4×60 s", jump: "Ollie to 180 3×6, butter balance (nose and tail) 3×30 s" },
  ];
  const out = [];
  weeks.forEach((w, i) => {
    out.push({ title: `Snowboard legs (week ${i + 1})`, detail: `${w.legs}. Then core: Russian twists 3×20, side plank 3×30 s each.`, minutes: 25, skill: "pistol" });
    out.push({ title: `Snowboard balance (week ${i + 1})`, detail: w.balance, minutes: 15, skill: "balance" });
    out.push({ title: `Snowboard jumps and tricks (week ${i + 1})`, detail: `${w.jump}. Warm up first; land soft, knees over toes.`, minutes: 20, skill: "balance" });
  });
  return out;
};

export const PROGRAMS = {
  strength: { name: "Calisthenics strength", stat: "STR", perWeek: 3, weeks: 6, sub: "Push, pull, legs, core and planche and front lever basics. Harder every week.", sessions: strengthSessions() },
  meditation: { name: "Meditation, 5 to 20 minutes", stat: "WIL", perWeek: 7, weeks: 4, sub: "A new technique every week: breath, body scan, noting, open awareness.", sessions: meditationSessions() },
  stretch: { name: "30 days of mobility", stat: "AGI", perWeek: 7, weeks: 5, sub: "Hips, hamstrings, shoulders, splits. Longer holds every 10 days.", sessions: stretchSessions() },
  snowboard: { name: "Snowboard prep", stat: "AGI", perWeek: 3, weeks: 5, sub: "Legs, balance, jumps and trick drills on land, before the season.", sessions: snowboardSessions() },
};
export const PROGRAM_IDS = Object.keys(PROGRAMS);

// ---- Your own program: the formula ----
// From a start to a goal in a number of weeks, a few times a week. Each session is a bit more than the last
// (the steps are even, rounded to something sensible), so the last session is your goal.
export const UNITS = { min: { step: 1, perMin: 1 }, reps: { step: 1, perMin: 5 }, km: { step: 0.5, perMin: 1 / 6 }, pages: { step: 1, perMin: 1 } };
export function customSessions(c) {
  const total = Math.max(2, Math.min(84, (c.perWeek ?? 3) * (c.weeks ?? 4)));
  const u = UNITS[c.unit] ?? UNITS.min;
  return Array.from({ length: total }, (_, i) => {
    const raw = c.start + ((c.goal - c.start) * i) / (total - 1);
    const amount = Math.max(u.step, Math.round(raw / u.step) * u.step);
    const minutes = Math.max(5, Math.min(180, Math.round(amount / u.perMin)));
    return { title: `${c.name}: ${amount} ${c.unitLabel ?? c.unit}`, detail: c.how || null, minutes, skill: c.skill ?? null, amount };
  });
}

// Program by id: built in ones, or yours ("my...").
export function programById(id, player) {
  if (PROGRAMS[id]) return PROGRAMS[id];
  const c = (player?.customPrograms ?? []).find((x) => x.id === id);
  return c ? { name: c.name, stat: c.stat, perWeek: c.perWeek, weeks: c.weeks, sub: null, sessions: customSessions(c), custom: true } : null;
}

// programs on the player: { [id]: { started, done, lastDone, week: { n, count } } } (done = sessions finished).
const weekKey = (dateKey) => { const d = new Date(`${dateKey}T12:00:00`); const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return mon.toISOString().slice(0, 10); };

// Sessions due today: one per active program, unless done today, finished, or this week's sessions are done.
export function dueSessions(player, dateKey) {
  return Object.entries(player?.programs ?? {}).map(([id, st]) => {
    const p = programById(id, player);
    if (!p || st.paused) return null;
    if (st.done >= p.sessions.length) return null;
    if (st.lastDone === dateKey) return null;
    const thisWeek = st.week?.key === weekKey(dateKey) ? st.week.count : 0;
    if (thisWeek >= p.perWeek) return null;
    return `p:${id}:${st.done}`;
  }).filter(Boolean);
}
export { weekKey };

// A program session as a quest: "p:<program>:<session index>".
export function programQuest(id, player) {
  const [, pid, n] = id.split(":");
  const p = programById(pid, player);
  const s = p?.sessions?.[Number(n)];
  if (!s) return null;
  return {
    id, skill: s.skill, stat: p.stat, type: "program", difficulty: "normal", minutes: s.minutes,
    title: s.title, counts: s.detail, program: pid, session: Number(n), of: p.sessions.length,
  };
}
