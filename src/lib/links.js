// Links from outside the app (the iPhone Shortcuts app, a home-screen bookmark): thesystem://do/<action>.
//   water            one glass of water
//   todo?text=...    a to-do for today (&when=tomorrow for tomorrow)
//   quests | skills | learn | friends | status   open that tab
// The route (app/do/[action].js) only queues the action; Shell runs it once you're logged in.
import { useEffect, useState } from "react";
import { quickLog } from "./quick";
import { addTodo } from "./todos";
import { showSystem } from "./popup";
import { todayKey } from "../game/quests";
import { t } from "../i18n";

const TABS = ["quests", "skills", "learn", "friends", "status"];
let queue = [];
const listeners = new Set();
export function queueLink(action, params = {}) {
  queue.push({ action: String(action ?? "").toLowerCase(), params });
  listeners.forEach((fn) => fn(queue.length));
}

async function run(uid, { action, params }, goTo) {
  if (action === "water") {
    await quickLog(uid, "water");
    showSystem({ title: t.links.water, tone: "buff" });
  } else if (action === "todo" && params.text) {
    const tomorrow = String(params.when ?? "").toLowerCase() === "tomorrow";
    await addTodo(uid, String(params.text), tomorrow ? todayKey(new Date(Date.now() + 86400000)) : todayKey());
    showSystem({ title: t.links.todo, lines: [String(params.text)], tone: "buff" });
    goTo({ tab: "quests" });
  } else if (TABS.includes(action)) {
    goTo({ tab: action });
  }
}

// In Shell: runs queued link actions for the logged-in player.
export function useLinkActions(uid, goToRef) {
  const [n, setN] = useState(queue.length);
  useEffect(() => {
    listeners.add(setN);
    return () => listeners.delete(setN);
  }, []);
  useEffect(() => {
    if (!uid || !queue.length) return;
    const jobs = queue;
    queue = [];
    (async () => { for (const j of jobs) await run(uid, j, (p) => goToRef.current?.(p)).catch(() => {}); })();
  }, [uid, n, goToRef]);
}
