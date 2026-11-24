// Harder guild quests, unlocked by your rank in the skill. Tier I is the quest in guild.js (ranks F–D).
// Tier II = ranks C–B, tier III = rank A and up. [quest, minutes, difficulty]
// Coins come from minutes and difficulty only; a higher tier is the challenge, not a coin bonus.

export const TIER_RANKS = [0, 3, 5]; // the rank that unlocks tier I, II, III
export const tierForRank = (rank) => (rank >= 5 ? 2 : rank >= 3 ? 1 : 0);

export const TIERS = {
  // STR
  pushups: [["8 sets at 60% of your max, plus one set to failure", 25, "hard"], ["Weighted or deficit push-ups: 6 heavy sets, then archers", 30, "hard"]],
  pullups: [["6 sets at 60% of your max, plus chest-to-bar practice", 25, "hard"], ["Weighted pull-ups 5 × 5, then muscle-up or archer practice", 30, "hard"]],
  boulder: [["90 min: project one grade above your max", 90, "hard"], ["2 hours: limit projects and 5 sends at max minus one", 120, "hard"]],
  fingers: [["Repeaters on 20 mm: 3 sets of 6 × 7 s on, 3 s off", 20, "hard"], ["Weighted max hangs on 20 mm plus one-arm assisted hangs", 25, "hard"]],
  toes: [["Single-leg calf raises off a step, 4 sets, plus short-foot holds", 15, "normal"], ["Weighted single-leg calf raises and 60 s short-foot holds", 20, "normal"]],
  pistol: [["5 sets of free pistols per leg, slow negatives", 20, "hard"], ["Weighted pistols and shrimp squats, 5 sets per leg", 25, "hard"]],
  iso: [["4 rounds: 2 min plank, 90 s wall sit, 90 s dead hang", 20, "hard"], ["Long holds: 5 min plank, 4 min wall sit, one-arm hangs", 25, "hard"]],
  core: [["20 min: L-sits, hanging leg raises, ab-wheel rollouts", 20, "hard"], ["25 min: dragon flags, V-sit practice, tuck front lever", 25, "hard"]],
  grip: [["Heavy farmer carries, towel hangs and gripper sets", 15, "hard"], ["Max-weight carries, plate pinches and one-arm hangs", 20, "hard"]],
  dips: [["6 sets at 60% of your max, plus ring support holds", 20, "hard"], ["Weighted dips 5 × 5, then ring dips", 25, "hard"]],
  handstand: [["15 min free-handstand practice, 10 kick-ups to a hold", 15, "hard"], ["20 min: presses, straddle holds and one-arm shifts", 20, "hard"]],
  kettlebell: [["The full Simple & Sinister session, timed", 25, "hard"], ["S&S with your next bell up, plus presses", 30, "hard"]],
  // AGI
  running: [["Intervals: 6 × 800 m at 10K pace, or a 60-min long run", 50, "hard"], ["Tempo run 30 min at threshold, or a 90-min long run", 75, "hard"]],
  stretch: [["25 min: splits work, pancake and a deep bridge", 25, "normal"], ["35 min: full split session, both sides and middle", 35, "normal"]],
  skate: [["60 min: land a target trick 10 times", 60, "normal"], ["90 min: link a full line, learn one new trick", 90, "hard"]],
  golf: [["60 min: 30 balls with a plan, 30 short-game shots", 60, "normal"], ["Play 9 holes keeping score, then 30 min on your weakest shot", 120, "normal"]],
  rope: [["10 min of double-under sets, then 5 × 1 min fast", 20, "hard"], ["Triple-under practice, crossovers and a 10-min continuous set", 25, "hard"]],
  balance: [["15 min: eyes closed, balance board, single-leg squats", 15, "normal"], ["20 min of slackline or balance-board tricks", 20, "normal"]],
  sprints: [["8 × 60 m plus box jumps and broad jumps", 30, "hard"], ["Timed 30 m and 100 m sprints, plyometric circuit", 40, "hard"]],
  swim: [["1,500 m with 10 × 100 m intervals", 40, "hard"], ["2,500 m including drills and a timed 400 m", 60, "hard"]],
  cycle: [["75 min ride with 4 × 8 min at threshold", 75, "hard"], ["2-hour ride with hills or race-pace blocks", 120, "hard"]],
  footwork: [["15 min of fast ladder and cone drills, timed", 15, "hard"], ["20 min: Illinois course runs and reactive drills", 20, "hard"]],
  windsurf: [["60 minutes on the water: tacks, gybes and waterstarts", 60, "hard"], ["A 90-minute session in planing wind, gybes on both sides", 90, "hard"]],
  boxing: [["6 rounds: shadowboxing, bag work and combos", 30, "hard"], ["A class or 8 rounds with sparring or pad work", 45, "hard"]],
  breakdance: [["40 min: link toprock, footwork and a freeze into a round", 40, "normal"], ["60 min: power-move drills and two full rounds", 60, "hard"]],
  // VIT
  tidy: [["30 min: room plus one drawer or cupboard", 30, "easy"], ["45 min deep clean of one area", 45, "normal"]],
  sleep: [["In bed on time, phone outside the room", 15, "normal"], ["Bed and wake time within 30 min of your target", 20, "normal"]],
  water: [["2.5 L water, 5 portions of fruit and vegetables", 10, "normal"], ["2.5 L water, 5 portions, no sugary drinks all day", 15, "normal"]],
  walk: [["60 min outside, or 10,000 steps", 60, "easy"], ["A 2-hour walk or a hike", 120, "normal"]],
  cook: [["A new recipe from scratch", 45, "normal"], ["A meal for others, or a dish without a recipe", 60, "normal"]],
  light: [["15 min outside within an hour of waking, plus a short walk", 15, "easy"], ["20 min morning walk outside before screens", 20, "normal"]],
  coldshower: [["Finish with 2 min cold", 5, "hard"], ["3 min cold, calm breathing the whole time", 5, "hard"]],
  zone2: [["50 min at talking pace", 50, "normal"], ["90 min at talking pace", 90, "normal"]],
  posture: [["10 min mobility 3 times today, plus 2 min deep squat", 30, "easy"], ["Mobility breaks every 90 min of sitting, plus wall angels", 35, "normal"]],
  winddown: [["Screens off 60 min before bed", 45, "normal"], ["Screens off 90 min before bed, read or stretch", 60, "normal"]],
  // INT
  study: [["Two 45-min blocks with a 10-min break", 90, "normal"], ["Three 50-min deep-work blocks", 150, "hard"]],
  reading: [["45 min, plus 3 lines on what you read", 45, "normal"], ["90 min of a hard book, plus a short summary", 90, "normal"]],
  chess: [["30 puzzles plus one rapid game with a review", 45, "normal"], ["A classical game with a full review, plus endgame study", 75, "hard"]],
  japanese: [["Translate a short text and write 10 sentences", 40, "normal"], ["30 min listening without subtitles plus a written summary", 50, "hard"]],
  latin: [["Translate a full passage of an author with a dictionary", 40, "normal"], ["Read 60 lines of Caesar, Ovid or Virgil", 60, "hard"]],
  maths: [["20 problems at your level, check every answer", 40, "normal"], ["A past exam or olympiad set in time", 75, "hard"]],
  coding: [["60 min on your project: one feature finished", 60, "normal"], ["90 min: ship something, tests included", 90, "hard"]],
  writing: [["800 words", 45, "normal"], ["1,500 words, or rework a piece after feedback", 75, "hard"]],
  memory: [["Memorise 50 digits or a 30-item list", 25, "normal"], ["A full deck of cards, timed", 30, "hard"]],
  morse: [["15 min copy practice at your speed plus sending", 15, "normal"], ["20 min head copy at 20 wpm", 20, "hard"]],
  music: [["40 min: scales, a hard passage slow, then the full piece", 40, "normal"], ["60 min: performance run-through and recording", 60, "hard"]],
  crafts: [["60 min on one finished piece", 60, "normal"], ["90 min: a study from life, then the finished piece", 90, "normal"]],
  docu: [["A full lecture with a 1-page summary", 50, "normal"], ["Two lectures from a course, then explain it to someone", 90, "normal"]],
  // WIL
  meditation: [["20 min, no guidance", 20, "hard"], ["30 min sit, or a 45-min sit and walk", 30, "hard"]],
  nophone: [["First 2 hours after waking without the phone", 30, "hard"], ["A phone-free morning until noon", 45, "hard"]],
  journal: [["One page about today", 15, "normal"], ["One page plus a weekly review", 25, "normal"]],
  breath: [["15 min breathwork plus a BOLT test", 15, "normal"], ["20 min: slow nasal breathing and coherent breathing", 20, "normal"]],
  hardfirst: [["The avoided task first, 45 min", 45, "hard"], ["The avoided task first, finished completely", 60, "hard"]],
  silent: [["A silent half-day", 30, "hard"], ["A full silent day", 45, "hard"]],
  cold: [["3 min in cold water (10 °C or colder)", 5, "hard"], ["5 min in very cold water (5 °C or colder), never alone", 10, "hard"]],
  craving: [["Wait 60 min before giving in", 15, "normal"], ["Skip one craving for the whole day", 20, "hard"]],
  gratitude: [["5 specific things, one about yourself", 10, "easy"], ["A gratitude letter to someone", 20, "normal"]],
  // CHA
  reachout: [["Meet someone you haven't seen in a month", 45, "normal"], ["Reconnect with someone you haven't spoken to in a year", 45, "hard"]],
  kindness: [["Something kind for a stranger", 15, "normal"], ["Volunteer or help someone for an hour", 60, "normal"]],
  conversation: [["Talk to 2 new people today", 20, "hard"], ["Talk to 3 new people at one event", 30, "hard"]],
  compliment: [["Two specific compliments, one to someone you barely know", 10, "normal"], ["Tell someone's teacher or boss what they do well", 15, "normal"]],
  helphome: [["Take over a chore for the whole evening", 30, "normal"], ["Cook dinner for the household", 60, "normal"]],
  thanks: [["A handwritten thank-you note", 20, "normal"], ["Thank someone from years ago who helped you", 25, "normal"]],
  speaking: [["A 5-min talk to a friend, with feedback", 30, "hard"], ["A 10-min talk to a group, with questions", 45, "hard"]],
  plan: [["Plan an evening for 5+ people", 30, "normal"], ["Plan a day trip or a weekend for a group", 45, "normal"]],
  listen: [["A 30-min conversation without giving advice unasked", 30, "normal"], ["Ask 10 follow-up questions in one conversation", 30, "hard"]],
};

// Gym tiers change the plan inside the session.
export const GYM_TIER_BANDS = ["4 exercises × 3 sets.", "5 exercises × 4 sets, one top set close to your max.", "6 exercises: heavy top sets, then a back-off set each."];
