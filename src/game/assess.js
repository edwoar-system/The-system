// Rank assessment: type in what you can do now, and the System tells you where you stand,
// so you don't have to start every skill from F. It doesn't hand out the rank: it points you to the trial
// for the rank you're at (a placement trial includes everything below it), and tells you how close the next one is.
// Numbers follow the rank tables in ladders.js (men 17–29 where the ladder says so).
import { RANKS } from "./ladders";

// at[r] = what you need for rank r (index into RANKS). lower: smaller is better (times, handicap).
export const ASSESS = {
  pushups: { unit: "reps", at: { 1: 10, 2: 25, 3: 40, 4: 57, 5: 80, 6: 110, 7: 150 } },
  pullups: { unit: "reps", at: { 1: 1, 2: 7, 3: 13, 4: 21, 5: 32, 6: 41 } },
  dips: { unit: "reps", at: { 1: 1, 2: 8, 3: 20, 4: 34, 5: 49, 6: 70 } },
  pistol: { unit: "reps", at: { 2: 1, 3: 5, 4: 10, 5: 20, 6: 30 } },
  toes: { unit: "reps", at: { 1: 15, 2: 25, 3: 35, 4: 50 } },
  grip: { unit: "kg", at: { 1: 35, 2: 43, 3: 51, 4: 58, 5: 67, 6: 80 } },
  iso: { unit: "plankMin", step: 0.5, at: { 0: 0.5, 1: 1, 2: 2, 3: 4, 4: 6, 5: 10, 6: 15 } },
  handstand: { unit: "sec", at: { 2: 10, 3: 30, 4: 60, 5: 120 } },
  rope: { unit: "reps", at: { 2: 10, 3: 50, 4: 100, 5: 200 } },
  balance: { unit: "secClosed", at: { 2: 15, 3: 30, 4: 60, 5: 120 } },
  running: { unit: "min5k", lower: true, step: 0.5, at: { 1: 34, 2: 28, 3: 24, 4: 20.5, 5: 17, 6: 15, 7: 13.5 } },
  sprints: { unit: "sec100", lower: true, step: 0.1, at: { 1: 15, 2: 13.5, 3: 12.5, 4: 11.5, 5: 11, 6: 10.5, 7: 10 } },
  swim: { unit: "sec100swim", lower: true, at: { 2: 120, 3: 90, 4: 75, 5: 60, 6: 52, 7: 48 } },
  golf: { unit: "handicap", lower: true, step: 0.1, at: { 1: 54, 2: 35, 3: 14, 4: 7, 5: 2, 6: 0 } },
  boulder: { unit: "vgrade", at: { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9, 6: 12, 7: 15 } },
  chess: { unit: "rating", step: 10, at: { 1: 800, 2: 1200, 3: 1500, 4: 1800, 5: 2100, 6: 2400, 7: 2650 } },
  typing: { unit: "wpm", at: { 1: 30, 2: 40, 3: 55, 4: 70, 5: 90, 6: 120, 7: 150 } },
  memory: { unit: "digits", at: { 1: 10, 2: 20, 3: 50 } },
  breath: { unit: "bolt", at: { 1: 15, 2: 20, 3: 25, 4: 30, 5: 40 } },
  cube: { unit: "secCube", lower: true, at: { 2: 120, 3: 60, 4: 30, 5: 20, 6: 12, 7: 8 } },
};

const meets = (a, value, r) => (a.lower ? value <= a.at[r] : value >= a.at[r]);

// Where a number puts you: { rank, next, need, close } or null without a number.
// rank: the highest rank whose number you reach (0 = F). next: the next rank with a number, need: its number.
// close: within 20% of the next rank's number.
export function assess(skillId, value) {
  const a = ASSESS[skillId];
  if (!a || value == null || Number.isNaN(Number(value))) return null;
  const v = Number(value);
  let rank = 0;
  for (let r = 1; r < RANKS.length; r++) if (a.at[r] != null && meets(a, v, r)) rank = r;
  const next = Object.keys(a.at).map(Number).filter((r) => r > rank).sort((x, y) => x - y)[0] ?? null;
  const need = next != null ? a.at[next] : null;
  const close = need != null && (a.lower ? v <= need * 1.2 : v >= need * 0.8);
  return { rank, next, need, close };
}

// What the System advises: take the trial for your level (it includes everything below), then go for the next.
// current: the rank you hold now in the app.
export function advice(skillId, value, current = 0) {
  const r = assess(skillId, value);
  if (!r) return null;
  if (r.rank <= current) return { ...r, kind: r.close ? "close" : "train" };
  return { ...r, kind: "trial" };
}
