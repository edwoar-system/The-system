// Penalty Zone in Firestore: players/{uid}.penalty, plus shields and the severity setting.
import { addDoc, collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { currentDay } from "./day";
import { todayKey } from "../game/quests";
import { penaltyDue, penaltyUntil, redemptionById } from "../game/penalty";

const ref = (uid) => doc(db, "players", uid);

// Runs when the app opens and every minute: puts you in the zone after a missed deadline, or ends a served penalty.
export async function checkPenalty(uid) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(uid));
    const player = snap.data() ?? {};
    const now = Date.now();
    const p = player.penalty;

    if (p?.status === "active" && now >= p.until) {
      tx.set(ref(uid), { penalty: { ...p, status: "served" } }, { merge: true });
      return "served";
    }
    if (p?.status === "active") return null;

    // Yesterday's stored board (opened after midnight) or today's board (stored or not yet stored).
    const stored = player.day;
    const candidates = [];
    if (stored?.date && stored.date !== todayKey()) candidates.push(stored);
    candidates.push(currentDay(player, uid));

    for (const day of candidates) {
      const due = penaltyDue(day, player, now);
      if (!due) continue;
      const checkedDay = { ...day, penaltyChecked: true };
      const write = day.date === todayKey() || day === stored ? { day: checkedDay } : {};
      if (due === "shield") {
        tx.set(ref(uid), { ...write, shields: (player.shields ?? 0) - 1, notice: { kind: "shield", date: day.date, seen: false } }, { merge: true });
        return "shield";
      }
      const missed = day.mains.filter((m) => !m.done).map((m) => m.id);
      tx.set(ref(uid), {
        ...write,
        penalty: { status: "active", date: day.date, missed, severity: player.penaltySeverity ?? "normal", until: penaltyUntil(day.date, player.penaltySeverity), seen: false, redemption: null, at: now },
      }, { merge: true });
      return "penalty";
    }
    return null;
  });
}

async function update(uid, fn) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(uid));
    const player = snap.data() ?? {};
    const out = fn(player);
    if (out) tx.set(ref(uid), out, { merge: true });
  });
}

export const markPenaltySeen = (uid) => update(uid, (p) => (p.penalty ? { penalty: { ...p.penalty, seen: true } } : null));
export const chooseRedemption = (uid, id) => update(uid, (p) => (p.penalty?.status === "active" && redemptionById[id] ? { penalty: { ...p.penalty, redemption: id } } : null));
export const dismissNotice = (uid) => update(uid, (p) => (p.notice ? { notice: { ...p.notice, seen: true } } : null));
export const setPenaltySeverity = (uid, s) => update(uid, () => ({ penaltySeverity: s }));

// No reward, only freedom.
export async function finishRedemption(uid) {
  await update(uid, (p) => {
    if (p.penalty?.status !== "active" || !p.penalty.redemption) throw new Error("no-redemption");
    return { penalty: { ...p.penalty, status: "redeemed", redeemedAt: Date.now() }, redemptions: (p.redemptions ?? 0) + 1, lastQuestAt: Date.now() };
  });
  addDoc(collection(db, "players", uid, "log"), { questId: "redemption", slot: "penalty", title: "Redemption quest", coins: 0, xp: 0, date: todayKey(), at: serverTimestamp() }).catch(() => {});
}
