import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../lib/player";
import Status from "./Status";
import Quests from "./Quests";
import Skills from "./Skills";
import Urgent from "./Urgent";
import PenaltyZone, { PenaltyBar, ShieldNotice } from "./PenaltyZone";
import { checkPenalty, dismissNotice } from "../lib/penalty";
import { isInPenalty } from "../game/penalty";
import { Glow } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const TABS = ["status", "quests", "skills", "shop"];

function TabIcon({ id, active, c }) {
  const p = { fill: active ? "rgba(159,203,255,0.25)" : "none", stroke: c, strokeWidth: 1.6 };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {id === "status" ? <Polygon points="12,2.5 20.5,7.3 20.5,16.7 12,21.5 3.5,16.7 3.5,7.3" {...p} /> : null}
      {id === "quests" ? <Path d="M6 3h12v18l-6-4-6 4z" {...p} /> : null}
      {id === "skills" ? <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...p} fill="none" /> : null}
      {id === "shop" ? <Path d="M4 8h16l-1.5 12h-13zM9 8a3 3 0 0 1 6 0" {...p} /> : null}
    </Svg>
  );
}

function Soon({ text }) {
  const { color, font } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Glow height={420} at={0.4} />
      <Text style={{ fontFamily: font.body, fontSize: 15, textAlign: "center", color: color.muted }}>{text}</Text>
    </View>
  );
}

// Logged-in app: one live player document shared by all tabs, with the System tab bar.
export default function Shell({ user }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const state = usePlayer(user.uid);
  const [tab, setTab] = useState("status");
  const [penaltyView, setPenaltyView] = useState(null); // null | "intro" | "manual"
  const checking = useRef(false);
  const player = state.player;
  const inPenalty = isInPenalty(player);

  // Penalty check on open and every minute: deadline passed with open mains -> zone (or a shield is used).
  useEffect(() => {
    const run = () => {
      if (checking.current) return;
      checking.current = true;
      checkPenalty(user.uid).catch(() => {}).finally(() => { checking.current = false; });
    };
    run();
    const id = setInterval(run, 60000);
    return () => clearInterval(id);
  }, [user.uid]);

  useEffect(() => {
    if (inPenalty && player.penalty.seen === false && !penaltyView) setPenaltyView("intro");
  }, [inPenalty, player, penaltyView]);

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flex: 1 }}>
        {tab === "status" ? <Status user={user} {...state} onOpenQuests={() => setTab("quests")} /> : null}
        {tab === "quests" ? (state.player ? <Quests user={user} player={state.player} /> : <Status user={user} {...state} />) : null}
        {tab === "skills" ? (state.player ? <Skills user={user} player={state.player} /> : <Status user={user} {...state} />) : null}
        {tab === "shop" ? <Soon text={t.soon.shop} /> : null}
      </View>
      {player && !penaltyView ? <Urgent user={user} player={player} /> : null}
      {player && penaltyView ? <PenaltyZone user={user} player={player} intro={penaltyView === "intro"} onClose={() => setPenaltyView(null)} /> : null}
      {player?.notice && !player.notice.seen && !penaltyView ? <ShieldNotice player={player} onClose={() => dismissNotice(user.uid)} /> : null}
      {inPenalty ? <PenaltyBar player={player} onOpen={() => setPenaltyView("manual")} /> : null}
      <View accessibilityRole="tablist" style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: color.line, backgroundColor: "rgba(1,4,10,0.96)", paddingBottom: Math.max(insets.bottom, 8) }}>
        {TABS.map((id) => {
          const active = tab === id;
          const c = active ? color.hi : color.muted;
          return (
            <Pressable key={id} accessibilityRole="tab" accessibilityLabel={t.tabs[id]} accessibilityState={{ selected: active }} onPress={() => setTab(id)}
              style={{ flex: 1, alignItems: "center", paddingTop: 10, paddingBottom: 4, gap: 4 }}>
              <View style={{ position: "absolute", top: -1, width: 28, height: 2, backgroundColor: active ? color.accent : "transparent" }} />
              <TabIcon id={id} active={active} c={c} />
              <Text style={{ fontFamily: font.bold, fontSize: 10, letterSpacing: 1, color: c }}>{t.tabs[id].toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
