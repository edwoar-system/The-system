// Sub-scenarios (urgent quests) in Firestore: offer, accept, pass, finish and time-outs. Lives in players/{uid}.urgent.
// Nothing costs coins: passing or running out of time just closes it.
import { collection, doc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { levelFromXp } from "../game/economy";
import { todayKey } from "../game/quests";
import { currentSituation } from "./location";
import { URGENT, pickTask, taskById, taskReward, urgentPerDayOf, urgentReason } from "../game/urgent";

const ref = (uid) => doc(db, "players", uid);
const OPEN = ["offered", "active"];

function rewardFields(player, r, skill) {
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
      ...(skill ? { lastDoneBySkill: { ...(player.lastDoneBySkill ?? {}), [skill]: todayKey() } } : {}),
      feats: { quests: (player.feats?.quests ?? 0) + 1 },
    },
    levelUp: after > before ? after : null,
  };
}

// Writes a quest log entry and returns its id (for proof and the check-in).
function log(uid, entry) {
  const r = doc(collection(db, "players", uid, "log"));
  setDoc(r, { ...entry, slot: "urgent", date: todayKey(), at: serverTimestamp() }).catch(() => {});
  return r.id;
}

function countToday(player) {
  const today = todayKey();
  return { date: today, count: (player.urgentToday?.date === today ? player.urgentToday.count : 0) + 1 };
}

function newOffer(player, reason) {
  const task = pickTask(player);
  return task ? { id: String(Date.now()), reason, status: "offered", offeredAt: Date.now(), task } : null;
}

// Called when the app opens and every minute: maybe offer one (only at home), and close ones that ran out.
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
      tx.set(ref(uid), { urgent: { ...u, status: "expired" } }, { merge: true });
      return "expired";
    }
    // Older kinds (rest and follow-up) just close.
    if (u?.status === "followup" || (u?.status === "failed" && !u.seen) || (OPEN.includes(u?.status) && !taskById(u.task))) {
      tx.set(ref(uid), { urgent: { ...u, status: "expired", seen: true } }, { merge: true });
      return "expired";
    }

    const reason = urgentReason(player, now, todayKey(), currentSituation());
    if (reason === "checked") {
      tx.set(ref(uid), { lastUrgentCheckAt: now }, { merge: true });
      return null;
    }
    if (!reason) return null;
    const offer = newOffer(player, reason);
    if (!offer) return null;
    tx.set(ref(uid), { urgent: offer, urgentToday: countToday(player), lastUrgentCheckAt: now }, { merge: true });
    return "offered";
  });
}

// An old urgent notification was tapped: nothing to do any more (offers only come while you're home, in the app).
export async function offerNotifiedUrgent() {
  return null;
}

// You asked for one yourself (from your picked skills, wherever you are).
export async function requestUrgent(uid) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(uid));
    const player = snap.data() ?? {};
    if (OPEN.includes(player.urgent?.status)) throw new Error("urgent-open");
    const offer = newOffer(player, "request");
    if (!offer) throw new Error("no-skills");
    tx.set(ref(uid), { urgent: offer }, { merge: true });
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

export const acceptUrgent = (uid) => update(uid, (p, u) => {
  if (u.status !== "offered") throw new Error("not-offered");
  const task = taskById(u.task);
  return { write: { urgent: { ...u, status: "active", deadline: Date.now() + (task.minutes + URGENT.extraMinutes) * 60000 } } };
});

// Pass: free, any time before you finish.
export const passUrgent = (uid) => update(uid, (p, u) => {
  if (!OPEN.includes(u.status)) return null;
  return { write: { urgent: { ...u, status: "passed" } } };
});

export const finishUrgent = (uid) => update(uid, (p, u) => {
  if (u.status !== "active") throw new Error("not-active");
  const task = taskById(u.task);
  const r = taskReward(task);
  const { fields, levelUp } = rewardFields(p, r, task.skill);
  const logId = log(uid, { questId: `urgent:${u.task}`, title: task.title, coins: r.coins, xp: r.xp, stat: r.stat });
  return { write: { ...fields, urgent: { ...u, status: "done", earned: r } }, result: { ...r, levelUp, logId, title: task.title } };
});

export const setUrgentPerDay = (uid, n) => update(uid, () => ({ write: { urgentOptIn: n } }));
export { urgentPerDayOf };
