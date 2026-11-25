// System pop-ups: a window in the System's style for moments worth a little drama (a glass of water and your
// hydration bar, a buff gained, sleep logged). Small things stay small toasts. Any code can call showSystem;
// the window itself lives in the Shell.
const listeners = new Set();
export function showSystem(msg) {
  // msg: { title, lines: [string], bar: { value, max, label }, tone: "buff" | "debuff" | "info" }
  listeners.forEach((f) => f({ ...msg, key: Date.now() + Math.random() }));
}
export function onSystem(f) {
  listeners.add(f);
  return () => listeners.delete(f);
}

// The quest-clear window: rewards counting up, the streak when the board is clear, and loot if any dropped.
// data: { title, coins, bonus, xp, streak, allClear, loot }
const clearListeners = new Set();
export function showClear(data) {
  // Nobody listening (shouldn't happen): run what comes next straight away.
  if (!clearListeners.size) { data.then?.(); return; }
  clearListeners.forEach((f) => f({ ...data, key: Date.now() + Math.random() }));
}
export function onClear(f) {
  clearListeners.add(f);
  return () => clearListeners.delete(f);
}
