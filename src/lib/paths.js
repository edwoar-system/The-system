// Paths progress: pages read (players/{uid}.paths), a little EXP and practice for the skill, and the daily reading reminder.
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { practise } from "./courses";
import { setReminders } from "./player";
import { PATH_PAGE_XP, pathById } from "../game/paths";
import { todayKey } from "../game/quests";
import { t } from "../i18n";

// Marks a page read. The first time pays EXP and counts 5 minutes toward the path's skill.
export async function readPage(uid, player, pathId, pageId) {
  if (player?.paths?.[pathId]?.read?.[pageId]) return { first: false };
  await updateDoc(doc(db, "players", uid), { [`paths.${pathId}.read.${pageId}`]: todayKey(), xp: (player?.xp ?? 0) + PATH_PAGE_XP, updatedAt: serverTimestamp() });
  const skill = pathById[pathId]?.skill;
  if (skill) await practise(uid, skill, 5).catch(() => null);
  return { first: true, xp: PATH_PAGE_XP };
}

// The daily reading reminder is one of your reminders (id "reading"), so it alerts, pops up and shows on the quest screen like the rest.
export function setReadingReminder(uid, player, time) {
  const rest = (player?.reminders ?? []).filter((r) => r.id !== "reading");
  return setReminders(uid, time ? [...rest, { id: "reading", text: t.paths.reminderText, time, repeat: "daily" }] : rest);
}
export const readingTime = (player) => (player?.reminders ?? []).find((r) => r.id === "reading")?.time ?? null;
