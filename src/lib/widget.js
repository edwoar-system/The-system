// Keeps the home-screen widget up to date: a small summary in the shared App Group (targets/widget reads it).
// Only on iPhone builds that have the widget (1.6.0+); elsewhere this does nothing.
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { currentDay, currentStreak, getQuest } from "./day";
import { quickToday } from "../game/quick";
import { WATER_GOAL } from "../game/effects";
import { levelFromXp } from "../game/economy";
import { todayKey } from "../game/quests";

export const APP_GROUP = "group.com.edwardapps.thesystem";

let storage;
function widgetStorage() {
  if (storage !== undefined) return storage;
  storage = null;
  if (Platform.OS !== "ios") return storage;
  try {
    // Only when the native module is in this build.
    if (!require("expo").requireOptionalNativeModule("ExtensionStorage")) return storage;
    const { ExtensionStorage } = require("@bacons/apple-targets");
    storage = { box: new ExtensionStorage(APP_GROUP), reload: () => ExtensionStorage.reloadWidget() };
  } catch {
    storage = null;
  }
  return storage;
}

export function widgetSummary(player, uid) {
  const day = currentDay(player, uid);
  const mains = day?.mains ?? [];
  return {
    date: todayKey(),
    level: levelFromXp(player?.xp ?? 0).level,
    streak: currentStreak(player),
    coins: player?.coins ?? 0,
    done: mains.filter((m) => m.done).length,
    total: mains.length,
    next: mains.filter((m) => !m.done).map((m) => getQuest(m.id, player)?.title).filter(Boolean).slice(0, 3),
    water: quickToday(player).water ?? 0,
    waterGoal: player?.profile?.waterGoal ?? WATER_GOAL,
  };
}

// In Shell: writes the summary when it changes, and asks iOS to redraw the widget.
export function useWidgetSync(uid, player) {
  const last = useRef("");
  const json = player ? JSON.stringify(widgetSummary(player, uid)) : "";
  useEffect(() => {
    if (!json || json === last.current) return;
    const s = widgetStorage();
    if (!s) return;
    last.current = json;
    try {
      s.box.set("summary", json);
      s.reload();
    } catch { /* the widget just stays as it was */ }
  }, [json]);
}
