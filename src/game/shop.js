// The shop: spend coins on app time. Until app blocking exists, app time is a promise to yourself: use those apps
// only while a session runs. With app blocking, buying time unlocks the apps for real.
//
// One coin a minute, never cheaper for longer. Apps you shouldn't use too much (social media, video, games)
// get more expensive the more you use them in a day: the first hour 1 coin a minute, the second hour 2,
// after that 3. A good day of quests (about 30 coins) is about 30 minutes.
export const APP_KINDS = ["social", "video", "games", "other"];
export const CAPPED = ["social", "video", "games"]; // the ones that get expensive
export const LENGTHS = [15, 30, 60];
export const REFUND_SHARE = 0.5; // ending early gives back half of what the unused minutes cost

export const rateAt = (kind, usedMinutes) => (!CAPPED.includes(kind) ? 1 : usedMinutes < 60 ? 1 : usedMinutes < 120 ? 2 : 3);

// Minutes of each kind bought today (after refunds). appUse = { date, used: { kind: minutes } }.
export const usedToday = (player, kind, today) => (player?.appUse?.date === today ? player.appUse.used?.[kind] ?? 0 : 0);

// The price of `minutes` more of `kind`, given what you already used today.
export function priceFor(kind, minutes, used = 0) {
  let coins = 0;
  for (let i = 0; i < minutes; i++) coins += rateAt(kind, used + i);
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
