import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View, Platform } from "react-native";
import Svg, { Circle, Path, Polygon } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../lib/player";
import Status from "./Status";
import Quests from "./Quests";
import Skills from "./Skills";
import Settings from "./Settings";
import Friends from "./Friends";
import Learn from "./Learn";
import Urgent from "./Urgent";
import PenaltyZone, { PenaltyBar, ShieldNotice } from "./PenaltyZone";
import { checkPenalty, dismissNotice } from "../lib/penalty";
import { onNotificationTap, setupNotifications, syncNotifications } from "../lib/notify";
import { offerNotifiedUrgent } from "../lib/urgent";
import { settleTrolls, syncPublic, useTrolls } from "../lib/social";
import { trollById, trollQueue, trollTitleFor } from "../game/social";
import { SKINS, activeAppTime } from "../game/shop";
import { leftText } from "./Shop";
import { ensureDay, setQuestCache } from "../lib/day";
import { todayKey } from "../game/quests";
import { setFeel, tapFeel } from "../lib/haptics";
import { skillById } from "../game/guild";

import { isInPenalty } from "../game/penalty";
import { useTheme, SkinProvider } from "../theme";
import { t } from "../i18n";
import { useSituation } from "../lib/location";
import { useWeather } from "../lib/weather";
import { useAgendaSync } from "../lib/calendar";
import SystemPopup from "./SystemPopup";
import QuestClear from "./QuestClear";
import Welcome from "./Welcome";
import ErrorCatcher from "./ErrorCatcher";
import { useReminderAlerts } from "../lib/reminders";
import { useLevelRewards } from "../lib/level";
import { useTitleAlerts } from "../lib/titles";
import { useObserverEvents } from "../lib/observers";
import { useLinkActions } from "../lib/links";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

// The shop will open from your coins (it comes with app blocking), so friends take its place in the bar.
const TABS = ["status", "quests", "skills", "learn", "friends", "settings"];

function TabIcon({ id, active, c }) {
  const p = { fill: active ? "rgba(159,203,255,0.25)" : "none", stroke: c, strokeWidth: 1.6 };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {id === "status" ? <Polygon points="12,2.5 20.5,7.3 20.5,16.7 12,21.5 3.5,16.7 3.5,7.3" {...p} /> : null}
      {id === "quests" ? <Path d="M6 3h12v18l-6-4-6 4z" {...p} /> : null}
      {id === "skills" ? <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...p} fill="none" /> : null}
      {id === "learn" ? (
        <>
          <Path d="M12 6.5C9.5 4.8 6.5 4.3 3.5 4.8v13.5c3-.5 6 0 8.5 1.7 2.5-1.7 5.5-2.2 8.5-1.7V4.8c-3-.5-6 0-8.5 1.7z" {...p} />
          <Path d="M12 6.5V20" stroke={c} strokeWidth={1.6} />
        </>
      ) : null}
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

// An open troll quest: shown on every tab until it's done (with app blocking, your apps stay locked too).
function TrollBanner({ troll, player, more, onPress }) {
  const { font } = useTheme();
  const insets = useSafeAreaInsets();
  const x = trollById[troll.troll];
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, paddingTop: insets.top }}>
      <Pressable accessibilityRole="button" onPress={onPress}
        style={({ pressed }) => ({ marginHorizontal: 10, marginTop: 4, paddingHorizontal: 14, paddingVertical: 10, gap: 2, borderWidth: 1, borderColor: "#F6B45A", backgroundColor: pressed ? "rgba(40,28,10,0.98)" : "rgba(20,14,6,0.97)" })}>
        <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: "#F6B45A" }}>{t.troll.bannerKicker}</Text>
        <Text numberOfLines={1} style={{ fontFamily: font.bodyBold, fontSize: 14, color: "#FFFFFF" }}>
          {fill(t.troll.banner, { title: trollTitleFor(x, player), name: troll.fromName })}{more > 0 ? `  ${fill(t.troll.bannerMore, { n: more })}` : ""}
        </Text>
      </Pressable>
    </View>
  );
}

// App time from the shop: how much is left, on every tab.
function AppTimeBanner({ appTime }) {
  const { color, font } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(id); }, []);
  if (appTime.end <= now) return null;
  const kind = appTime.kind === "mixed" ? t.shop.mixed : t.shop.kinds[appTime.kind];
  return (
    <View pointerEvents="none" style={{ position: "absolute", right: 12, bottom: 10 }}>
      <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: color.frame, backgroundColor: "rgba(6,14,30,0.95)" }}>
        <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: "#FFFFFF" }}>{fill(t.shop.banner, { kind, left: leftText(appTime.end - now) })}</Text>
      </View>
    </View>
  );
}

