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
export const SKIN_PRICE = 150;
export const EFFECT_PRICE = 100;
export const NAME_CHANGE_PRICE = 50; // the first change is free
export const swapPrice = (swapsToday) => (swapsToday <= 0 ? 0 : 10 * 2 ** (swapsToday - 1)); // free, 10, 20, 40...

// Skins: other colours for the System's frames, buttons and glow. Cosmetic only.
export const SKINS = {
  system: { name: "System blue", color: {} },
  shadow: { name: "Shadow", color: { frame: "#DCCBFF", accent: "#BBA3FF", silver: "#BBA3FF", blue: "#9A7BEA", glow: "#2A1452", line: "rgba(187,163,255,0.17)", hi: "#F1EAFF" } },
  frost: { name: "Frost", color: { frame: "#D6FBFF", accent: "#8FE9F5", silver: "#8FE9F5", blue: "#62CFE0", glow: "#073845", line: "rgba(143,233,245,0.17)", hi: "#EFFFFF" } },
  ember: { name: "Ember", color: { frame: "#FFE3C7", accent: "#FFB880", silver: "#FFB880", blue: "#F0965A", glow: "#47210A", line: "rgba(255,184,128,0.17)", hi: "#FFF4EA" } },
  jade: { name: "Jade", color: { frame: "#D3F6E4", accent: "#82E0B2", silver: "#82E0B2", blue: "#55C391", glow: "#0A3626", line: "rgba(130,224,178,0.17)", hi: "#EDFFF6" } },
  mono: { name: "Monochrome", color: { frame: "#F0F0F0", accent: "#D0D0D0", silver: "#D0D0D0", blue: "#B0B0B0", glow: "#23262C", line: "rgba(220,220,220,0.15)", hi: "#FFFFFF" } },
};
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
