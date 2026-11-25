// Your own reminders ("don't forget"): which ones are for today, parsing the time you type, and done ticks.
import { todayKey } from "./quests";

// "7:30", "07.30", "730", "0730", "7" → "07:30" / "07:00", or null.
export function parseTime(text) {
  const s = String(text ?? "").trim().replace(/\s+/g, "");
  let h; let m;
  let x = s.match(/^(\d{1,2})[:.h](\d{2})$/);
  if (x) { h = Number(x[1]); m = Number(x[2]); }
  else if ((x = s.match(/^(\d{1,2})(\d{2})$/))) { h = Number(x[1]); m = Number(x[2]); }
  else if ((x = s.match(/^(\d{1,2})$/))) { h = Number(x[1]); m = 0; }
  else return null;
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const minutesOf = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + m; };

// Today's reminders, by time.
export function remindersOn(player, key = todayKey()) {
  return (player?.reminders ?? []).filter((r) => r.repeat === "daily" || r.date === key).sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
}

// Ticked off today?
export const reminderDone = (player, id, key = todayKey()) => player?.reminderDone?.date === key && (player.reminderDone.ids ?? []).includes(id);
