// Skills tab: your trained skills first, then every skill: search, filter, fold per stat, or a random one.
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GUILD, skillById } from "../game/guild";
import { STATS } from "../game/quests";
import { dayNum, skillView } from "../game/skills";
import Guild from "./Guild";
import SkillPage from "./SkillPage";
import { Coins, Frame, Glow, Label } from "./sys";
import { AMBER, RankHex, StepBar, skillStatus } from "./skillParts";
import { useTheme } from "../theme";
import { t } from "../i18n";
import StatInfo from "./StatInfo";
import ProgramsSection from "./Programs";
import { interestSkills } from "../game/profile";
import { ladderById } from "../game/ladders";
import { tapFeel } from "../lib/haptics";
import { statValue } from "../game/economy";
const FILTERS = ["all", "new", "trained", "rust", "liked"];
const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

function Row({ v, name, onPress }) {
  const { color, font } = useTheme();
  const st = skillStatus(v);
  const tone = st.tone === "amber" ? AMBER : st.tone === "hi" ? color.accent : color.muted;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${t.skills.rank} ${v.letter}`} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}>
      <RankHex v={v} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: v.trained ? color.text : "#B8C7E3" }}>{name}</Text>
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 11, letterSpacing: 0.5, color: tone }}>{st.text}</Text>
      </View>
      {v.trained ? <View style={{ width: 64 }}><StepBar value={v.bar} dim={v.draining || v.rusty} /></View> : null}
      <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" fill="none" stroke={color.muted} strokeWidth={1.8} /></Svg>
    </Pressable>
  );
}

export default function Skills({ user, player, onGoToQuest, focusSkill, onFocusDone }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  // Opened from somewhere else (a quest or the body report): start on that skill's page.
  const [open, setOpen] = useState(focusSkill ?? null);
  useEffect(() => {
    if (focusSkill) onFocusDone?.();
  }, [focusSkill, onFocusDone]);
  const [guildFor, setGuildFor] = useState(null);
  const [info, setInfo] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [openStats, setOpenStats] = useState(["STR"]);
  const toggle = (st) => setOpenStats((o) => (o.includes(st) ? o.filter((x) => x !== st) : [...o, st]));

  if (guildFor) return <Guild user={user} player={player} initialSkill={guildFor} onClose={() => setGuildFor(null)} onAccepted={(id) => { const from = guildFor; setGuildFor(null); onGoToQuest?.({ id, slot: "guild" }, from); }} />;
  if (open) return <SkillPage user={user} player={player} id={open} onBack={() => setOpen(null)} onRequest={() => setGuildFor(open)} />;

  const today = dayNum();
  const view = (id) => skillView(id, player.skills?.[id], today);
  const yours = Object.keys(skillById).map(view).filter((v) => v.trained)
    .sort((a, b) => a.since - b.since || b.rank - a.rank);

  // Browsing: search by name, filter by state, fold per stat.
  const liked = interestSkills(player.profile);
  const q = query.trim().toLowerCase();
  const searching = q.length > 0 || filter !== "all";
  const passes = (sk) => {
    if (q && !`${sk.id} ${sk.name} ${sk.quest} ${sk.counts ?? ""} ${ladderById[sk.id]?.note ?? ""}`.toLowerCase().includes(q)) return false;
    const v = view(sk.id);
    if (filter === "new") return !v.trained;
    if (filter === "trained") return v.trained;
    if (filter === "rust") return v.rusty || v.draining || (v.rustIn != null && v.rustIn <= 3);
    if (filter === "liked") return liked.has(sk.id);
    return true;
  };
  const shown = (st) => GUILD[st].filter(passes);

  // A random skill you haven't trained yet (your interests twice as likely), from what the filter shows.
  function randomSkill() {
    const pool = STATS.flatMap(shown);
    const fresh = pool.filter((sk) => !view(sk.id).trained);
    const from = fresh.length ? fresh : pool.length ? pool : Object.values(skillById);
    const weighted = from.flatMap((sk) => (liked.has(sk.id) ? [sk, sk] : [sk]));
    const pick = weighted[Math.floor(Math.random() * weighted.length)];
    tapFeel();
    setOpen(pick.id);
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 40, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
        <Glow height={420} at={0.2} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
          <Label tone={color.hi} style={{ letterSpacing: 5, fontSize: 12 }}>{t.status.system}</Label>
          <Coins value={player.coins ?? 0} size={18} />
        </View>
        <View style={{ alignItems: "center", gap: 4, marginTop: 20, marginBottom: 18 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 26, letterSpacing: 1, color: "#FFFFFF" }}>{t.skills.title}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 14, color: color.muted, textAlign: "center" }}>{t.skills.sub}</Text>
        </View>

        <View style={{ marginTop: 18 }}><ProgramsSection user={user} player={player} /></View>

        <Frame kind="premium" cut={16} contentStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
          <Label tone={color.hi}>{t.skills.yours}</Label>
          {yours.length ? (
            <View style={{ marginTop: 4 }}>
              {yours.map((v, i) => (
                <View key={v.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                  <Row v={v} name={skillById[v.id].name} onPress={() => setOpen(v.id)} />
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ marginTop: 10, marginBottom: 8, fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.muted }}>{t.skills.yoursEmpty}</Text>
          )}
        </Frame>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 26, marginBottom: 10, paddingHorizontal: 4 }}>
          <Label>{fill(t.skills.allCount, { n: Object.keys(skillById).length })}</Label>
          <Pressable accessibilityRole="button" accessibilityHint={t.skills.randomHint} onPress={randomSkill} hitSlop={6}
            style={({ pressed }) => ({ minHeight: 40, flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.6 : 1 })}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z" fill="none" stroke={color.accent} strokeWidth={1.6} strokeLinejoin="round" />
              <Path d="M9 9.5h.01M15 9.5h.01M12 12h.01M9 14.5h.01M15 14.5h.01" stroke={color.accent} strokeWidth={2.6} strokeLinecap="round" />
            </Svg>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.skills.random}</Text>
          </Pressable>
        </View>
        <TextInput value={query} onChangeText={setQuery} placeholder={t.skills.search} placeholderTextColor="#4A5A7A" accessibilityLabel={t.skills.search}
          autoCorrect={false} clearButtonMode="while-editing"
          style={{ minHeight: 46, paddingHorizontal: 12, fontFamily: font.body, fontSize: 15, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
          {FILTERS.map((f) => {
            const on = filter === f;
            return (
              <Pressable key={f} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setFilter(f)}
                style={{ minHeight: 40, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? "#FFFFFF" : color.muted }}>{t.skills.filters[f]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {searching && !STATS.some((st) => shown(st).length) ? (
          <Text style={{ marginTop: 10, fontFamily: font.body, fontSize: 14, color: color.muted, textAlign: "center" }}>{t.skills.noMatch}</Text>
        ) : null}
        {STATS.map((st) => {
          const list = shown(st);
          if (searching && !list.length) return null;
          const open = searching || openStats.includes(st);
          return (
            <Frame key={st} cut={14} style={{ marginTop: 8 }} contentStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52 }}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => toggle(st)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52 }}>
                  <Text style={{ width: 34, fontFamily: font.bold, fontSize: 12, letterSpacing: 1, color: color.accent }}>{st}</Text>
                  <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 16, color: "#FFFFFF" }}>{t.stats[st]}</Text>
                  <Text style={{ fontFamily: font.num, fontSize: 15, color: color.muted }}>{list.length}</Text>
                  <Text style={{ width: 16, textAlign: "center", fontFamily: font.bold, fontSize: 18, color: color.muted }}>{open ? "−" : "+"}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`${t.statInfo.whatIs} ${t.stats[st]}`} onPress={() => setInfo(st)} hitSlop={8}
                  style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: color.muted, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 12, color: color.muted }}>?</Text>
                </Pressable>
              </View>
              {open ? (list.length ? list.map((sk) => (
                <View key={sk.id} style={{ borderTopWidth: 1, borderTopColor: color.line }}>
                  <Row v={view(sk.id)} name={sk.name} onPress={() => setOpen(sk.id)} />
                </View>
              )) : <Text style={{ paddingVertical: 10, fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.skills.noneHere}</Text>) : null}
            </Frame>
          );
        })}
      </ScrollView>
      <StatInfo stat={info} value={info ? statValue(player.statXp?.[info] ?? 0) : null} onClose={() => setInfo(null)} onOpenSkill={(id) => setOpen(id)} />
    </View>
  );
}
