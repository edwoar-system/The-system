// The morning: small wins to start the day (pick your own in Settings), one optional challenge that changes
// every day, and the morning check-in (how you slept, what today is, whether you have time this morning).
import { todayKey } from "./quests";

// What you can put in your morning. water: counts as glasses toward your water quest.
export const MORNING_ITEMS = [
  { id: "bed", minutes: 1 },
  { id: "water", minutes: 1, water: 2 },
  { id: "stretch", minutes: 5, skill: "stretch" },
  { id: "light", minutes: 2 },
  { id: "pushups10", minutes: 2, skill: "pushups" },
  { id: "breathe", minutes: 2, skill: "breath" },
  { id: "coldface", minutes: 1 },
  { id: "plan", minutes: 3 },
  { id: "read1", minutes: 3, skill: "reading" },
  { id: "tidy", minutes: 3 },
];
export const morningById = Object.fromEntries(MORNING_ITEMS.map((x) => [x.id, x]));
export const MORNING_DEFAULT = ["bed", "water", "stretch"];
export const MORNING_MAX = 5;

// The daily challenge: small, a bit outside your comfort zone, different every day.
export const CHALLENGES = ["coldEnd", "noPhoneDressed", "squats20", "grateful", "wallsit", "plank60", "screenFree", "compliment", "stairs", "learnWord", "sunWalk", "noSugar"];
export const CHALLENGE_COINS = 8;
export const CHALLENGE_XP = 12;

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const challengeOf = (date = todayKey(), uid = "") => CHALLENGES[hash(`${uid}:${date}:challenge`) % CHALLENGES.length];

// Your morning items, as set in Settings (old players: make bed + water).
export const morningItems = (player) => {
  const list = (player?.morning?.items ?? MORNING_DEFAULT).filter((id) => morningById[id]);
  return list.length ? list : ["bed"];
};
export const challengeOn = (player) => player?.morning?.challenge !== false;

// Which items today, after the check-in: "all" (every item + challenge), "quick" (just the first one), "none".
export function morningToday(player, day) {
  const items = morningItems(player);
  const time = day?.checkin?.time ?? "all";
  if (time === "none") return { items: [], challenge: false };
  if (time === "quick") return { items: items.slice(0, 1), challenge: false };
  return { items, challenge: challengeOn(player) };
}

// Show the check-in: not done today, in the morning (before noon, or up to 5 h after you wake).
export function wantsCheckin(player, day, now = new Date()) {
  if (!day || day.checkin) return false;
  if (player?.morning?.checkin === false) return false;
  const h = now.getHours() + now.getMinutes() / 60;
  const wake = player?.profile?.wake ?? 7;
  return h >= 4 && h < Math.max(12, wake + 5);
}

// Hours of sleep to bed time, for the sleep log: woke at `wake`, slept `hours`.
export const bedFrom = (wake, hours) => ((wake - hours) % 24 + 24) % 24;
