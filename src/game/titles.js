// Titles: earned by what you do, never bought. You pick one to show under your name (and to friends).
// Most count feats (players/{uid}.feats, counted from the day titles came in); a few read what you already have.
import { levelFromXp, statValue } from "./economy";
import { STATS } from "./quests";
import { PATHS, readIn } from "./paths";

const feat = (p, k) => p?.feats?.[k] ?? 0;
const bestStreak = (p) => Math.max(feat(p, "bestStreak"), p?.streak ?? 0);
const topRank = (p) => Math.max(0, ...Object.values(p?.skills ?? {}).map((s) => s?.rank ?? 0));
const level = (p) => levelFromXp(p?.xp ?? 0).level;
const lowestStat = (p) => Math.min(...STATS.map((s) => statValue(p?.statXp?.[s] ?? 0)));
const pagesRead = (p) => PATHS.reduce((n, path) => n + Object.keys(readIn(p, path.id)).length, 0);
const allPages = PATHS.reduce((n, path) => n + path.pages.length, 0);

// Sender titles: earned by how many of your troll quests friends finished. Each gives coins back (game/social.js).
export const TROLL_TITLES = [
  { id: "trickster", name: "Trickster", at: 10, back: 0.25 },
  { id: "menace", name: "Menace", at: 50, back: 0.5 },
  { id: "chaos", name: "Chaos Lord", at: 150, back: 0.75 },
];

// have(p): how far you are; need: where the title unlocks. Grouped for the list.
export const TITLES = [
  { id: "awakened", name: "The Awakened", how: "Clear your first quest.", group: "start", need: 1, have: (p) => Math.max(feat(p, "quests"), (p?.xp ?? 0) > 0 ? 1 : 0) },
  { id: "steady", name: "Steady", how: "Keep a 7-day streak.", group: "streak", need: 7, have: bestStreak },
  { id: "unbroken", name: "Unbroken", how: "Keep a 30-day streak.", group: "streak", need: 30, have: bestStreak },
  { id: "ironwill", name: "Iron Will", how: "Keep a 100-day streak.", group: "streak", need: 100, have: bestStreak },
  { id: "earlyriser", name: "Early Riser", how: "Do the full morning routine 30 times.", group: "habits", need: 30, have: (p) => feat(p, "mornings") },
  { id: "hunter", name: "Hunter", how: "Clear 100 quests.", group: "quests", need: 100, have: (p) => feat(p, "quests") },
  { id: "veteran", name: "Veteran", how: "Clear 500 quests.", group: "quests", need: 500, have: (p) => feat(p, "quests") },
  { id: "bossslayer", name: "Boss Slayer", how: "Clear 25 hard quests.", group: "quests", need: 25, have: (p) => feat(p, "hard") },
  { id: "wanderer", name: "Wanderer", how: "Clear 20 side quests.", group: "quests", need: 20, have: (p) => feat(p, "sides") },
  { id: "stormwalker", name: "Stormwalker", how: "Clear 10 outdoor quests in bad weather.", group: "quests", need: 10, have: (p) => feat(p, "rough") },
  { id: "treasure", name: "Treasure Hunter", how: "Find 25 loot drops.", group: "quests", need: 25, have: (p) => feat(p, "loot") },
  { id: "finisher", name: "Finisher", how: "Finish a whole program.", group: "skills", need: 1, have: (p) => feat(p, "programs") },
  { id: "specialist", name: "Specialist", how: "Reach rank B in any skill.", group: "skills", need: 4, have: topRank },
  { id: "master", name: "Master", how: "Reach rank S in any skill.", group: "skills", need: 6, have: topRank },
  { id: "balanced", name: "Balanced", how: "Get every stat to 10.", group: "skills", need: 10, have: lowestStat },
  { id: "philosopher", name: "Philosopher", how: "Read every page of the Codex and Kaizen paths.", group: "mind", need: allPages, have: pagesRead },
  { id: "rising", name: "Rising", how: "Reach level 10.", group: "level", need: 10, have: level },
  { id: "elite", name: "Elite", how: "Reach level 25.", group: "level", need: 25, have: level },
  { id: "monarch", name: "Monarch", how: "Reach level 50.", group: "level", need: 50, have: level },
  ...TROLL_TITLES.map((x) => ({ id: `troll-${x.id}`, name: x.name, how: `Friends finish ${x.at} of your troll quests.`, group: "friends", need: x.at, have: (p) => p?.trollsDone ?? 0 })),
];
export const titleById = Object.fromEntries(TITLES.map((x) => [x.id, x]));
export const TITLE_GROUPS = ["start", "streak", "habits", "quests", "skills", "mind", "level", "friends"];

// Test accounts (tester: true) have every title, to try them all.
export const hasTitle = (p, id) => p?.tester === true || (titleById[id] ? titleById[id].have(p) >= titleById[id].need : false);
export const earnedTitles = (p) => TITLES.filter((x) => hasTitle(p, x.id)).map((x) => x.id);
// The title you show: the one you picked (if you still have it), else none.
export const shownTitle = (p) => (p?.title && hasTitle(p, p.title) ? titleById[p.title] : null);
