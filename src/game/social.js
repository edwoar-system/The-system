// Friends: what a friend can see of you. Your public card (public/{uid}) is built here from your
// player document, and only with what your privacy settings allow: hidden parts are left out, not just
// flagged, so they never leave your account.
import { levelFromXp, statValue } from "./economy";
import { STATS, todayKey } from "./quests";
import { LADDERS } from "./ladders";
import { skillView } from "./skills";
import { DIFF_FACTOR, MAX_PUSHUPS, RANK_FACTOR, RUN_KM, difficultyOf, nice } from "./difficulty";
import { skillById } from "./guild";

export const PRIVACY_KEYS = ["stats", "skills", "streak", "today", "honesty"];
export const PRIVACY_DEFAULTS = { stats: true, skills: true, streak: true, today: true, honesty: false };
export const MAX_FRIENDS = 50;

export function privacySettings(player) {
  return { ...PRIVACY_DEFAULTS, ...(player?.privacy ?? {}) };
}

// A friend code from your uid: 6 letters and digits, no look-alikes (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function friendCode(uid, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < uid.length; i++) { h ^= uid.charCodeAt(i); h = Math.imul(h, 16777619); }
  let out = "";
  for (let i = 0; i < 6; i++) { out += ALPHABET[(h >>> 0) % ALPHABET.length]; h = Math.imul(h ^ (h >>> 13), 2246822507); }
  return out;
}
export const cleanCode = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

// streak and today come from lib/day (passed in, so this file stays free of Firebase).
export function publicCard(player, { streak = 0, mainsDone = 0, mainsOf = 0, code = null } = {}) {
  const p = privacySettings(player);
  const card = {
    name: player?.name ?? "Player",
    code,
    level: levelFromXp(player?.xp ?? 0).level,
    active: todayKey(),
    shown: p,
    title: trollTitle(player?.trollsDone ?? 0)?.name ?? null,
    nameEffect: player?.nameEffect && player.nameEffect !== "none" ? player.nameEffect : null,
  };
  if (p.stats) card.stats = Object.fromEntries(STATS.map((s) => [s, statValue(player?.statXp?.[s] ?? 0)]));
  if (p.skills) {
    card.skills = LADDERS
      .map((l) => ({ id: l.id, entry: player?.skills?.[l.id] }))
      .filter((x) => x.entry)
      .map((x) => { const v = skillView(x.id, x.entry); return { id: x.id, rank: v.rank, rusty: !!v.rusty, ...(skillById[x.id]?.custom ? { name: skillById[x.id].name } : {}) }; })
      .filter((x) => x.rank > 0 || x.rusty)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 12);
  }
  if (p.streak) card.streak = streak;
  if (p.today) card.today = { date: todayKey(), done: mainsDone, of: mainsOf };
  if (p.honesty) {
    const h = player?.honesty ?? {};
    card.honesty = { checked: h.checked ?? 0, cheated: h.cheated ?? 0 };
  }
  return card;
}

// A short signature so the card is only written when something a friend sees changed.
export const cardSignature = (card) => JSON.stringify({ ...card, active: card.active });

