import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../lib/player";
import Home from "./Home";
import Quests from "./Quests";
import { useTheme } from "../theme";
import { t } from "../i18n";

const TABS = ["status", "quests"];

// Logged-in app: one live player document shared by all tabs, with a simple bottom tab bar.
export default function Shell({ user }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const state = usePlayer(user.uid);
  const [tab, setTab] = useState("quests");

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flex: 1 }}>
        {tab === "status" ? <Home user={user} {...state} /> : null}
        {tab === "quests" ? (state.player ? <Quests user={user} player={state.player} /> : <Home user={user} {...state} />) : null}
      </View>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.surface, paddingBottom: insets.bottom }}>
        {TABS.map((id) => {
          const active = tab === id;
          return (
            <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setTab(id)}
              style={{ flex: 1, alignItems: "center", paddingVertical: 14, gap: 6 }}>
              <View style={{ width: 22, height: 3, backgroundColor: active ? color.accent : "transparent" }} />
              <Text style={{ fontFamily: font.display, fontSize: 14, letterSpacing: 0.5, color: active ? color.accent : color.muted }}>{t.tabs[id]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