// Back to where you were. Sits above the tab bar until you use it or pick a tab yourself.
function BackPill({ place, onPress }) {
  const { color, font } = useTheme();
  const label = place.focus ? t.back.quest
    : place.skillFocus ? fill(t.back.to, { place: skillById[place.skillFocus]?.name ?? t.tabs.skills })
    : fill(t.back.to, { place: t.tabs[place.tab] });
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "flex-start" }}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { tapFeel(); onPress(); }}
        style={({ pressed }) => ({ marginLeft: 12, marginBottom: 10, minHeight: 44, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8,
          borderWidth: 1, borderColor: color.frame, backgroundColor: pressed ? "rgba(30,50,90,0.98)" : "rgba(8,16,34,0.96)" })}>
        <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.accent, marginTop: -2 }}>‹</Text>
        <Text numberOfLines={1} style={{ maxWidth: 240, fontFamily: font.bodyBold, fontSize: 14, color: "#FFFFFF" }}>{label}</Text>
      </Pressable>
    </View>
  );
}

// Logged-in app: one live player document shared by all tabs, with the System tab bar.
// Your skin from the shop colours the whole app (frames, buttons, glow, the tab bar).
export default function Shell({ user }) {
  const state = usePlayer(user.uid);
  const skin = state.player?.skin;
  return (
    <SkinProvider id={skin} skin={skin && skin !== "system" ? SKINS[skin] : null}>
      <ShellBody user={user} state={state} />
    </SkinProvider>
  );
}

