// Loot drops: now and then a quest clear drops something extra (a variable reward, Hooked / Octalysis).
// Most rewards stay predictable (coins and EXP for the quest); loot is the surprise on top.
// The roll is seeded by player, day and quest, so a retried save gives the same drop.
import { MAX_SHIELDS } from "./shop";

export const LOOT_PER_DAY = 3; // at most this many drops a day, so they stay special
const CHANCE = { easy: 0.08, normal: 0.12, hard: 0.18 }; // per quest clear, by difficulty

// rarity → what it can be. weight = share within a drop.
export const RARITIES = [
  { id: "common", weight: 60 },
  { id: "rare", weight: 28 },
  { id: "epic", weight: 10 },
  { id: "legendary", weight: 2 },
];

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seedText) {
  let t = hash(seedText);
  return () => { t = (t + 0x6d2b79f5) | 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}

// What drops for this clear, or null.
// q: the quest ({ difficulty }), coins/xp: what the quest paid, dropsToday: drops so far today,
// shields: streak shields held, slot: "main" | "guild" | "side" | "duty" | "trial"…
export function rollLoot({ seed, q, coins = 0, xp = 0, dropsToday = 0, shields = 0, slot }) {
  if (slot === "trial" || dropsToday >= LOOT_PER_DAY) return null;
  const r = rng(seed);
  if (r() >= (CHANCE[q?.difficulty] ?? CHANCE.normal)) return null;
  let roll = r() * RARITIES.reduce((a, x) => a + x.weight, 0);
  const rarity = RARITIES.find((x) => (roll -= x.weight) < 0)?.id ?? "common";
  const base = Math.max(10, coins);
  if (rarity === "common") return { rarity, kind: "pouch", coins: Math.round(base * (0.5 + r() * 0.5)) + 5, xp: 0 };
  if (rarity === "rare") return { rarity, kind: "crystal", coins: 0, xp: Math.max(15, Math.round(xp * (0.5 + r() * 0.5))) };
  if (rarity === "epic") {
    // A shield if you have room for one; otherwise a chest worth about as much.
    return shields < MAX_SHIELDS ? { rarity, kind: "shield", coins: 0, xp: 0, shield: 1 } : { rarity, kind: "chest", coins: 40 + Math.round(base), xp: 0 };
  }
  return { rarity, kind: "gift", coins: 100, xp: Math.max(50, xp * 2) };
}
