// Friends: what a friend can see of you. Your public card (public/{uid}) is built here from your
// player document, and only with what your privacy settings allow: hidden parts are left out, not just
// flagged, so they never leave your account.
import { levelFromXp, statValue } from "./economy";
import { STATS, todayKey } from "./quests";
import { LADDERS } from "./ladders";
import { skillView } from "./skills";

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
      .map((x) => { const v = skillView(x.id, x.entry); return { id: x.id, rank: v.rank, rusty: !!v.rusty }; })
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
export const TROLLS = [
  // easy
  { id: "squats", level: "easy", stat: "STR", minutes: 2, title: "20 squats" },
  { id: "pushups", level: "easy", stat: "STR", minutes: 2, title: "15 push-ups" },
  { id: "plank", level: "easy", stat: "STR", minutes: 2, title: "Plank for 60 seconds" },
  { id: "jacks", level: "easy", stat: "AGI", minutes: 2, title: "40 jumping jacks" },
  { id: "water", level: "easy", stat: "VIT", minutes: 1, title: "Drink a full glass of water" },
  { id: "bed", level: "easy", stat: "VIT", minutes: 2, title: "Make your bed properly (yes, again)" },
  { id: "grateful", level: "easy", stat: "WIL", minutes: 3, title: "Write down three things you're grateful for" },
  { id: "word", level: "easy", stat: "INT", minutes: 3, title: "Learn one new word and use it today" },
  { id: "compliment", level: "easy", stat: "CHA", minutes: 2, title: "Give someone a real compliment" },
  { id: "joke", level: "easy", stat: "CHA", minutes: 2, title: "Tell your family your worst joke" },
  // medium
  { id: "squats100", level: "medium", stat: "STR", minutes: 10, title: "100 squats, any sets" },
  { id: "pushups50", level: "medium", stat: "STR", minutes: 10, title: "50 push-ups, any sets" },
  { id: "burpees30", level: "medium", stat: "AGI", minutes: 8, title: "30 burpees" },
  { id: "run2", level: "medium", stat: "AGI", minutes: 15, title: "Run 2 km" },
  { id: "cold1", level: "medium", stat: "VIT", minutes: 3, title: "A full minute of cold at the end of your shower" },
  { id: "room", level: "medium", stat: "VIT", minutes: 20, title: "Clean your room until the floor and desk are clear" },
  { id: "nophone30", level: "medium", stat: "WIL", minutes: 30, title: "30 minutes without your phone" },
  { id: "read20", level: "medium", stat: "INT", minutes: 25, title: "Read 20 pages" },
  { id: "call", level: "medium", stat: "CHA", minutes: 10, title: "Call someone instead of texting them" },
  { id: "thanks", level: "medium", stat: "CHA", minutes: 5, title: "Thank someone who helped you this week, out loud" },
  // hard
  { id: "pushups150", level: "hard", stat: "STR", minutes: 25, title: "150 push-ups, any sets" },
  { id: "wallsit5", level: "hard", stat: "STR", minutes: 10, title: "5 minutes of wall sit in total" },
  { id: "run5", level: "hard", stat: "AGI", minutes: 30, title: "Run 5 km" },
  { id: "burpees100", level: "hard", stat: "AGI", minutes: 20, title: "100 burpees, any sets" },
  { id: "cold3", level: "hard", stat: "VIT", minutes: 5, title: "Three minutes of cold at the end of your shower" },
  { id: "nosugar", level: "hard", stat: "WIL", minutes: 10, title: "No sugar until tomorrow" },
  { id: "nophone2h", level: "hard", stat: "WIL", minutes: 120, title: "Two hours without your phone" },
  { id: "study60", level: "hard", stat: "INT", minutes: 60, title: "One focused hour of study, phone in another room" },
  { id: "letter", level: "hard", stat: "CHA", minutes: 30, title: "Write a real letter to someone you care about" },
];
export const trollById = Object.fromEntries(TROLLS.map((x) => [x.id, x]));
export const trollXp = (troll) => Math.max(3, Math.min(30, Math.round((troll?.minutes ?? 2) * 1.2)));

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