function ShellBody({ user, state }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState("status");
  const [penaltyView, setPenaltyView] = useState(null); // null | "intro" | "manual"
  const [focus, setFocus] = useState(null); // a quest to open on the board: { id, slot }
  const [skillFocus, setSkillFocus] = useState(null); // a skill page to open in the Skills tab
  const [courseFocus, setCourseFocus] = useState(null); // a course to open in the Learn tab
  const [assessFocus, setAssessFocus] = useState(false); // open the rank assessment in the Skills tab
  // Where Back returns to after you got sent somewhere (a quest's skill page, a guild quest on the board...).
  const [trail, setTrail] = useState([]); // [{ tab, focus?, skillFocus? }]
  const checking = useRef(false);
  const player = state.player;
  // Where you are and the weather, kept fresh app-wide (urgent quests and the board use them).
  useSituation(player);
  useWeather(player);
  useAgendaSync(user.uid, player);
  useReminderAlerts(player);
  useLevelRewards(user.uid, player);
  useTitleAlerts(user.uid, player);
  useObserverEvents(user.uid);
  // Website: the page behind the app and Safari's own bars take your skin's background, so no white edges.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    document.documentElement.style.backgroundColor = color.bg;
    document.body.style.backgroundColor = color.bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color.bg);
  }, [color.bg]);
  const inPenalty = isInPenalty(player);

  const open = (place) => {
    setTab(place.tab);
    if (place.focus) setFocus(place.focus);
    if (place.skillFocus) setSkillFocus(place.skillFocus);
    if (place.course) setCourseFocus(place.course);
    if (place.assess) setAssessFocus(true);
  };
  // from: the exact place you're leaving (defaults to the current tab).
  const goTo = (place, from) => { setTrail((tr) => [...tr, from ?? { tab }].slice(-8)); open(place); };
  const goBack = () => {
    const last = trail[trail.length - 1];
    if (!last) return;
    setTrail(trail.slice(0, -1));
    open(last);
  };

  // Your gym split for gym quests, and today's board saved once a day.
  setQuestCache(player);
  const dayDate = player?.day?.date;
  useEffect(() => {
    if (player && dayDate !== todayKey()) ensureDay(user.uid).catch(() => {});
  }, [player, dayDate, user.uid]);

  // Troll quests: a banner on every tab while one is open; and your sent ones pay your title's coins back.
  const trollQ = trollQueue(useTrolls(user.uid));
  useEffect(() => { settleTrolls(user.uid).catch(() => {}); }, [user.uid]);

  // Your sound and vibration choice for every vibration and sound in the app.
  useEffect(() => { setFeel(player?.feel); }, [player?.feel]);

  const goToRef = useRef(goTo);
  goToRef.current = goTo;
  // Links from the Shortcuts app or a bookmark (thesystem://do/water and so on).
  useLinkActions(user.uid, goToRef);

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
    else if (data.kind === "quests") goToRef.current({ tab: "quests" });
    else if (data.kind === "status") goToRef.current({ tab: "status" });
    else if (data.kind === "skill" && data.skill) goToRef.current({ tab: "skills", skillFocus: data.skill });
  }), [user.uid]);

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flex: 1 }}>
        {/* key={tab}: a broken screen resets when you switch tabs. */}
        <ErrorCatcher key={tab} place={tab} uid={user.uid} name={state.player?.name}>
        {tab === "status" ? <Status user={user} {...state} onOpenQuests={() => goTo({ tab: "quests" })} onOpenSettings={() => goTo({ tab: "settings" })} /> : null}
        {tab === "quests" ? (state.player ? <Quests user={user} player={state.player} focus={focus} onFocusDone={() => setFocus(null)}
          onOpenCourse={(id, sheet) => goTo({ tab: "learn", course: id }, { tab: "quests", focus: sheet ?? undefined })}
          onOpenSkill={(id, sheet) => goTo({ tab: "skills", skillFocus: id }, { tab: "quests", focus: sheet ?? undefined })}
          onOpenAssess={() => goTo({ tab: "skills", assess: true })} /> : <Status user={user} {...state} />) : null}
        {tab === "skills" ? (state.player ? <Skills user={user} player={state.player} focusSkill={skillFocus} onFocusDone={() => setSkillFocus(null)}
          openAssess={assessFocus} onAssessDone={() => setAssessFocus(false)}
          onOpenCourse={(id, fromSkill) => goTo({ tab: "learn", course: id }, { tab: "skills", skillFocus: fromSkill ?? undefined })}
          onGoToQuest={(f, fromSkill) => goTo({ tab: "quests", focus: f }, { tab: "skills", skillFocus: fromSkill ?? undefined })} /> : <Status user={user} {...state} />) : null}
        {tab === "learn" ? (state.player ? <Learn user={user} player={state.player}
          focusCourse={courseFocus} onCourseFocusDone={() => setCourseFocus(null)}
          onOpenSkill={(id) => goTo({ tab: "skills", skillFocus: id }, { tab: "learn" })}
          onGoToQuest={(f) => goTo({ tab: "quests", focus: f }, { tab: "learn" })} /> : <Status user={user} {...state} />) : null}
        {tab === "friends" ? (state.player ? <Friends user={user} player={state.player} /> : <Status user={user} {...state} />) : null}
        {tab === "settings" ? (state.player ? <Settings user={user} player={state.player} synced={state.synced} /> : <Status user={user} {...state} />) : null}
        </ErrorCatcher>
        {!trollQ.active.length && activeAppTime(player) && !penaltyView ? <AppTimeBanner appTime={player.appTime} /> : null}
        {trollQ.active.length && tab !== "quests" && !penaltyView ? <TrollBanner troll={trollQ.active[0]} player={player} more={trollQ.active.length + trollQ.waiting.length - 1} onPress={() => goTo({ tab: "quests" })} /> : null}
        {trail.length > 0 && !penaltyView ? <BackPill place={trail[trail.length - 1]} onPress={goBack} /> : null}
        {/* The first-start tip, on whichever tab a new player opens. */}
        {state.player ? <Welcome user={user} player={state.player} /> : null}
        {player && !penaltyView ? <Urgent user={user} player={player} /> : null}
        <QuestClear />
        <SystemPopup />
      </View>
      {player && penaltyView ? <PenaltyZone user={user} player={player} intro={penaltyView === "intro"} onClose={() => setPenaltyView(null)} /> : null}
      {player?.notice && !player.notice.seen && !penaltyView ? <ShieldNotice player={player} onClose={() => dismissNotice(user.uid)} /> : null}
      {inPenalty ? <PenaltyBar player={player} onOpen={() => setPenaltyView("manual")} /> : null}
      <View accessibilityRole="tablist" style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: color.line, backgroundColor: "rgba(1,4,10,0.96)", paddingBottom: Math.max(insets.bottom, 8) }}>
        {TABS.map((id) => {
          const active = tab === id;
          const c = active ? color.hi : color.muted;
          return (
            <Pressable key={id} accessibilityRole="tab" accessibilityLabel={t.tabs[id]} accessibilityState={{ selected: active }} onPress={() => { setTrail([]); setTab(id); }}
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
