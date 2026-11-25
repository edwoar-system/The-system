// The shop: spend coins on app time. Until app blocking exists, app time is a promise to yourself: use those apps
// only while a session runs. With app blocking, buying time unlocks the apps for real.
//
// A good day earns about 30 coins = about 30 minutes. Longer sessions cost less per minute, so saving up pays off.
export const APP_KINDS = ["social", "video", "games", "other"];
export const LENGTHS = [
  { minutes: 15, coins: 15 },
  { minutes: 30, coins: 28 },
  { minutes: 60, coins: 52 },
  { minutes: 120, coins: 96 },
  { minutes: 180, coins: 135 },
];
export const priceFor = (minutes) => LENGTHS.find((l) => l.minutes === minutes)?.coins ?? null;

// appTime = { kind, start, end } (ms). Buying while one runs adds to it.
export function activeAppTime(player, now = Date.now()) {
  const a = player?.appTime;
  return a && a.end > now ? a : null;
}

// Open troll quests lock the shop (later: your apps too).
export const shopLocked = (openTrolls) => openTrolls > 0;
