// Guild: request a quest. Stat -> skill (3 suggestions + all) -> quest (gym and philosophy have their own step).
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { acceptQuest, currentDay, rewardPreview, MAX_GUILD_QUESTS } from "../lib/day";
import { GUILD, GYM_BAND, GYM_COUNTS, GYM_LENGTHS, GYM_SESSIONS, PHILOSOPHY, suggestSkills } from "../game/guild";
import { STATS } from "../game/quests";
import { statValue } from "../game/economy";
import { Coins, Frame, Glow, HexBadge, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

function Chevron({ c, back }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24"><Path d={back ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} fill="none" stroke={c} strokeWidth={1.8} /></Svg>
  );
}

function Choice({ label, on, onPress, num }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}
      style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: "center", alignItems: "center", flexGrow: num ? 1 : 0, flexBasis: num ? 0 : "auto",
        backgroundColor: on ? "rgba(159,203,255,0.18)" : "rgba(5,10,24,0.7)", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)" }}>
      <Text style={{ fontFamily: num ? font.num : font.bodyBold, fontSize: num ? 18 : 14, color: on ? "#FFFFFF" : "#B8C7E3" }}>{label}</Text>
    </Pressable>
  );
}

export default function Guild({ user, player, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const day = currentDay(player, user.uid);
  const [screen, setScreen] = useState("stats");
  const [stat, setStat] = useState("STR");
  const [skill, setSkill] = useState(null);
  const [seed, setSeed] = useState(0);
  const [session, setSession] = useState(0);
  const [len, setLen] = useState(1);
  const [school, setSchool] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState(null);

  const rankOf = (id) => player.skillRanks?.[id] ?? "F";
  const openSkill = (s) => { setSkill(s); setError(null); setScreen(s.kind === "gym" ? "gym" : s.kind === "philo" ? "philo" : "quest"); };

  let questId = null;
  if (screen === "quest" && skill) questId = `g:${skill.id}`;
  if (screen === "gym") questId = `g:gym:${session}:${GYM_LENGTHS[len]}`;
  const path = school ? PHILOSOPHY.find((p) => p.id === school) : null;
  const readIdx = path ? player.philosophy?.[path.id] ?? 0 : 0;
  const reading = path?.readings[readIdx];
  if (screen === "reading" && reading) questId = `g:philo:${path.id}:${readIdx}`;
  const reward = questId ? rewardPreview(day, questId) : null;

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await acceptQuest(user.uid, questId);
      setAccepted(screen === "gym" ? `${GYM_SESSIONS[session].name}, ${GYM_LENGTHS[len]} min` : screen === "reading" ? reading[0] : `${skill.name}: ${skill.quest}`);
      setScreen("done");
    } catch (e) {
      setError(e.message === "board-full" ? fill(t.guild.boardFull, { n: MAX_GUILD_QUESTS }) : e.message === "already-on-board" ? t.guild.alreadyOn : t.guild.failed);
    } finally {
      setBusy(false);
    }
  }

  const back = {
    stats: null,
    skills: () => setScreen("stats"),
    quest: () => setScreen("skills"),
    gym: () => setScreen("skills"),
    philo: () => setScreen("skills"),
    reading: () => setScreen("philo"),
    done: null,
  }[screen];
  const backLabel = { skills: t.guild.stats, quest: t.stats[stat], gym: t.stats[stat], philo: t.stats[stat], reading: t.guild.schools }[screen];

  let kicker = t.guild.kicker, heading = t.guild.title, sub = t.guild.pickStat;
  if (screen === "skills") { kicker = `${stat} · ${statValue(player.statXp?.[stat] ?? 0)}`; heading = t.stats[stat]; sub = t.guild.pickSkill; }
  if (["quest", "gym", "philo"].includes(screen)) {
    kicker = `${stat} · ${fill(t.guild.rank, { rank: rankOf(skill.id) })}`; heading = skill.name;
    sub = screen === "gym" ? t.guild.pickSession : screen === "philo" ? t.guild.pickSchool : t.guild.yourQuest;
  }
  if (screen === "reading") { kicker = "WIL · PHILOSOPHY"; heading = path.name; sub = t.guild.nextReading; }
  if (screen === "done") { kicker = "GUILD"; heading = t.guild.accepted; sub = ""; }

  const RewardRow = () => reward ? (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: color.line }}>
      <Label>{t.guild.reward}</Label>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Coins value={reward.coins} sign="+" size={18} />
        <Text style={{ fontFamily: font.num, fontSize: 18, color: color.accent }}>+{reward.xp} <Text style={{ fontSize: 13 }}>{t.status.exp}</Text></Text>
      </View>
    </View>
  ) : null;
  const AcceptBlock = () => (
    <View style={{ gap: 10 }}>
      {error ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.dangerSoft }}>{error}</Text> : null}
      <SysButton label={t.guild.accept} onPress={accept} disabled={busy || !questId} />
    </View>
  );
  const Counts = ({ text, title = t.guild.whatCounts }) => (
    <View style={{ gap: 4 }}>
      <Label>{title}</Label>
      <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: "#CAD6EC" }}>{text}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
        <Glow height={420} at={0.16} />
        <View style={{ minHeight: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {back ? (
            <Pressable accessibilityRole="button" onPress={back} hitSlop={8} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Chevron c={color.muted} back />
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{backLabel}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Chevron c={color.muted} back />
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{t.tabs.quests}</Text>
            </Pressable>
          )}
          <Coins value={player.coins ?? 0} size={18} />
        </View>

        <View style={{ alignItems: "center", gap: 4, marginTop: 12 }}>
          <Label style={{ letterSpacing: 4 }}>{kicker}</Label>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 26, letterSpacing: 1, color: "#FFFFFF", textAlign: "center" }}>{heading}</Text>
          {sub ? <Text style={{ fontFamily: font.body, fontSize: 14, color: color.muted, textAlign: "center" }}>{sub}</Text> : null}
        </View>

        {screen === "stats" ? (
          <View style={{ marginTop: 22, gap: 12 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {STATS.map((s) => (
                <Pressable key={s} accessibilityRole="button" onPress={() => { setStat(s); setSeed(0); setScreen("skills"); }} style={{ width: "48%", flexGrow: 1 }}>
                  <Frame cut={12} contentStyle={{ minHeight: 104, padding: 12, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <HexBadge w={36} h={40} label={s} lit />
                      <Text style={{ fontFamily: font.num, fontSize: 24, color: color.hi }}>{statValue(player.statXp?.[s] ?? 0)}</Text>
                    </View>
                    <View style={{ gap: 1 }}>
                      <Text numberOfLines={1} style={{ fontFamily: font.bold, fontSize: 15, color: color.text }}>{t.stats[s]}</Text>
                      <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.guild.skillsCount, { n: GUILD[s].length })}</Text>
                    </View>
                  </Frame>
                </Pressable>
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={() => {
              const s = STATS[Math.floor(Math.random() * STATS.length)];
              const simple = GUILD[s].filter((k) => k.kind === "simple");
              setStat(s); openSkill(simple[Math.floor(Math.random() * simple.length)]);
            }} style={{ minHeight: 52, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.35)", backgroundColor: "rgba(159,203,255,0.06)" }}>
              <Text style={{ fontFamily: font.bold, fontSize: 14, letterSpacing: 3, color: color.frame }}>{t.guild.random}</Text>
            </Pressable>
          </View>
        ) : null}

        {screen === "skills" ? (
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Label tone={color.hi}>{t.guild.suggested}</Label>
              <Pressable accessibilityRole="button" onPress={() => setSeed((n) => n + 1)} hitSlop={8} style={{ minHeight: 40, justifyContent: "center" }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.guild.newPicks}</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {suggestSkills(stat, player.lastDoneBySkill, seed).map((s) => (
                <Pressable key={s.id} accessibilityRole="button" onPress={() => openSkill(s)} style={{ flex: 1 }}>
                  <Frame kind="premium" cut={10} contentStyle={{ minHeight: 118, padding: 10, gap: 6 }}>
                    <HexBadge w={26} h={30} label={rankOf(s.id)} labelSize={11} />
                    <Text style={{ fontFamily: font.bold, fontSize: 14, lineHeight: 18, color: "#FFFFFF" }}>{s.name}</Text>
                    <Text style={{ fontFamily: font.body, fontSize: 11, lineHeight: 15, color: color.muted }}>{s.quest}</Text>
                  </Frame>
                </Pressable>
              ))}
            </View>
            <Label style={{ marginTop: 20 }}>{fill(t.guild.allSkills, { stat, n: GUILD[stat].length })}</Label>
            <Frame style={{ marginTop: 8 }}>
              {GUILD[stat].map((s, i) => (
                <Pressable key={s.id} accessibilityRole="button" onPress={() => openSkill(s)}
                  style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: i === GUILD[stat].length - 1 ? 0 : 1, borderBottomColor: color.line }}>
                  <HexBadge w={28} h={32} label={rankOf(s.id)} labelSize={11} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{s.name}</Text>
                    <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{s.quest}</Text>
                  </View>
                  <Chevron c={color.muted} />
                </Pressable>
              ))}
            </Frame>
            <Text style={{ marginTop: 10, fontFamily: font.body, fontSize: 12, color: color.muted, textAlign: "center" }}>{t.guild.rankNote}</Text>
          </View>
        ) : null}

        {screen === "quest" ? (
          <Frame style={{ marginTop: 20 }} contentStyle={{ padding: 16, gap: 12 }}>
            <Label tone={color.accent}>{skill.name.toUpperCase()}</Label>
            <Text style={{ fontFamily: font.bold, fontSize: 20, lineHeight: 26, color: "#FFFFFF" }}>{skill.quest}</Text>
            <Counts text={skill.counts} />
            <RewardRow />
            <AcceptBlock />
          </Frame>
        ) : null}

        {screen === "gym" ? (
          <Frame style={{ marginTop: 20 }} contentStyle={{ padding: 16, gap: 14 }}>
            <Label>{t.guild.session}</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {GYM_SESSIONS.map((s, i) => <Choice key={s.name} label={s.name} on={session === i} onPress={() => setSession(i)} />)}
            </View>
            <Label>{t.guild.length}</Label>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {GYM_LENGTHS.map((m, i) => <Choice key={m} num label={fill(t.guild.min, { n: m })} on={len === i} onPress={() => setLen(i)} />)}
            </View>
            <Counts title={fill(t.guild.yourSession, { rank: rankOf("gym") })} text={`${GYM_BAND} ${GYM_SESSIONS[session].plan}`} />
            <Counts text={GYM_COUNTS} />
            <RewardRow />
            <AcceptBlock />
          </Frame>
        ) : null}

        {screen === "philo" ? (
          <Frame style={{ marginTop: 20 }}>
            {PHILOSOPHY.map((p, i) => {
              const done = player.philosophy?.[p.id] ?? 0;
              return (
                <Pressable key={p.id} accessibilityRole="button" onPress={() => { setSchool(p.id); setError(null); setScreen("reading"); }}
                  style={{ padding: 14, gap: 8, borderBottomWidth: i === PHILOSOPHY.length - 1 ? 0 : 1, borderBottomColor: color.line }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                    <Text style={{ fontFamily: font.bold, fontSize: 16, color: "#FFFFFF" }}>{p.name}</Text>
                    <Text style={{ fontFamily: font.num, fontSize: 16, color: color.frame }}>{done} / {p.readings.length}</Text>
                  </View>
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{p.who}</Text>
                  <View style={{ height: 3, backgroundColor: "rgba(159,203,255,0.12)" }}>
                    <View style={{ height: 3, width: `${(done / p.readings.length) * 100}%`, backgroundColor: color.accent }} />
                  </View>
                </Pressable>
              );
            })}
          </Frame>
        ) : null}

        {screen === "reading" ? (
          <Frame style={{ marginTop: 20 }} contentStyle={{ padding: 16, gap: 12 }}>
            {reading ? (
              <>
                <Label tone={color.accent}>{fill(t.guild.readingOf, { n: readIdx + 1, total: path.readings.length })}</Label>
                <Text style={{ fontFamily: font.bold, fontSize: 21, color: "#FFFFFF" }}>{reading[0]}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{reading[1]}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 22, color: "#CAD6EC" }}>{reading[2]}</Text>
                <View style={{ padding: 12, gap: 4, backgroundColor: "rgba(159,203,255,0.06)", borderLeftWidth: 2, borderLeftColor: "rgba(207,228,255,0.6)" }}>
                  <Label>{t.guild.think}</Label>
                  <Text style={{ fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 21, color: "#FFFFFF" }}>{reading[3]}</Text>
                </View>
                <RewardRow />
                <AcceptBlock />
              </>
            ) : (
              <Text style={{ fontFamily: font.body, fontSize: 15, color: color.text }}>{t.guild.pathDone}</Text>
            )}
          </Frame>
        ) : null}

        {screen === "done" ? (
          <View style={{ marginTop: 26, alignItems: "center", gap: 14 }}>
            <HexBadge w={70} h={78} label="✓" labelSize={30} fill={color.frame} ink={color.panelBottom} />
            <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 22, color: "#CAD6EC", textAlign: "center" }}>{fill(t.guild.acceptedText, { title: accepted })}</Text>
            <SysButton label={t.guild.backBoard} onPress={onClose} style={{ alignSelf: "stretch" }} />
            <Pressable accessibilityRole="button" onPress={() => { setScreen("stats"); setSkill(null); }} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{t.guild.another}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
