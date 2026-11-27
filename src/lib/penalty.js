// Penalty Zone in Firestore: players/{uid}.penalty, plus shields and the severity setting.
import { addDoc, collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { currentDay } from "./day";
import { todayKey } from "../game/quests";
import { penaltyDue, penaltyUntil, redemptionById, redemptionReadyAt, severityFor } from "../game/penalty";
import { saveProof } from "./proof";

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
        penalty: { status: "active", date: day.date, missed, severity: severityFor(player, day.date), until: penaltyUntil(day.date, severityFor(player, day.date)), seen: false, redemption: null, at: now },
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
export const chooseRedemption = (uid, id) => update(uid, (p) => (p.penalty?.status === "active" && redemptionById[id] ? { penalty: { ...p.penalty, redemption: id, startedAt: Date.now() } } : null));
// Changed your mind: pick another (its time starts again).
export const changeRedemption = (uid) => update(uid, (p) => (p.penalty?.status === "active" ? { penalty: { ...p.penalty, redemption: null, startedAt: null } } : null));
export const dismissNotice = (uid) => update(uid, (p) => (p.notice ? { notice: { ...p.notice, seen: true } } : null));
export const setPenaltySeverity = (uid, s) => update(uid, () => ({ penaltySeverity: s, penaltySeverityNext: null, penaltySeverityFrom: null }));

// After setup: the new severity starts tomorrow.
export const scheduleSeverity = (uid, s) => update(uid, (player) => {
  const today = todayKey();
  const now = severityFor(player, today);
  if (s === now) return { penaltySeverity: now, penaltySeverityNext: null, penaltySeverityFrom: null };
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return { penaltySeverity: now, penaltySeverityNext: s, penaltySeverityFrom: todayKey(d) };
});

// No reward, only freedom.
// Finishing needs the minimum time to have passed, and a photo for the ones that ask for one.
export async function finishRedemption(uid, photo = null) {
  await update(uid, (p) => {
    if (p.penalty?.status !== "active" || !p.penalty.redemption) throw new Error("no-redemption");
    const r = redemptionById[p.penalty.redemption];
    if (Date.now() < (redemptionReadyAt(p.penalty) ?? 0)) throw new Error("too-soon");
    if (r?.photo && !photo) throw new Error("needs-photo");
    return { penalty: { ...p.penalty, status: "redeemed", redeemedAt: Date.now() }, redemptions: (p.redemptions ?? 0) + 1, lastQuestAt: Date.now() };
  });
  const log = await addDoc(collection(db, "players", uid, "log"), { questId: "redemption", slot: "penalty", title: "Redemption quest", coins: 0, xp: 0, date: todayKey(), at: serverTimestamp() }).catch(() => null);
  if (log && photo) saveProof(uid, log.id, photo).catch(() => {});
}
