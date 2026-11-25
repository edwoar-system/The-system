import { GYM_TIER_BANDS, TIERS } from "./tiers";

// The guild: extra quests you request yourself. Stat -> skill -> quest.
// Content follows "The System — Quest catalog v0.1" (tier I, ranks F–D). Harder tiers live in tiers.js.

// [id, name, quest, what counts, minutes, difficulty, type]
const RAW = {
  STR: [
    ["gym", "Gym", "Pick a session and how long", "", 60, "hard", "gym", "gym"],
    ["pushups", "Push-ups", "5 sets of 50% of your max", "Full range, chest to a fist from the floor. 90 s rest between sets.", 20, "hard", "workout"],
    ["pullups", "Pull-ups", "5 sets, band-assisted or negatives", "Chin over the bar, arms straight at the bottom.", 20, "hard", "workout"],
    ["boulder", "Bouldering", "60 min: warm-up plus 3 problems at your limit", "Time on the wall, not time at the gym.", 60, "hard", "climb"],
    ["fingers", "Finger strength", "6 hangs of 10 s on a big edge", "Straight arms, no jumping on. 2 min rest.", 15, "hard", "climb"],
    ["toes", "Toe and foot strength", "10 min towel curls and toe raises", "Barefoot, slow and controlled.", 10, "easy", "mobility"],
    ["pistol", "Pistol squats", "5 sets of assisted pistols per leg", "Hold a door frame or sit down to a box.", 15, "hard", "workout"],
    ["iso", "Isometrics", "Wall sit, plank, dead hang: 3 rounds", "30–60 s per hold, no shaking out early.", 15, "normal", "workout"],
    ["core", "Core and abs", "15 min hollow hold, leg raises, side plank", "Slow reps, lower back on the floor.", 15, "normal", "workout"],
    ["grip", "Grip", "5 farmer carries or dead hangs", "Hold until your grip fails.", 10, "normal", "workout"],
    ["dips", "Dips", "5 sets of 50% of your max", "Shoulders below elbows at the bottom.", 15, "hard", "workout"],
    ["handstand", "Handstand", "10 min wall practice, 5 holds", "Stomach to the wall, body in a straight line.", 10, "normal", "skill"],
    ["kettlebell", "Kettlebell", "15 min swings and goblet squats", "The hips drive the swing, not the arms.", 15, "normal", "workout"],
  ],
  AGI: [
    ["running", "Running", "20–30 min easy, or 6 × 1 min fast", "Tracked in Strava or Apple Health.", 30, "normal", "cardio"],
    ["stretch", "Stretching", "15 min full-body routine", "Hold each stretch 30 s, both sides.", 15, "easy", "mobility"],
    ["skate", "Skateboarding", "30 min: practise one basic", "On the board, one basic at a time.", 30, "normal", "sport"],
    ["golf", "Golf", "30 min range, one club", "One club, one target, every shot on purpose.", 30, "normal", "sport"],
    ["rope", "Jump rope", "10 rounds of 1 min on, 30 s off", "Count rounds, not trips.", 15, "normal", "cardio"],
    ["balance", "Balance", "10 min single-leg and eyes-closed", "Both legs, equal time.", 10, "easy", "mobility"],
    ["sprints", "Sprints and jumps", "6 × 60 m sprints, full rest", "All-out effort, walk back.", 20, "hard", "cardio"],
    ["swim", "Swimming", "20 min or 500 m", "Time in the water, swimming.", 20, "normal", "cardio"],
    ["cycle", "Cycling", "45 min ride", "Tracked in Strava or Apple Health.", 45, "normal", "cardio"],
    ["footwork", "Footwork", "10 min ladder or shadow footwork", "Light on your toes the whole time.", 10, "normal", "sport"],
    ["boxing", "Boxing", "3 rounds of 3 min shadowboxing", "Hands up, move between combos.", 15, "hard", "sport"],
    ["windsurf", "Windsurfing", "30 min on the water, or 30 min dryland", "Dryland (out of season): balance board, core and grip.", 30, "normal", "sport"],
    ["breakdance", "Breakdance", "20 min toprock and one footwork move", "To music, keep moving.", 20, "normal", "sport"],
    ["snowboard", "Snowboarding", "One session on the slope, or 30 min dryland", "Dryland (no snow): squats, balance board, ollie practice on carpet.", 30, "normal", "sport"],
    ["ski", "Skiing", "One session on the slope, or 30 min dryland", "Dryland (no snow): wall sits, lateral jumps, single-leg balance.", 30, "normal", "sport"],
    ["surf", "Surfing", "A surf session, or 20 min pop-up and paddle drills", "Dry pop-ups count: 30 clean ones, chest to feet in one move.", 30, "normal", "sport"],
    ["tennis", "Tennis", "45 min hitting, or 20 min wall practice", "Rallies with a plan: one stroke at a time.", 45, "normal", "sport"],
    ["football", "Football", "30 min ball work, or a match", "Touches, passing against a wall, keepy-ups.", 30, "normal", "sport"],
    ["basketball", "Basketball", "30 min shooting and handles", "Count your makes; both hands for the handles.", 30, "normal", "sport"],
    ["yoga", "Yoga", "20 min flow", "Follow the breath; hold each pose 5 breaths.", 20, "easy", "mobility"],
    ["juggling", "Juggling", "15 min with 3 balls", "Count catches in a row; drops start a new count.", 15, "easy", "skill"],
  ],
  VIT: [
    ["tidy", "Tidy your room", "15 minutes", "Everything off the floor and the desk clear.", 15, "easy", "chores"],
    ["sleep", "Sleep", "In bed, phone away by your bedtime", "Phone out of reach by the time you set.", 10, "normal", "sleep"],
    ["water", "Water and food", "2.5 L water, vegetables with two meals", "Keep count as you go.", 5, "easy", "health"],
    ["walk", "Walk", "30 min outside", "Outside, at a normal pace.", 30, "easy", "walk"],
    ["cook", "Cook a meal", "One real meal from scratch", "You cook it yourself.", 30, "normal", "health"],
    ["light", "Morning light", "10 min outside after waking", "Within an hour of waking up.", 10, "easy", "health"],
    ["coldshower", "Cold shower", "Finish with 30–60 s cold", "Fully cold, calm breathing.", 5, "normal", "cold"],
    ["zone2", "Zone 2 cardio", "30 min at talking pace", "You can still hold a conversation.", 30, "normal", "cardio"],
    ["posture", "Posture break", "5 min mobility, 3 times today", "Every two hours of sitting.", 15, "easy", "mobility"],
    ["winddown", "Wind-down", "Screens off 30 min before bed", "Read or stretch instead.", 30, "normal", "sleep"],
  ],
  INT: [
    ["study", "Studying", "45 min block (or 18 questions)", "Phone sealed for the whole block.", 45, "normal", "study"],
    ["reading", "Reading", "20 min", "A book, not a screen feed.", 20, "normal", "reading"],
    ["chess", "Chess", "15 puzzles", "Solve, then check why the answer works.", 20, "normal", "chess"],
    ["japanese", "Japanese", "Learn the next 10 kana (Learn tab, Japanese)", "Read them, write them, then pass the quick test.", 15, "easy", "language"],
    ["latin", "Latin", "20 min: one passage or 15 words", "Translate it yourself first.", 20, "normal", "language"],
    ["spanish", "Spanish", "20 min: 15 words + 5 own sentences", "Say the sentences out loud; no copying.", 20, "normal", "language"],
    ["french", "French", "20 min: 15 words + 5 own sentences", "Say the sentences out loud; no copying.", 20, "normal", "language"],
    ["german", "German", "20 min: 15 words + 5 own sentences", "Say the sentences out loud; no copying.", 20, "normal", "language"],
    ["italian", "Italian", "20 min: 15 words + 5 own sentences", "Say the sentences out loud; no copying.", 20, "normal", "language"],
    ["portuguese", "Portuguese", "20 min: 15 words + 5 own sentences", "Say the sentences out loud; no copying.", 20, "normal", "language"],
    ["korean", "Korean", "20 min: Hangul or 15 words + 5 own sentences", "Write it in Hangul, not in letters.", 20, "normal", "language"],
    ["mandarin", "Mandarin Chinese", "20 min: tones, or 15 words + 5 own sentences", "Say every word with its tone, out loud.", 20, "normal", "language"],
    ["typing", "Typing", "10 min touch-typing practice", "Eyes on the screen, not the keys.", 10, "easy", "study"],
    ["cube", "Rubik's cube", "15 min: solves or one new algorithm", "Time your solves; drill one algorithm.", 15, "easy", "study"],
    ["maths", "Maths practice", "10 problems at your level", "Check every answer.", 20, "normal", "study"],
    ["coding", "Coding", "30 min building something", "Your own project, not a tutorial video.", 30, "normal", "create"],
    ["writing", "Writing", "300 words", "An essay idea, a story or a letter.", 20, "normal", "create"],
    ["memory", "Memory", "Learn a short list by heart", "Say it back without looking.", 15, "normal", "study"],
    ["morse", "Morse code", "10 min: learn 5 letters", "Decode a message at the end.", 10, "easy", "language"],
    ["music", "Music", "20 min instrument or theory", "Practise, don't just play what you know.", 20, "normal", "create"],
    ["crafts", "Crafts and drawing", "30 min making something", "With your hands, start to finish.", 30, "easy", "create"],
    ["docu", "Documentary or lecture", "One episode + 3 lines of notes", "Write down what you learned.", 30, "easy", "reading"],
  ],
  WIL: [
    ["meditation", "Meditation", "10 min, breath focus", "Sitting still with a timer.", 10, "hard", "mind"],
    ["philosophy", "Philosophy", "Pick a school, read the next part", "", 20, "normal", "philosophy", "philo"],
    ["nophone", "No-phone hour", "First hour after waking", "The phone stays away until the hour is over.", 15, "hard", "mind"],
    ["journal", "Journal", "3 lines about today", "Honest, not pretty.", 10, "easy", "journal"],
    ["breath", "Breathwork", "10 min box breathing", "4 in, 4 hold, 4 out, 4 hold.", 10, "normal", "mind"],
    ["hardfirst", "Hardest task first", "Do the task you avoid, first", "Before anything else today.", 20, "hard", "mind"],
    ["silent", "Silent hour", "One hour without music or talking", "No podcasts either.", 15, "normal", "mind"],
    ["cold", "Cold exposure", "2 min cold water, calm breathing", "Slow breaths the whole time.", 5, "hard", "cold"],
    ["craving", "Delay a craving", "Wait 30 min before giving in", "Start the timer when the craving starts.", 10, "normal", "mind"],
    ["gratitude", "Gratitude", "Write down 3 specific things", "Specific, not just \"my family\".", 5, "easy", "journal"],
  ],
  CHA: [
    ["reachout", "Reach out", "Call or meet someone, 20 min+", "A real conversation, not texting.", 20, "normal", "social"],
    ["kindness", "Kindness", "Something kind, unasked", "For someone else, without being asked.", 10, "normal", "social"],
    ["conversation", "Conversation", "Start a conversation with someone new", "At least a few minutes, face to face.", 10, "hard", "social"],
    ["compliment", "Compliment", "One honest, specific compliment", "Something real, said out loud.", 5, "easy", "social"],
    ["helphome", "Help at home", "A chore nobody asked for", "Done before anyone asks.", 15, "easy", "chores"],
    ["thanks", "Thank-you message", "A real thank-you to someone", "At least three sentences.", 10, "easy", "social"],
    ["speaking", "Public speaking", "Practise a 2-min talk out loud", "Out loud or recorded.", 15, "hard", "social"],
    ["plan", "Plan something", "Organise an activity with friends", "A date, a place and people invited.", 15, "normal", "social"],
    ["listen", "Listen", "A conversation where you mostly listen", "Ask, don't steer.", 15, "normal", "social"],
  ],
};

