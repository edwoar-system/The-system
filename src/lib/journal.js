// Saves the evening journal: one entry per day in players/{uid}/journal/{date}, the coins once a day.
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { currentDay } from "./day";
import { JOURNAL_COINS } from "../game/journal";

export async function saveJournal(uid, { well, better, tomorrow, done }) {
  const ref = doc(db, "players", uid);
  return runTransaction(db, async (tx) => {
    const player = (await tx.get(ref)).data() ?? {};
    const day = currentDay(player, uid);
    const first = !day.journal;
    const clean = (s) => String(s ?? "").trim().slice(0, 500);
    const entry = { date: day.date, well: clean(well), better: clean(better), tomorrow: clean(tomorrow), done: (done ?? []).slice(0, 40), at: serverTimestamp() };
    tx.set(doc(db, "players", uid, "journal", day.date), entry);
    tx.set(ref, {
      day: { ...day, journal: true },
      journalLast: { date: day.date, tomorrow: entry.tomorrow },
      ...(first ? { coins: (player.coins ?? 0) + JOURNAL_COINS, feats: { journals: (player.feats?.journals ?? 0) + 1 } } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { coins: first ? JOURNAL_COINS : 0 };
  });
}
