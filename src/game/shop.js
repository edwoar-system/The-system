// The shop: spend coins on app time. Until app blocking exists, app time is a promise to yourself: use those apps
// only while a session runs. With app blocking, buying time unlocks the apps for real.
//
// One coin a minute, never cheaper for longer. Apps you shouldn't use too much (social media, video, games)
// get more expensive the more you use them in a day: the first hour 1 coin a minute, the second hour 2,
// after that 3. A good day of quests (about 30 coins) is about 30 minutes.
import { dayEndHour } from "./penalty";
import { isHard } from "./hard";

export const APP_KINDS = ["social", "video", "games", "other"];
export const CAPPED = ["social", "video", "games"]; // the ones that get expensive
export const LENGTHS = [15, 30, 60];
export const REFUND_SHARE = 0.5; // ending early gives back half of what the unused minutes cost

export const rateAt = (kind, usedMinutes) => (!CAPPED.includes(kind) ? 1 : usedMinutes < 60 ? 1 : usedMinutes < 120 ? 2 : 3);

// Minutes of each kind bought today (after refunds). appUse = { date, used: { kind: minutes } }.
export const usedToday = (player, kind, today) => (player?.appUse?.date === today ? player.appUse.used?.[kind] ?? 0 : 0);

// After your day ends (an hour before bed) every app minute costs extra: 1 coin more, 2 in Hard mode.
export function lateExtra(player, now = new Date()) {
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < dayEndHour(player?.profile) && h >= 4) return 0;
  return isHard(player, now.getTime()) ? 2 : 1;
}

// The price of `minutes` more of `kind`, given what you already used today. extra: lateExtra().
export function priceFor(kind, minutes, used = 0, extra = 0) {
  let coins = 0;
  for (let i = 0; i < minutes; i++) coins += rateAt(kind, used + i) + extra;
  return coins;
}

// appTime = { kind, start, end, minutes, paid } (ms, total minutes bought, total coins paid).
export function activeAppTime(player, now = Date.now()) {
  const a = player?.appTime;
  return a && a.end > now ? a : null;
}

// Ending early: unused minutes and half their cost back.
export function refundFor(appTime, now = Date.now()) {
  if (!appTime || appTime.end <= now) return { minutes: 0, coins: 0 };
  const minutes = Math.floor((appTime.end - now) / 60000);
  const perMin = (appTime.paid ?? 0) / Math.max(1, appTime.minutes ?? 1);
  return { minutes, coins: Math.floor(minutes * perMin * REFUND_SHARE) };
}

// ---- Other things to buy ----
export const SHIELD_PRICE = 40; // protects your streak for one missed day; you can hold one
export const MAX_SHIELDS = 1;
export const EFFECT_PRICE = 100;
export const NAME_CHANGE_PRICE = 50; // the first change is free
export const swapPrice = (swapsToday) => (swapsToday <= 0 ? 0 : 10 * 2 ** (swapsToday - 1)); // free, 10, 20, 40...