export const GUILD = Object.fromEntries(
  Object.entries(RAW).map(([stat, list]) => [
    stat,
    list.map(([id, name, quest, counts, minutes, difficulty, type, kind]) => ({ id, stat, name, quest, counts, minutes, difficulty, type, kind: kind ?? "simple" })),
  ])
);
export const skillById = Object.fromEntries(Object.values(GUILD).flat().map((s) => [s.id, s]));

export const GYM_SESSIONS = [
  { name: "Push day", plan: "Chest, shoulders, triceps: bench press or dips first." },
  { name: "Pull day", plan: "Back and biceps: rows or pull-ups first." },
  { name: "Leg day", plan: "Squats or deadlifts first, then lunges and calves." },
  { name: "Full body", plan: "One squat, one push, one pull, one hinge, then core." },
  { name: "Upper / lower", plan: "Alternate: today the next one in line." },
];
export const GYM_LENGTHS = [45, 60, 90];
export const GYM_BAND = "4 exercises × 3 sets.";
export const GYM_COUNTS = "Training time including warm-up, at least 4 exercises, no long phone breaks.";

// Philosophy reading paths: [title, source, intro, question].
export const PHILOSOPHY = [
  {
    id: "stoicism", name: "Stoicism", who: "Marcus Aurelius, Seneca, Epictetus",
    readings: [
      ["What is up to us", "Epictetus, Enchiridion 1", "Some things are in our control, most are not.", "What worried you today that was never up to you?"],
      ["Not things, but judgements", "Epictetus, Enchiridion 5", "We are upset by our opinions about events, not the events.", "Which event today did your opinion make worse?"],
      ["The morning reminder", "Marcus Aurelius, Meditations 2.1", "Expect difficult people, and don't let them make you one.", "Who will test you today, and how do you want to answer?"],
      ["Getting out of bed", "Marcus Aurelius, Meditations 5.1", "An emperor arguing with himself to get up in the morning.", "What are you getting up for?"],
      ["The inner retreat", "Marcus Aurelius, Meditations 4.3", "Calm is a place inside you.", "Where do you go when you need quiet?"],
      ["On saving time", "Seneca, Letters 1", "Time is the only thing that is truly ours.", "Where did your time leak today?"],
      ["The shortness of life", "Seneca, On the Shortness of Life 1–3", "Life is long enough if you use it.", "What are you postponing until \"later\"?"],
      ["Practising hardship", "Seneca, Letters 18", "Live a few days on very little, so you stop fearing it.", "Which comfort could you skip for one day?"],
    ],
  },
  {
    id: "taoism", name: "Taoism", who: "Tao Te Ching, Zhuangzi",
    readings: [
      ["The Way that can't be named", "Tao Te Ching, chapter 1", "The real Way can't be fully put into words.", "What do you understand that you can't explain?"],
      ["Be like water", "Tao Te Ching, chapter 8", "Water helps everything and fights nothing.", "Where could you be softer and still win?"],
      ["The use of emptiness", "Tao Te Ching, chapter 11", "A wheel works because of the empty hub.", "What space in your day should stay empty?"],
      ["Knowing yourself", "Tao Te Ching, chapter 33", "Knowing others is clever; knowing yourself is wise.", "What did you learn about yourself this week?"],
      ["The soft and the stiff", "Tao Te Ching, chapter 76", "What bends survives; what is rigid breaks.", "Where are you too rigid?"],
      ["Cook Ding", "Zhuangzi, chapter 3", "A cook whose knife never dulls because he follows the grain.", "What do you do so well it feels effortless?"],
      ["The butterfly dream", "Zhuangzi, chapter 2", "Am I a man dreaming of a butterfly, or the reverse?", "Which of your certainties might be a dream?"],
      ["The joy of fish", "Zhuangzi, chapter 17", "How do you know what the fish enjoy?", "How do you know what others feel?"],
    ],
  },
  {
    id: "absurdism", name: "Absurdism and existentialism", who: "Camus, Kierkegaard, Nietzsche, Sartre",
    readings: [
      ["The absurd", "Camus, The Myth of Sisyphus, first essay (your own copy)", "We want meaning; the world stays silent.", "When have you felt that gap?"],
      ["Sisyphus, happy", "Camus, The Myth of Sisyphus, final chapter (your own copy)", "The rock, the hill, and choosing the struggle.", "Which daily repeat could you choose instead of endure?"],
      ["A truth that is true for me", "Kierkegaard, Gilleleje journal, 1 August 1835", "A 22-year-old looking for the idea he can live for.", "What would yours be today?"],
      ["The heaviest weight", "Nietzsche, The Gay Science §341", "What if you had to live this exact life again, forever?", "Would you sign today's day again?"],
      ["The three metamorphoses", "Nietzsche, Thus Spoke Zarathustra", "Camel, lion, child.", "Which one are you right now?"],
      ["Existence before essence", "Sartre, Existentialism Is a Humanism (your own copy)", "You are what you do, not what you were born as.", "What did your actions say about you today?"],
      ["An invincible summer", "Camus, Return to Tipasa (your own copy)", "Finding warmth inside yourself in a hard season.", "What is your invincible summer?"],
    ],
  },
  {
    id: "buddhism", name: "Buddhism and Zen", who: "Dhammapada, the suttas, The Gateless Gate",
    readings: [
      ["Mind comes first", "Dhammapada, chapter 1", "What we think shapes what we become.", "Which thought shaped your day?"],
      ["The four noble truths", "The first sermon (Dhammacakkappavattana Sutta)", "Suffering, its cause, its end, and the path.", "What are you holding onto too tightly?"],
      ["Taming the mind", "Dhammapada, chapter 3", "The mind is restless like a fish on dry land.", "When did your mind run off today?"],
      ["Mindfulness of breathing", "Satipatthana Sutta, the breathing section", "Read it, then sit for 10 minutes.", "What did you notice?"],
      ["The raft", "Alagaddupama Sutta (MN 22)", "Teachings are a raft: use it to cross, then leave it.", "Which rule of yours has done its job?"],
      ["Wash your bowl", "The Gateless Gate, case 7", "Enlightenment is finishing breakfast and washing the bowl.", "Which small task could you do fully today?"],
      ["Mu", "The Gateless Gate, case 1", "A koan you can't answer with logic.", "Sit with it for 10 minutes. What happened?"],
    ],
  },
];
const schoolById = Object.fromEntries(PHILOSOPHY.map((p) => [p.id, p]));

