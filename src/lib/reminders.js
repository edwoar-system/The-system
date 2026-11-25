// Reminders while the app is open: at the time you set, the System pops up (the phone notification covers
// the time the app is closed; the website has no notifications, so this is how reminders reach you there).
import { useEffect } from "react";
import { Platform } from "react-native";
import { minutesOf, reminderDone, remindersOn } from "../game/reminders";
import { todayKey } from "../game/quests";
import { showSystem } from "./popup";
import { t } from "../i18n";

const shown = new Set(); // "date:id" already popped up this session
const LATE_MINUTES = 20; // open the app up to 20 minutes late and it still pops up

function webNotify(text) {
  try {
    if (Platform.OS === "web" && typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(t.reminders.popTitle, { body: text });
  } catch {
    // Not available in this browser.
  }
}

export function useReminderAlerts(player) {
  useEffect(() => {
    if (!player) return undefined;
    const run = () => {
      const now = new Date();
      const key = todayKey(now);
      const nowMin = now.getHours() * 60 + now.getMinutes();
      remindersOn(player, key).forEach((r) => {
        const at = minutesOf(r.time);
        const tag = `${key}:${r.id}`;
        if (shown.has(tag) || reminderDone(player, r.id, key) || at > nowMin || nowMin - at > LATE_MINUTES) return;
        shown.add(tag);
        showSystem({ title: t.reminders.popTitle, lines: [r.text, t.reminders.popSub], tone: "info" });
        webNotify(r.text);
      });
    };
    run();
    const id = setInterval(run, 20000);
    return () => clearInterval(id);
  }, [player]);
}

// Website: ask once for the browser's permission to show reminders (only when you add one).
export function askWebNotifications() {
  try {
    if (Platform.OS === "web" && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission().catch?.(() => {});
  } catch {
    // Not available.
  }
}
