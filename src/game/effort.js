// Effort beyond the quest itself: the time it takes to get ready (change clothes, go outside, travel to the gym,
// get your gear). It counts toward coins and EXP, so a 30-minute run pays more than 30 minutes of push-ups at home.
// Also: which quests happen outside (for the weather) and where each quest can be done (for your situation).

// Getting-ready minutes per skill.
export const SETUP = {
  running: 15, cycle: 15, zone2: 10, sprints: 15, walk: 5, swim: 30, rope: 5,
  gym: 20, boulder: 25, fingers: 0, kettlebell: 5,
  golf: 30, skate: 10, windsurf: 40, snowboard: 45, ski: 45, surf: 40,
  tennis: 20, football: 15, basketball: 15, boxing: 15, breakdance: 5,
  light: 5, coldshower: 5, cold: 10, cook: 10,
};
export const setupMinutes = (q) => (q?.setup != null ? q.setup : SETUP[q?.skill] ?? 0);

// Quests you do outside: bad weather makes them harder (swap them, or go anyway for a bonus).
export const OUTDOOR = ["running", "cycle", "zone2", "sprints", "walk", "golf", "skate", "windsurf", "snowboard", "ski", "surf", "tennis", "football", "light"];
export const isOutdoor = (q) => !!q && (OUTDOOR.includes(q.skill) || q.outdoor === true);

// Where a quest can be done. Situations: home, out, training, travelling, school.
//   anywhere: phone, book or your head (languages, reading, breathing, meditation, philosophy, people)
//   body: needs space to move (push-ups, stretching): home, out, training
//   outside: outdoor quests: out, home (you start from home)
//   place: needs a specific place (gym, pool, climbing gym, slopes): training only, or out
//   home: chores at home
const WHERE = {
  anywhere: ["home", "out", "training", "travelling", "school"],
  body: ["home", "out", "training"],
  outside: ["home", "out", "training"],
  place: ["out", "training"],
  home: ["home"],
};
const PLACE_SKILLS = ["gym", "boulder", "swim", "golf", "windsurf", "snowboard", "ski", "surf", "tennis", "basketball"];
const HOME_TYPES = ["chores", "duty"];
const ANYWHERE_TYPES = ["language", "reading", "study", "chess", "mind", "journal", "social", "philosophy"];
const ANYWHERE_SKILLS = ["water", "meditation", "breath", "philosophy", "gratitude", "craving", "silent", "nophone", "hardfirst", "docu", "memory", "morse", "writing", "listen", "thanks", "compliment", "reachout", "conversation", "kindness", "plan"];
export function whereKind(q) {
  if (!q) return "anywhere";
  if (q.where) return q.where;
  if (PLACE_SKILLS.includes(q.skill)) return "place";
  if (isOutdoor(q)) return "outside";
  if (HOME_TYPES.includes(q.type) || ["tidy", "helphome", "cook", "coldshower"].includes(q.skill)) return "home";
  if (ANYWHERE_TYPES.includes(q.type) || ANYWHERE_SKILLS.includes(q.skill)) return "anywhere";
  return "body";
}
export const fitsSituation = (q, situation) => !situation || WHERE[whereKind(q)].includes(situation);