// Quest ids: "g:<skill>[:<tier>]", "g:gym:<session>:<minutes>[:<tier>]", "g:philo:<school>:<reading index>". Tier 0–2.
export function guildQuest(id) {
  const parts = id.split(":");
  if (parts[0] !== "g") return null;
  if (parts[1] === "gym") {
    const s = GYM_SESSIONS[Number(parts[2])];
    const minutes = Number(parts[3]);
    const tier = Number(parts[4] ?? 0);
    if (!s || !minutes || !GYM_TIER_BANDS[tier]) return null;
    return { id, skill: "gym", session: Number(parts[2]), stat: "STR", type: "gym", difficulty: "hard", minutes, tier, title: `Gym: ${s.name}, ${minutes} min`, counts: `${GYM_TIER_BANDS[tier]} ${s.plan} ${GYM_COUNTS}` };
  }
  if (parts[1] === "philo") {
    const p = schoolById[parts[2]];
    const n = Number(parts[3]);
    const r = p?.readings[n];
    if (!r) return null;
    return { id, skill: "philosophy", school: p.id, reading: n, stat: "WIL", type: "philosophy", difficulty: "normal", minutes: 20, title: `${p.name}: ${r[0]}`, counts: r[1] };
  }
  const s = skillById[parts[1]];
  if (!s || s.kind !== "simple") return null;
  const tier = Number(parts[2] ?? 0);
  if (tier === 0) return { id, skill: s.id, stat: s.stat, type: s.type, difficulty: s.difficulty, minutes: s.minutes, tier, title: `${s.name}: ${s.quest}`, counts: s.counts };
  const tq = TIERS[s.id]?.[tier - 1];
  if (!tq) return null;
  return { id, skill: s.id, stat: s.stat, type: s.type, difficulty: tq[2], minutes: tq[1], tier, title: `${s.name}: ${tq[0]}`, counts: s.counts };
}

// Three suggestions: skills you haven't trained for the longest first, shuffled by the reroll seed.
// liked: skills from your interests come first.
// tiredSkill(id): true when the skill's main muscles are still tired; those go last.
export function suggestSkills(stat, lastDoneBySkill = {}, seed = 0, liked = null, tiredSkill = null) {
  let t = (seed + 1) * 2654435761 + stat.charCodeAt(0);
  const r = () => { t = (t + 0x6d2b79f5) | 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  return GUILD[stat]
    .map((s) => ({ s, k: (tiredSkill?.(s.id) ? "1" : "0") + (liked?.has(s.id) ? "0" : "1") + (lastDoneBySkill[s.id] ?? "") + String(r()).slice(1, 6) }))
    .sort((a, b) => (a.k < b.k ? -1 : 1))
    .slice(0, 3)
    .map((x) => x.s);
}
