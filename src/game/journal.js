// The evening journal: what you did (filled in from today's log), what went well, what could go better and
// the one thing for tomorrow. That one thing greets you the next morning. Pure rules; lib/journal.js writes.
import { todayKey } from "./quests";

export const JOURNAL_COINS = 5;
export const JOURNAL_FROM_HOUR = 18; // the card shows from here (earlier if your evening routine has started)

export const journaledToday = (day) => !!day?.journal;
// Yesterday's "one thing for tomorrow", shown today.
export function tomorrowNote(player, now = new Date()) {
  const j = player?.journalLast;
  if (!j?.tomorrow) return null;
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return j.date === todayKey(y) ? j.tomorrow : null;
}