// "today", "yesterday", or "n days ago" for a friend's last active day.
export function activeAgo(dateKey, today = todayKey()) {
  if (!dateKey) return null;
  const d = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${dateKey}T12:00:00Z`)) / 86400000);
  return Math.max(0, d);
}

// Troll quests: a friend pays coins to send you a challenge. The more they pay, the harder it is.
// There's no time limit, but while one is open your apps stay blocked (the shop until app blocking exists).
// You get no coins for it (a little EXP). At most MAX_OPEN_TROLLS are open on you at once; the rest wait in line.
export const TROLL_LEVELS = { easy: 5, medium: 15, hard: 30 }; // coins the sender pays
export const MAX_OPEN_TROLLS = 3;
// Amounts fit the person who gets it: `scale` says how.
//   max:  a share of their max push-ups (from their push-up rank)
//   body: a base amount for a rank-C person, scaled by their push-up rank (general body strength)
//   run:  a share of a comfortable distance for their running rank (km)
//   time: minutes or seconds, scaled by their difficulty only
// Their difficulty setting (Easy … Extreme) multiplies it once more.
// Hard ones can always be proven: a photo is needed, and `place` ones also check you're at that kind of place.
export const TROLLS = [
  // easy
  { id: "squats", level: "easy", name: "Squats", stat: "STR", minutes: 2, title: "{n} squats", scale: { by: "body", base: 20 }, hint: "sized to their level" },
  { id: "pushups", level: "easy", name: "Push-ups", stat: "STR", minutes: 2, title: "{n} push-ups", scale: { by: "max", mult: 0.5 }, hint: "half their max push-ups" },
  { id: "plank", level: "easy", name: "Plank", stat: "STR", minutes: 2, title: "Plank for {n} seconds", scale: { by: "body", base: 60 }, hint: "sized to their level" },
  { id: "jacks", level: "easy", name: "Jumping jacks", stat: "AGI", minutes: 2, title: "{n} jumping jacks", scale: { by: "body", base: 40 }, hint: "sized to their level" },
  { id: "water", level: "easy", stat: "VIT", minutes: 1, title: "Drink a full glass of water" },
  { id: "bed", level: "easy", stat: "VIT", minutes: 2, title: "Make your bed properly (yes, again)" },
  { id: "grateful", level: "easy", stat: "WIL", minutes: 3, title: "Write down three things you're grateful for" },
  { id: "word", level: "easy", stat: "INT", minutes: 3, title: "Learn one new word and use it today" },
  { id: "compliment", level: "easy", stat: "CHA", minutes: 2, title: "Give someone a real compliment" },
  { id: "joke", level: "easy", stat: "CHA", minutes: 2, title: "Tell your family your worst joke" },
  // medium
  { id: "squats100", level: "medium", name: "Squats, any sets", stat: "STR", minutes: 10, title: "{n} squats, any sets", scale: { by: "body", base: 100 }, hint: "a lot, sized to their level" },
  { id: "pushups50", level: "medium", name: "Push-ups, any sets", stat: "STR", minutes: 10, title: "{n} push-ups, any sets", scale: { by: "max", mult: 1.5 }, hint: "1.5× their max push-ups" },
  { id: "burpees30", level: "medium", name: "Burpees", stat: "AGI", minutes: 8, title: "{n} burpees", scale: { by: "body", base: 30 }, hint: "sized to their level" },
  { id: "run2", level: "medium", name: "A run", stat: "AGI", minutes: 15, title: "Run {n} km", scale: { by: "run", mult: 0.5 }, hint: "an easy run for their level" },
  { id: "wallsit", level: "medium", name: "Wall sit", stat: "STR", minutes: 6, title: "{n} min of wall sit in total", scale: { by: "body", base: 4 }, hint: "sized to their level" },
  { id: "cold1", level: "medium", stat: "VIT", minutes: 3, title: "A full minute of cold at the end of your shower" },
  { id: "room", level: "medium", stat: "VIT", minutes: 20, title: "Clean your room until the floor and desk are clear" },
  { id: "nophone30", level: "medium", name: "No phone", stat: "WIL", minutes: 30, title: "{n} minutes without your phone", scale: { by: "time", base: 45 }, hint: "about 45 minutes" },
  { id: "nosugar", level: "medium", stat: "WIL", minutes: 10, title: "No sugar until tomorrow" },
  { id: "read20", level: "medium", name: "Reading", stat: "INT", minutes: 25, title: "Read {n} pages", scale: { by: "time", base: 20 }, hint: "about 20 pages" },
  { id: "call", level: "medium", stat: "CHA", minutes: 10, title: "Call someone instead of texting them" },
  { id: "thanks", level: "medium", stat: "CHA", minutes: 5, title: "Thank someone who helped you this week, out loud" },
  // hard: always provable (photo), some also at a place (location)
  { id: "run5", level: "hard", name: "A run", stat: "AGI", minutes: 30, title: "Run {n} km", scale: { by: "run", mult: 1 }, hint: "a real run for their level", proof: "Screenshot of the run (Strava, Apple Health, your watch)" },
  { id: "gym45", level: "hard", stat: "STR", minutes: 45, title: "Train 45 minutes at a gym", place: "gym", proof: "A photo at the gym" },
  { id: "climb", level: "hard", stat: "STR", minutes: 60, title: "An hour of climbing or bouldering", place: "climbing", proof: "A photo at the wall" },
  { id: "swim", level: "hard", name: "Swimming", stat: "AGI", minutes: 30, title: "Swim {n} lengths", scale: { by: "body", base: 30 }, hint: "lengths, sized to their level", place: "pool", proof: "A photo at the pool" },
  { id: "parkpush", level: "hard", name: "Push-ups in a park", stat: "STR", minutes: 20, title: "{n} push-ups in a park", scale: { by: "max", mult: 2 }, hint: "2× their max", place: "park", proof: "A photo in the park" },
  { id: "library", level: "hard", stat: "INT", minutes: 60, title: "Study 60 minutes in a library", place: "library", proof: "A photo of your books or notes there" },
  { id: "steps", level: "hard", name: "Steps", stat: "VIT", minutes: 90, title: "Walk {n} steps today", scale: { by: "time", base: 12000 }, hint: "about 12,000", proof: "Screenshot of your step count" },
  { id: "cleanall", level: "hard", stat: "VIT", minutes: 45, title: "Clean your whole room, closet included", proof: "A photo of the clean room" },
  { id: "cook", level: "hard", stat: "VIT", minutes: 60, title: "Cook a full meal for the people you live with", proof: "A photo of the meal on the table" },
  { id: "letter", level: "hard", stat: "CHA", minutes: 30, title: "Write a real letter to someone you care about", proof: "A photo of the letter (you can cover the words)" },
  // Old ones, still open on some players from before proof: they can be finished without proof, but not sent anymore.
  { id: "pushups150", level: "hard", legacy: true, stat: "STR", minutes: 25, title: "150 push-ups, any sets" },
  { id: "wallsit5", level: "hard", legacy: true, stat: "STR", minutes: 10, title: "5 minutes of wall sit in total" },
  { id: "burpees100", level: "hard", legacy: true, stat: "AGI", minutes: 20, title: "100 burpees, any sets" },
  { id: "cold3", level: "hard", legacy: true, stat: "VIT", minutes: 5, title: "Three minutes of cold at the end of your shower" },
  { id: "nophone2h", level: "hard", legacy: true, stat: "WIL", minutes: 120, title: "Two hours without your phone" },
  { id: "study60", level: "hard", legacy: true, stat: "INT", minutes: 60, title: "One focused hour of study, phone in another room" },
];
export const trollById = Object.fromEntries(TROLLS.map((x) => [x.id, x]));
export const trollXp = (troll) => Math.max(3, Math.min(30, Math.round((troll?.minutes ?? 2) * 1.2)));

// The amount for this person: from their rank in the skill and their difficulty setting.
export function trollAmount(x, player) {
  if (!x?.scale) return null;
  const f = DIFF_FACTOR[difficultyOf(player)];
  const rankOf = (id) => player?.skills?.[id]?.rank ?? 0;
  const { by, base, mult } = x.scale;
  if (by === "max") return nice(MAX_PUSHUPS[rankOf("pushups")] * mult * f);
  if (by === "run") return Math.max(1, Math.round(RUN_KM[rankOf("running")] * mult * f * 2) / 2);
  if (by === "body") return nice(base * RANK_FACTOR[rankOf("pushups")] * f);
  return nice(base * f);
}
// The title as the receiver sees it ("15 push-ups"), or with a hint for the sender ("Push-ups: half their max").
const fmt = (n) => (n >= 1000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : String(n));
export const trollTitleFor = (x, player) => (x?.scale ? x.title.replace("{n}", fmt(trollAmount(x, player))) : x?.title ?? "");
export const trollTitleForSender = (x) => (x?.scale ? `${x.name} (${x.hint})` : x?.title ?? "");
export const trollNeedsProof = (x) => x?.level === "hard" && !x.legacy;

// Sender titles: earned by how many of your troll quests friends finished. Each gives coins back.
export const TROLL_TITLES = [
  { id: "trickster", name: "Trickster", at: 10, back: 0.25 },
  { id: "menace", name: "Menace", at: 50, back: 0.5 },
  { id: "chaos", name: "Chaos Lord", at: 150, back: 0.75 },
];
export function trollTitle(done = 0) {
  return [...TROLL_TITLES].reverse().find((x) => done >= x.at) ?? null;
}
export const nextTrollTitle = (done = 0) => TROLL_TITLES.find((x) => done < x.at) ?? null;

// Your open troll quests in order: the first MAX_OPEN_TROLLS are active, the rest wait.
export function trollQueue(list = []) {
  const open = list.filter((x) => x.status !== "done").sort((a, b) => (a.atMs ?? 0) - (b.atMs ?? 0));
  return { active: open.slice(0, MAX_OPEN_TROLLS), waiting: open.slice(MAX_OPEN_TROLLS) };
}
