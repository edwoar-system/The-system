// How the System talks to you in notifications (Settings → Notifications → Voice).
// players/{uid}.voice = { picked: ["coach:3", ...] (lines from the library in i18n notify.library), lines: [your own] }.
// Nothing picked = a quote from your philosophy schools.
export const VOICE_MAX_LINES = 30;

// Older choice ({ tone: "coach" }) counts as every line of that kind.
export function pickedIds(player, library) {
  const v = player?.voice ?? {};
  if (Array.isArray(v.picked)) return v.picked;
  if (v.tone && library?.[v.tone]) return library[v.tone].map((_, i) => `${v.tone}:${i}`);
  return [];
}
export const ownLines = (player) => (player?.voice?.lines ?? []).filter((x) => typeof x === "string" && x.trim());

// All lines you'd get: picked ones from the library plus your own.
export function myLines(player, library) {
  const fromLib = pickedIds(player, library).map((id) => { const [cat, i] = id.split(":"); return library?.[cat]?.[Number(i)]; }).filter(Boolean);
  return [...fromLib, ...ownLines(player)];
}

// A fixed pick for this day and slot, so the plan doesn't change every time it's rebuilt.
export function pickLine(list, key, n) {
  if (!list?.length) return null;
  let h = 7;
  for (const c of `${key}:${n}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
