// Feedback for moments that matter: a vibration and a short sound. Both can be turned off in
// Settings (Shell passes your choice in with setFeel). Sounds follow the iPhone's silent switch.
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

const native = Platform.OS === "ios" || Platform.OS === "android";
let feel = { vibration: true, sound: true };
export function setFeel(next) { feel = { vibration: next?.vibration !== false, sound: next?.sound !== false }; }

const SOURCES = {
  saved: require("../../assets/sounds/saved.wav"),
  done: require("../../assets/sounds/done.wav"),
  lock: require("../../assets/sounds/lock.wav"),
  clear: require("../../assets/sounds/clear.wav"),
  loot: require("../../assets/sounds/loot.wav"),
};
const players = {};
let modeSet = false;
function play(name, volume = 0.6) {
  if (!feel.sound) return;
  try {
    if (!modeSet) { modeSet = true; setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {}); }
    const p = players[name] ?? (players[name] = createAudioPlayer(SOURCES[name]));
    p.volume = volume;
    p.seekTo(0).then(() => p.play()).catch(() => p.play());
  } catch { /* sound is a bonus */ }
}
const buzz = (fn) => { if (native && feel.vibration) fn().catch(() => {}); };

export function tapFeel() { buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)); }
export function savedFeel() { buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)); play("saved", 0.45); }
export function doneFeel() { buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)); play("done", 0.55); }
export function lockFeel() { buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)); play("lock", 0.6); }
// A quest cleared with the big window, and loot dropping out of it.
export function clearFeel() { buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)); play("clear", 0.6); }
export function lootFeel(rare = false) {
  buzz(() => Haptics.impactAsync(rare ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium));
  play("loot", rare ? 0.75 : 0.55);
}
