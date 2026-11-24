// Local notifications on the phone: permission, scheduling the plan from game/notify.js, and taps.
// Nothing runs on the website.
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { notificationPlan } from "../game/notify";

export const notifySupported = Platform.OS !== "web";

export function setupNotifications() {
  if (!notifySupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

// "granted" | "denied" | "undetermined" | "unsupported"
export async function notifyPermission() {
  if (!notifySupported) return "unsupported";
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return "granted";
  return p.canAskAgain === false || p.status === "denied" ? "denied" : "undetermined";
}

export async function askNotifyPermission() {
  if (!notifySupported) return "unsupported";
  const now = await notifyPermission();
  if (now !== "undetermined") return now;
  const p = await Notifications.requestPermissionsAsync();
  return p.granted ? "granted" : "denied";
}

// Replaces everything scheduled with the current plan. Skips the work when the plan didn't change.
let lastPlan = null;
export async function syncNotifications(player, uid) {
  if (!notifySupported || !player || !uid) return;
  if ((await notifyPermission()) !== "granted") return;
  const plan = notificationPlan(player, uid);
  const sig = plan.map((n) => `${n.id}@${n.date.getTime()}:${n.body}`).join("|");
  if (sig === lastPlan) return;
  lastPlan = sig;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body, data: n.data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.date },
    });
  }
}

// Calls handler(data) when a notification is tapped, including the one that opened the app.
export function onNotificationTap(handler) {
  if (!notifySupported) return () => {};
  let alive = true;
  Notifications.getLastNotificationResponseAsync().then((r) => {
    if (!alive || !r?.notification) return;
    // Clear it, so the same tap isn't handled again on the next launch.
    Notifications.clearLastNotificationResponseAsync?.();
    handler(r.notification.request.content.data ?? {}, r.notification.request.identifier);
  }).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    Notifications.clearLastNotificationResponseAsync?.();
    handler(r.notification.request.content.data ?? {}, r.notification.request.identifier);
  });
  return () => { alive = false; sub.remove(); };
}
