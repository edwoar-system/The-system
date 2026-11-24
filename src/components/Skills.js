// Skills tab: your trained skills first, then every skill by stat. Tap one for its page.
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
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
import { statValue } from "../game/economy";

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
  const [stat, setStat] = useState("STR");
  const [info, setInfo] = useState(null);

  if (guildFor) return <Guild user={user} player={player} initialSkill={guildFor} onClose={() => setGuildFor(null)} onAccepted={(id) => { const from = guildFor; setGuildFor(null); onGoToQuest?.({ id, slot: "guild" }, from); }} />;
  if (open) return <SkillPage user={user} player={player} id={open} onBack={() => setOpen(null)} onRequest={() => setGuildFor(open)} />;

  const today = dayNum();
  const view = (id) => skillView(id, player.skills?.[id], today);
  const yours = Object.keys(skillById).map(view).filter((v) => v.trained)
    .sort((a, b) => a.since - b.since || b.rank - a.rank);

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

        <Label style={{ marginTop: 26, marginBottom: 10, marginLeft: 4 }}>{t.skills.all}</Label>
        <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6 }}>
          {STATS.map((s) => {
            const on = s === stat;
            return (
              <Pressable key={s} accessibilityRole="tab" accessibilityLabel={t.stats[s]} accessibilityState={{ selected: on }} onPress={() => setStat(s)}
                style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: on ? "rgba(159,203,255,0.18)" : "rgba(5,10,24,0.7)", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)" }}>
                <Text style={{ fontFamily: font.bold, fontSize: 12, letterSpacing: 1, color: on ? "#FFFFFF" : "#B8C7E3" }}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable accessibilityRole="button" onPress={() => setInfo(stat)} style={{ minHeight: 40, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, paddingHorizontal: 4 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{t.stats[stat]}</Text>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.statInfo.whatIs}</Text>
        </Pressable>
        <Frame cut={14} style={{ marginTop: 4 }} contentStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}>
          {GUILD[stat].map((s, i) => (
            <View key={s.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
              <Row v={view(s.id)} name={s.name} onPress={() => setOpen(s.id)} />
            </View>
          ))}
        </Frame>
      </ScrollView>
      <StatInfo stat={info} value={info ? statValue(player.statXp?.[info] ?? 0) : null} onClose={() => setInfo(null)} onOpenSkill={(id) => setOpen(id)} />
    </View>
  );
}
