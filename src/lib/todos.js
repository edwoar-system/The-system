// To-dos in players/{uid}.todos (game/todos.js).
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { todayKey } from "../game/quests";
import { TODO_COINS, TODO_KEEP_DAYS, TODO_MAX, TODO_PAID_PER_DAY, paidToday } from "../game/todos";

const ref = (uid) => doc(db, "players", uid);
const keepDate = () => todayKey(new Date(Date.now() - TODO_KEEP_DAYS * 86400000));

function change(uid, fn) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const { todos, extra, result } = fn(p, (p.todos ?? []).filter((x) => !x.done || (x.doneOn ?? "") >= keepDate()));
    tx.set(ref(uid), { todos, ...(extra ?? {}), updatedAt: serverTimestamp() }, { merge: true });
    return result ?? null;
  });
}

export const addTodo = (uid, title, date = todayKey()) => change(uid, (p, list) => {
  const text = String(title ?? "").trim().slice(0, 80);
  if (!text) return { todos: list };
  return { todos: [...list, { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, title: text, date, done: false }].slice(-TODO_MAX) };
});

// Done (pays the first few a day) or not done again (no coins back or forth).
export const toggleTodo = (uid, id) => change(uid, (p, list) => {
  const today = todayKey();
  const item = list.find((x) => x.id === id);
  if (!item) return { todos: list };
  const done = !item.done;
  const pay = done && !item.paid && paidToday(p, today) < TODO_PAID_PER_DAY;
  const todos = list.map((x) => (x.id === id ? { ...x, done, doneOn: done ? today : null, paid: x.paid || pay } : x));
  return {
    todos,
    extra: pay ? { coins: (p.coins ?? 0) + TODO_COINS, todoPaid: { date: today, n: paidToday(p, today) + 1 } } : null,
    result: { done, coins: pay ? TODO_COINS : 0 },
  };
});

export const removeTodo = (uid, id) => change(uid, (p, list) => ({ todos: list.filter((x) => x.id !== id) }));
