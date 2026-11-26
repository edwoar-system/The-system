// Urgent quests in Firestore: offer, accept, skip, finish, follow-up, and time-outs. Lives in players/{uid}.urgent.
import { collection, doc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { levelFromXp } from "../game/economy";
import { todayKey } from "../game/quests";
import { currentSituation } from "./location";
import {
  FOLLOW_FAIL_COST, URGENT, urgentPerDayOf, failCost, followById, followReward, pickOptions, restById, restReward, skipCost, taskById, taskReward, urgentReason,
} from "../game/urgent";

const ref = (uid) => doc(db, "players", uid);

function rewardFields(player, r) {
  const xp = (player.xp ?? 0) + r.xp;
  const before = levelFromXp(player.xp ?? 0).level;
  const after = levelFromXp(xp).level;
  return {
    fields: {
      coins: (player.coins ?? 0) + r.coins,
      xp,
      level: after,
      statXp: { ...(player.statXp ?? {}), [r.stat]: (player.statXp?.[r.stat] ?? 0) + r.xp },
      lastQuestAt: Date.now(),
    },
    levelUp: after > before ? after : null,
  };
}

// Writes a quest log entry and returns its id (for proof and the check-in).
function log(uid, entry) {
  const ref = doc(collection(db, "players", uid, "log"));
  setDoc(ref, { ...entry, slot: "urgent", date: todayKey(), at: serverTimestamp() }).catch(() => {});
  return ref.id;
}

function countToday(player) {
  const today = todayKey();
  return { date: today, count: (player.urgentToday?.date === today ? player.urgentToday.count : 0) + 1 };
}

function newOffer(reason) {
  const o = pickOptions(Math.random, currentSituation());
  return { id: String(Date.now()), reason, status: "offered", offeredAt: Date.now(), rest: o.rest, task: o.task };
}

// Called when the app opens or comes back: maybe offer an urgent quest, and close ones that ran out of time.
export async function checkUrgent(uid) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(uid));
    const player = snap.data() ?? {};
    const u = player.urgent;
    const now = Date.now();

    if (u?.status === "offered" && now - u.offeredAt > URGENT.acceptMinutes * 60000) {
      tx.set(ref(uid), { urgent: { ...u, status: "expired" } }, { merge: true });
      return "expired";
    }
    if (u?.status === "active" && now > u.deadline) {
      const r = u.choice === "rest" ? restReward(restById[u.rest], taskById[u.task]) : taskReward(taskById[u.task]);
      const lost = failCost(r);
      tx.set(ref(uid), { coins: Math.max(0, (player.coins ?? 0) - lost), urgent: { ...u, status: "failed", lost, seen: false } }, { merge: true });
      return "failed";
    }
    if (u?.status === "followup" && now > u.followDeadline) {
      const lost = FOLLOW_FAIL_COST;
      tx.set(ref(uid), { coins: Math.max(0, (player.coins ?? 0) - lost), urgent: { ...u, status: "failed", lost, seen: false } }, { merge: true });
      return "failed";
    }

    const reason = urgentReason(player, now, todayKey());
    if (reason === "checked") {
      tx.set(ref(uid), { lastUrgentCheckAt: now }, { merge: true });
      return null;
    }
    if (!reason) return null;
    tx.set(ref(uid), { urgent: newOffer(reason), urgentToday: countToday(player), lastUrgentCheckAt: now }, { merge: true });
    return "offered";
  });
}

// You tapped an urgent-quest notification: offer one now (counts toward your urgent quests per day).
export async function offerNotifiedUrgent(uid) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(uid));
    const player = snap.data() ?? {};
    if (player.urgent && ["offered", "active", "followup"].includes(player.urgent.status)) return null;
    const count = player.urgentToday?.date === todayKey() ? player.urgentToday.count : 0;
    if (count >= urgentPerDayOf(player)) return null;
    tx.set(ref(uid), { urgent: newOffer("notified"), urgentToday: countToday(player), lastUrgentCheckAt: Date.now() }, { merge: true });
    return "offered";
  });
}

// You asked for one yourself.
export async function requestUrgent(uid) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(uid));
    const player = snap.data() ?? {};
    if (player.urgent && ["offered", "active", "followup"].includes(player.urgent.status)) throw new Error("urgent-open");
    tx.set(ref(uid), { urgent: newOffer("request") }, { merge: true });
  });
}

async function update(uid, fn) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(uid));
    const player = snap.data() ?? {};
    const out = fn(player, player.urgent ?? {});
    if (out?.write) tx.set(ref(uid), out.write, { merge: true });
    return out?.result ?? null;
  });
}

// choice: "rest" | "task"
export const acceptUrgent = (uid, choice) => update(uid, (p, u) => {
  if (u.status !== "offered") throw new Error("not-offered");
  const minutes = choice === "rest" ? restById[u.rest].minutes : taskById[u.task].minutes;
  return { write: { urgent: { ...u, status: "active", choice, deadline: Date.now() + (minutes + URGENT.extraMinutes) * 60000 } } };
});

export const skipUrgent = (uid) => update(uid, (p, u) => {
  if (u.status !== "offered") throw new Error("not-offered");
  const lost = skipCost(taskById[u.task]);
  log(uid, { questId: `urgent:skip`, title: "Skipped urgent quest", coins: -lost, xp: 0 });
  return { write: { coins: Math.max(0, (p.coins ?? 0) - lost), urgent: { ...u, status: "skipped", lost } }, result: { lost } };
});

// Finishing the chosen option. Rest leads to the follow-up hour.
export const finishUrgent = (uid) => update(uid, (p, u) => {
  if (u.status !== "active") throw new Error("not-active");
  if (Date.now() > u.deadline) throw new Error("too-late");
  const rest = u.choice === "rest";
  const r = rest ? restReward(restById[u.rest], taskById[u.task]) : taskReward(taskById[u.task]);
  const { fields, levelUp } = rewardFields(p, r);
  const title = rest ? restById[u.rest].title : taskById[u.task].title;
  const logId = log(uid, { questId: `urgent:${rest ? u.rest : u.task}`, title, coins: r.coins, xp: r.xp, stat: r.stat });
  const next = rest
    ? { ...u, status: "followup", followDeadline: Date.now() + URGENT.followUpMinutes * 60000, earned: r }
    : { ...u, status: "done", earned: r };
  return { write: { ...fields, urgent: next }, result: { ...r, levelUp, followUp: rest, logId, title } };
});

export const chooseFollowUp = (uid, followId) => update(uid, (p, u) => {
  if (u.status !== "followup") throw new Error("not-followup");
  return { write: { urgent: { ...u, follow: followId } } };
});

export const finishFollowUp = (uid) => update(uid, (p, u) => {
  if (u.status !== "followup" || !u.follow) throw new Error("not-followup");
  if (Date.now() > u.followDeadline) throw new Error("too-late");
  const f = followById[u.follow];
  const r = followReward(f);
  const { fields, levelUp } = rewardFields(p, r);
  const logId = log(uid, { questId: `urgent:follow:${f.id}`, title: f.title, coins: r.coins, xp: r.xp, stat: r.stat });
  return { write: { ...fields, urgent: { ...u, status: "done", earned: r } }, result: { ...r, levelUp, logId, title: f.title } };
});

// Closes a result screen (failed) so it doesn't show again.
export const dismissUrgent = (uid) => update(uid, (p, u) => ({ write: { urgent: { ...u, seen: true } } }));

export const setUrgentPerDay = (uid, n) => update(uid, () => ({ write: { urgentOptIn: n } }));
