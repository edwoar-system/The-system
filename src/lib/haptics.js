// Small vibrations for moments that matter (a quest done, a lock-in). Silent on the website.
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const on = Platform.OS === "ios" || Platform.OS === "android";

export function tapFeel() {
  if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
export function doneFeel() {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
export function lockFeel() {
  if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}
