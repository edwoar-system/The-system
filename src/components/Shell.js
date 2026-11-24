import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path, Polygon } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../lib/player";
import Status from "./Status";
import Quests from "./Quests";
import Skills from "./Skills";
import Settings from "./Settings";
import Friends from "./Friends";
import Urgent from "./Urgent";
import PenaltyZone, { PenaltyBar, ShieldNotice } from "./PenaltyZone";
import { checkPenalty, dismissNotice } from "../lib/penalty";
import { onNotificationTap, setupNotifications, syncNotifications } from "../lib/notify";
import { offerNotifiedUrgent } from "../lib/urgent";
import { syncPublic } from "../lib/social";
import { isInPenalty } from "../game/penalty";
import { useTheme } from "../theme";
import { t } from "../i18n";

// The shop will open from your coins (it comes with app blocking), so friends take its place in the bar.
const TABS = ["status", "quests", "skills", "friends", "settings"];

function TabIcon({ id, active, c }) {
  const p = { fill: active ? "rgba(159,203,255,0.25)" : "none", stroke: c, strokeWidth: 1.6 };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {id === "status" ? <Polygon points="12,2.5 20.5,7.3 20.5,16.7 12,21.5 3.5,16.7 3.5,7.3" {...p} /> : null}
      {id === "quests" ? <Path d="M6 3h12v18l-6-4-6 4z" {...p} /> : null}
      {id === "skills" ? <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...p} fill="none" /> : null}
      {id === "friends" ? (
        <>
          <Polygon points="9,3.5 14,6.4 14,12.1 9,15 4,12.1 4,6.4" {...p} />
          <Path d="M16 7.5l4.5 2.6v5.8L15.5 18.8 11 16.2" fill="none" stroke={c} strokeWidth={1.6} />
          <Path d="M5 21h14" stroke={c} strokeWidth={1.6} />
        </>
      ) : null}
      {id === "settings" ? (
        <>
          <Path d="M12 2.5v3M12 18.5v3M3.8 7.3l2.6 1.5M17.6 15.2l2.6 1.5M3.8 16.7l2.6-1.5M17.6 8.8l2.6-1.5" stroke={c} strokeWidth={1.6} />
          <Polygon points="12,6 17.2,9 17.2,15 12,18 6.8,15 6.8,9" {...p} />
          <Circle cx={12} cy={12} r={2.2} fill="none" stroke={c} strokeWidth={1.6} />
        </>
      ) : null}
    </Svg>
  );
}

// Logged-in app: one live player document shared by all tabs, with the System tab bar.
export default function Shell({ user }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const state = usePlayer(user.uid);
  const [tab, setTab] = useState("status");
  const [penaltyView, setPenaltyView] = useState(null); // null | "intro" | "manual"
  const [focus, setFocus] = useState(null); // a quest to open on the board: { id, slot }
  const [skillFocus, setSkillFocus] = useState(null); // a skill page to open in the Skills tab
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

  // Notifications: keep the phone's schedule in line with the player (debounced), and follow taps.
  useEffect(() => { setupNotifications(); }, []);
  useEffect(() => {
    if (!player) return;
    const id = setTimeout(() => { syncNotifications(player, user.uid).catch(() => {}); }, 1500);
    return () => clearTimeout(id);
  }, [player, user.uid]);
  // Your public card for friends (debounced; only written when something a friend sees changed).
  useEffect(() => {
    if (!player) return;
    const id = setTimeout(() => { syncPublic(user.uid, player).catch(() => {}); }, 3000);
    return () => clearTimeout(id);
  }, [player, user.uid]);
  useEffect(() => onNotificationTap((data) => {
    if (data.kind === "urgent") offerNotifiedUrgent(user.uid).catch(() => {});
    else if (data.kind === "quests") setTab("quests");
    else if (data.kind === "status") setTab("status");
    else if (data.kind === "skill" && data.skill) { setSkillFocus(data.skill); setTab("skills"); }
  }), [user.uid]);

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flex: 1 }}>
        {tab === "status" ? <Status user={user} {...state} onOpenQuests={() => setTab("quests")} onOpenSettings={() => setTab("settings")} /> : null}
        {tab === "quests" ? (state.player ? <Quests user={user} player={state.player} focus={focus} onFocusDone={() => setFocus(null)} onOpenSkill={(id) => { setSkillFocus(id); setTab("skills"); }} /> : <Status user={user} {...state} />) : null}
        {tab === "skills" ? (state.player ? <Skills user={user} player={state.player} onGoToQuest={(f) => { setFocus(f); setTab("quests"); }} focusSkill={skillFocus} onFocusDone={() => setSkillFocus(null)} /> : <Status user={user} {...state} />) : null}
        {tab === "friends" ? (state.player ? <Friends user={user} player={state.player} /> : <Status user={user} {...state} />) : null}
        {tab === "settings" ? (state.player ? <Settings user={user} player={state.player} synced={state.synced} /> : <Status user={user} {...state} />) : null}
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
