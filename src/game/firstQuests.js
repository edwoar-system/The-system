// First quests: before a new player gets real quests, the System gets to know them. Each step is a quest
// that pays 5 coins (30 in all), and real quests start once every one is cleared, so nobody starts on quests
// that are too hard or don't fit. Pure rules; the screen is components/FirstQuests.js.
import { partsDone } from "./profile";

export const FIRST_COINS = 5;
export const FIRST_QUESTS = [
  { id: "name", done: (p) => !!p?.name },
  { id: "skills", done: (p) => partsDone(p?.profile).interests },
  { id: "day", done: (p) => partsDone(p?.profile).day },
  { id: "busy", done: (p) => (p?.schedule ?? []).length > 0, skippable: true },
  { id: "energy", done: (p) => partsDone(p?.profile).energy },
  { id: "maxes", done: (p) => Object.keys(p?.maxes ?? {}).length > 0, skippable: true },
];
export const FIRST_TOTAL = FIRST_COINS * FIRST_QUESTS.length;

// Cleared = answered, or "not for me" on the ones that allow it.
export const firstCleared = (p, q) => q.done(p) || (q.skippable && !!p?.firstSkip?.[q.id]);

// New players only: never finished, nothing earned yet and hardly any skill trained. Players from before
// this keep their quests.
export const needsFirst = (p) => !!p && !p.firstDone && (p.xp ?? 0) === 0 && Object.keys(p.skills ?? {}).length < 3;

// Cleared but not paid yet.
export const firstToPay = (p) => FIRST_QUESTS.filter((q) => firstCleared(p, q) && !p?.firstPaid?.[q.id]).map((q) => q.id);
export const firstAllCleared = (p) => FIRST_QUESTS.every((q) => firstCleared(p, q));
