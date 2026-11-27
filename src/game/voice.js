// How the System talks to you in notifications (Settings → Notifications → Voice). players/{uid}.voice =
// { tone: "stoic" | "coach" | "calm" | "mine", lines: [your own lines] }. Stoic = a quote (the default).
export const TONES = ["stoic", "coach", "calm", "mine"];
export const VOICE_MAX_LINES = 30;
export const voiceTone = (player) => (TONES.includes(player?.voice?.tone) ? player.voice.tone : "stoic");
export const ownLines = (player) => (player?.voice?.lines ?? []).filter((x) => typeof x === "string" && x.trim());

// A fixed pick for this day and slot, so the plan doesn't change every time it's rebuilt.
export function pickLine(list, key, n) {
  if (!list?.length) return null;
  let h = 7;
  for (const c of `${key}:${n}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