// Skins (themes): how the whole System looks. Cosmetic only. Common ones change the colours; rare and
// legendary ones are full themes: their own background, panels, frame shape and backdrop.
// shape: chamfer (two cut corners) · notch (all four cut) · bracket (square with corner marks) · double (two edges)
// backdrop: glow · embers · grid · stars · petals · runes · rays (drawn behind the top of each screen)
export const SKIN_PRICES = { common: 150, rare: 400, legendary: 1000 };
export const RARITIES = ["common", "rare", "legendary"];
export const SKINS = {
  system: { name: "System blue", rarity: "common", color: {} },
  shadow: { name: "Shadow", rarity: "common", color: { frame: "#DCCBFF", accent: "#BBA3FF", silver: "#BBA3FF", blue: "#9A7BEA", glow: "#2A1452", line: "rgba(187,163,255,0.17)", hi: "#F1EAFF" } },
  frost: { name: "Frost", rarity: "common", color: { frame: "#D6FBFF", accent: "#8FE9F5", silver: "#8FE9F5", blue: "#62CFE0", glow: "#073845", line: "rgba(143,233,245,0.17)", hi: "#EFFFFF" } },
  ember: { name: "Ember", rarity: "common", color: { frame: "#FFE3C7", accent: "#FFB880", silver: "#FFB880", blue: "#F0965A", glow: "#47210A", line: "rgba(255,184,128,0.17)", hi: "#FFF4EA" } },
  jade: { name: "Jade", rarity: "common", color: { frame: "#D3F6E4", accent: "#82E0B2", silver: "#82E0B2", blue: "#55C391", glow: "#0A3626", line: "rgba(130,224,178,0.17)", hi: "#EDFFF6" } },
  mono: { name: "Monochrome", rarity: "common", color: { frame: "#F0F0F0", accent: "#D0D0D0", silver: "#D0D0D0", blue: "#B0B0B0", glow: "#23262C", line: "rgba(220,220,220,0.15)", hi: "#FFFFFF" } },
  redgate: {
    name: "Red Gate", rarity: "rare", shape: "double", backdrop: "embers",
    blurb: "A dungeon break: dark red stone and sparks rising.",
    color: { bg: "#070102", surface: "#140406", panelTop: "#26090C", panelBottom: "#0C0203", btnTop: "#3A0F12", btnBottom: "#100304", frame: "#FFD3CC", accent: "#FF7A66", silver: "#FF7A66", blue: "#E04A3A", glow: "#5A0D0D", line: "rgba(255,122,102,0.18)", hi: "#FFF0EC", muted: "#C79A94", text: "#F6E6E3", spark: "#FFB36B" },
  },
  association: {
    name: "Hunter Association", rarity: "rare", shape: "bracket", backdrop: "grid",
    blurb: "Official issue: deep navy, gold seals and a clean grid.",
    color: { bg: "#02050C", surface: "#0A1222", panelTop: "#0E1A30", panelBottom: "#060B16", btnTop: "#1C2740", btnBottom: "#080E1A", frame: "#F7E7BC", accent: "#E8C46A", silver: "#E8C46A", blue: "#C49A3C", glow: "#1E2A4A", line: "rgba(232,196,106,0.16)", hi: "#FFF7E2", muted: "#A8A390", spark: "#E8C46A" },
  },
  abyss: {
    name: "Abyss", rarity: "rare", shape: "notch", backdrop: "stars",
    blurb: "The deep sea at night: teal light in the dark.",
    color: { bg: "#000607", surface: "#03161A", panelTop: "#05242A", panelBottom: "#010B0D", btnTop: "#0A3238", btnBottom: "#020E10", frame: "#CFFFF5", accent: "#5FE6CC", silver: "#5FE6CC", blue: "#2FB8A6", glow: "#053F44", line: "rgba(95,230,204,0.16)", hi: "#ECFFFB", muted: "#8DB5B0", text: "#E3F7F4", spark: "#A8FFF0" },
  },
  sakura: {
    name: "Night Sakura", rarity: "rare", shape: "notch", backdrop: "petals",
    blurb: "Plum dark with falling blossom.",
    color: { bg: "#08030A", surface: "#1A0A18", panelTop: "#2A0F25", panelBottom: "#0E040C", btnTop: "#3C1534", btnBottom: "#120510", frame: "#FFE0EC", accent: "#FF9EC6", silver: "#FF9EC6", blue: "#E06AA0", glow: "#4A0F34", line: "rgba(255,158,198,0.17)", hi: "#FFF2F7", muted: "#C49AB0", text: "#F7E8EF", spark: "#FFC2DA" },
  },
  monarch: {
    name: "Shadow Monarch", rarity: "legendary", shape: "double", backdrop: "runes",
    blurb: "Arise. Black as the void, violet fire and a summoning circle.",
    color: { bg: "#020005", surface: "#0E0618", panelTop: "#180A2B", panelBottom: "#06020C", btnTop: "#2A1248", btnBottom: "#0A0414", frame: "#E8DAFF", accent: "#A672FF", silver: "#A672FF", blue: "#7B45E8", glow: "#3A0E6E", line: "rgba(166,114,255,0.2)", hi: "#F5EEFF", muted: "#A89BC4", text: "#EEE7FA", purple: "#C9A2FF", spark: "#B98CFF" },
  },
  sovereign: {
    name: "Sovereign", rarity: "legendary", shape: "bracket", backdrop: "rays",
    blurb: "For an S-rank: white gold on black, light from above.",
    color: { bg: "#030302", surface: "#121008", panelTop: "#1E1A0E", panelBottom: "#080704", btnTop: "#2E2812", btnBottom: "#0C0A04", frame: "#FFF6D8", accent: "#F5D57A", silver: "#F5D57A", blue: "#D8B04A", glow: "#3E3210", line: "rgba(245,213,122,0.18)", hi: "#FFFBEA", muted: "#B5AC8E", text: "#F7F1DD", reward: "#FFE08A", spark: "#FFE9A8" },
  },
};
export const skinPrice = (id) => (id === "system" ? 0 : SKIN_PRICES[SKINS[id]?.rarity] ?? SKIN_PRICES.common);
export const SKIN_IDS = Object.keys(SKINS);

// Name effects: how your name looks on Status and to your friends.
export const NAME_EFFECTS = {
  none: { name: "Plain" },
  glow: { name: "Glow", shadow: "#6FA8EE", radius: 14 },
  shadow: { name: "Shadow", shadow: "#8A5CFF", radius: 16, color: "#E9DEFF" },
  frost: { name: "Frost", shadow: "#4FD8EE", radius: 12, color: "#E6FDFF" },
  flame: { name: "Flame", shadow: "#FF8A3D", radius: 14, color: "#FFF0E2" },
};
export const EFFECT_IDS = Object.keys(NAME_EFFECTS);
