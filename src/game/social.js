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

// Troll quests: a friend sends you one small challenge from this list (one per friend per day).
// They pay a little EXP only, never coins, so friends can't farm coins for each other.
export const TROLLS = [
  { id: "squats", stat: "STR", minutes: 2, title: "20 squats, right now" },
  { id: "pushups", stat: "STR", minutes: 2, title: "15 push-ups, right now" },
  { id: "plank", stat: "STR", minutes: 2, title: "Plank for 60 seconds" },
  { id: "wallsit", stat: "STR", minutes: 2, title: "Wall sit for 45 seconds" },
  { id: "burpees", stat: "AGI", minutes: 3, title: "10 burpees" },
  { id: "jacks", stat: "AGI", minutes: 2, title: "40 jumping jacks" },
  { id: "stairs", stat: "AGI", minutes: 5, title: "Walk up and down the stairs five times" },
  { id: "water", stat: "VIT", minutes: 1, title: "Drink a full glass of water now" },
  { id: "cold", stat: "VIT", minutes: 2, title: "End your next shower with 30 seconds of cold" },
  { id: "bed", stat: "VIT", minutes: 2, title: "Make your bed properly (yes, again)" },
  { id: "sugar", stat: "WIL", minutes: 5, title: "No sugar for the rest of the day" },
  { id: "nophone", stat: "WIL", minutes: 15, title: "15 minutes without your phone" },
  { id: "walk", stat: "WIL", minutes: 10, title: "A 10-minute walk, phone in your pocket" },
  { id: "read", stat: "INT", minutes: 10, title: "Read 5 pages of any book" },
  { id: "word", stat: "INT", minutes: 3, title: "Learn one new word and use it today" },
  { id: "fact", stat: "INT", minutes: 5, title: "Find one fact you didn't know and tell me" },
  { id: "grateful", stat: "WIL", minutes: 3, title: "Write down three things you're grateful for" },
  { id: "text", stat: "CHA", minutes: 3, title: "Text someone you haven't talked to in a while" },
  { id: "compliment", stat: "CHA", minutes: 2, title: "Give someone a real compliment" },
  { id: "joke", stat: "CHA", minutes: 2, title: "Tell your family your worst joke" },
  { id: "thanks", stat: "CHA", minutes: 2, title: "Thank someone who helped you this week" },
  { id: "dishes", stat: "VIT", minutes: 10, title: "Do the dishes without being asked" },
];
export const trollById = Object.fromEntries(TROLLS.map((x) => [x.id, x]));
export const trollXp = (troll) => Math.max(3, Math.min(10, Math.round((troll?.minutes ?? 2) * 1.5)));
