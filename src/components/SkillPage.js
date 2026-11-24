// One skill: rank, progress inside the rank, the next rank trial (or a retest), rust, the last 14 days and the ladder.
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Polygon, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { skillById } from "../game/guild";
import { HABIT_LADDER, RANKS } from "../game/ladders";
import { dayNum, isHabit, skillView, trialItems } from "../game/skills";
import { setAchievement, takeTrial } from "../lib/skills";
import RankUp from "./RankUp";
import LevelUp from "./LevelUp";
import { AMBER, StepBar, fill, skillStatus } from "./skillParts";
import { Frame, Glow, Label, SysButton, hexPoints } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

function Chevron({ c }) {
  return <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" fill="none" stroke={c} strokeWidth={1.8} /></Svg>;
}

// A trial line you tick yourself (or that ticks itself, for counted things).
function TrialRow({ kind, text, done, onPress, auto, extra }) {
  const { color, font } = useTheme();
  const w = 26, h = 29;
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!done, disabled: !!auto }} accessibilityLabel={text}
      onPress={auto ? undefined : onPress} disabled={auto}
      style={({ pressed }) => ({ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.7 : 1 })}>
      <Svg width={w} height={h}>
        <Polygon points={hexPoints(w, h, 1)} fill={done ? color.frame : "rgba(159,203,255,0.08)"} stroke={color.frame} strokeOpacity={done ? 1 : 0.6} strokeWidth={1.3} />
        {done ? <Path d={`M${w * 0.3} ${h * 0.52} L${w * 0.45} ${h * 0.65} L${w * 0.71} ${h * 0.38}`} fill="none" stroke={color.panelBottom} strokeWidth={2.2} /> : null}
      </Svg>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 10, letterSpacing: 2, color: color.muted }}>{kind}</Text>
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 20, color: done ? "#FFFFFF" : color.text }}>{text}</Text>
      </View>
      {extra ? <Text style={{ fontFamily: font.num, fontSize: 17, color: done ? "#FFFFFF" : color.accent }}>{extra}</Text> : null}
    </Pressable>
  );
}

function Tile({ k, v, u, tone }) {
  const { color, font } = useTheme();
  return (
    <Frame cut={10} style={{ flex: 1 }} contentStyle={{ padding: 12, gap: 2 }}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 10, letterSpacing: 1, color: color.muted }}>{k}</Text>
      <Text style={{ fontFamily: font.num, fontSize: 26, lineHeight: 28, color: tone ?? color.text }}>{v}</Text>
      <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{u}</Text>
    </Frame>
  );
}

function Info({ title, text }) {
  const { color, font } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Label>{title.toUpperCase()}</Label>
      <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: "#CAD6EC" }}>{text}</Text>
    </View>
  );
}

export default function SkillPage({ user, player, id, onBack, onRequest }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const skill = skillById[id];
  const v = skillView(id, player.skills?.[id], dayNum());
  const L = v.ladder;
  const habit = isHabit(L);
  const st = skillStatus(v);

  const [placement, setPlacement] = useState(null); // a higher target rank
  const [checked, setChecked] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [rankUp, setRankUp] = useState(null);
  const [levelUp, setLevelUp] = useState(null);

  // What the trial asks: a retest of the earned rank when rusty, otherwise the next rank (or a placement).
  const retest = v.rusty;
  const target = retest ? v.earned : placement ?? v.rank + 1;
  const atTop = !retest && v.rank >= v.max;

  const items = [];
  if (retest) {
    items.push({ key: "main", kind: t.skills.mainTest, text: habit ? HABIT_LADDER[L.freq][target] : `${L.col}: ${L.ranks[target]}` });
  } else if (!atTop) {
    if (habit) {
      items.push({ key: "days", kind: t.skills.habitDays, text: HABIT_LADDER[L.freq][target], auto: true,
        done: v.next.count >= v.next.need, extra: `${v.next.count} / ${v.next.need}` });
    } else {
      items.push({ key: "main", kind: t.skills.mainTest, text: `${L.col}: ${L.ranks[target]}` });
    }
    trialItems(L, target).forEach((it) => items.push({
      key: it.key, kind: `${t.skills.achievement} · ${RANKS[it.rank]}`, text: it.text, saved: !!v.ticks[it.key],
    }));
  }
  const isDone = (it) => it.auto ? it.done : it.saved || !!checked[it.key];
  const met = items.filter(isDone).length;
  const canPass = !habit || retest ? items.length > 0 && met === items.length : false;

  async function toggle(it) {
    setError(null);
    if (habit && !retest) {
      // Habit achievements are saved right away; the rank follows by itself.
      try {
        const r = await setAchievement(user.uid, id, it.key, !it.saved);
        if (r.gained > 0) setRankUp({ letter: RANKS[r.rank], name: skill.name, xp: 0 });
      } catch { setError(t.skills.failed); }
      return;
    }
    if (it.saved) return;
    setChecked((c) => ({ ...c, [it.key]: !c[it.key] }));
  }

  async function pass() {
    setBusy(true);
    setError(null);
    try {
      const r = await takeTrial(user.uid, id, target);
      setChecked({});
      setPlacement(null);
      if (r.gained > 0 || retest) setRankUp({ letter: RANKS[r.rank], name: skill.name, xp: r.xp });
      if (r.levelUp) setLevelUp({ level: r.levelUp, xp: (player.xp ?? 0) + r.xp });
    } catch {
      setError(t.skills.failed);
    } finally {
      setBusy(false);
    }
  }

  const unlock = !retest && !atTop ? (L.trials?.[RANKS[target]] ?? "").match(/Unlocks ([^.]+)/)?.[1] : null;
  const ladderRows = RANKS.slice(0, v.max + 1).map((r, i) => ({ r, i, text: habit ? HABIT_LADDER[L.freq][i] : L.ranks[i] }));
  const barMax = Math.max(1, ...v.last14);
  const stTone = st.tone === "amber" ? AMBER : st.tone === "hi" ? color.frame : color.muted;
  const unit = L.freq === "weekly" ? t.skills.weeksUnit : t.skills.daysUnit;

  let progressLine = null;
  if (atTop) progressLine = habit ? t.skills.maxRank : t.skills.allRanks;
  else if (v.bar >= 1) progressLine = t.skills.ready;
  else if (habit) progressLine = fill(t.skills.habitLine, { a: v.next.count, b: v.next.need, w: v.next.window, unit: L.freq === "weekly" ? t.skills.weeks : t.skills.days });
  else progressLine = fill(t.skills.sessionsLine, { a: v.next.count, b: v.next.need });

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
        <Glow height={480} at={0.16} />
        <View style={{ minHeight: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Chevron c={color.muted} />
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{t.skills.back}</Text>
          </Pressable>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: st.tone === "amber" ? "rgba(246,180,90,0.5)" : "rgba(159,203,255,0.35)", backgroundColor: st.tone === "amber" ? "rgba(246,180,90,0.08)" : "rgba(159,203,255,0.08)" }}>
            <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: stTone }}>{st.text}</Text>
          </View>
        </View>

        {/* Rank hexagon */}
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <View style={{ width: 150, height: 168, alignItems: "center", justifyContent: "center" }}>
            <Svg width={150} height={168} style={{ position: "absolute" }}>
              <Defs>
                <LinearGradient id="spE" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#EAF4FF" />
                  <Stop offset="0.45" stopColor={v.rusty ? "#5B6F94" : color.purple} />
                  <Stop offset="1" stopColor={color.blue} />
                </LinearGradient>
                <LinearGradient id="spF" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#132A55" />
                  <Stop offset="1" stopColor="#0A0818" />
                </LinearGradient>
              </Defs>
              <Polygon points={hexPoints(150, 160, 2)} fill="url(#spF)" stroke="url(#spE)" strokeWidth={2.5} />
              <Polygon points={hexPoints(150, 160, 14)} fill="none" stroke={color.accent} strokeOpacity={0.3} strokeWidth={1} />
            </Svg>
            <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 4, color: "#B5C8EA", marginTop: -8 }}>{t.skills.rank}</Text>
            <Text style={{ fontFamily: font.num, fontSize: 72, lineHeight: 74, color: "#FFFFFF" }}>{v.letter}</Text>
          </View>
          <Text accessibilityRole="header" style={{ marginTop: 4, fontFamily: font.displayHeavy, fontSize: 28, letterSpacing: 1, color: "#FFFFFF", textAlign: "center" }}>{skill.name}</Text>
          <Text style={{ marginTop: 2, fontFamily: font.body, fontSize: 13, color: color.muted, textAlign: "center" }}>{L.stats}</Text>
        </View>

        {/* Progress inside the rank */}
        <View style={{ marginTop: 20, paddingHorizontal: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.muted }}>{fill(t.skills.progressIn, { rank: v.letter })}</Text>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.muted }}>{fill(t.skills.step, { n: v.step })}</Text>
          </View>
          <View style={{ marginTop: 8 }}><StepBar value={v.bar} height={8} dim={v.draining || v.rusty} /></View>
          <Text style={{ marginTop: 6, fontFamily: font.body, fontSize: 12, color: v.bar >= 1 && !atTop ? color.frame : color.muted }}>{progressLine}</Text>
          <View accessibilityRole="list" style={{ flexDirection: "row", marginTop: 14 }}>
            {RANKS.map((r, i) => {
              const cur = i === v.rank;
              const off = i > v.max;
              return (
                <View key={r} style={{ flex: 1, alignItems: "center", paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: cur ? color.purple : i < v.rank ? "rgba(96,160,255,0.45)" : "rgba(96,160,255,0.12)" }}>
                  <Text style={{ fontFamily: font.num, fontSize: cur ? 22 : 16, color: off ? "#2A3650" : cur ? "#FFFFFF" : i < v.rank ? "#8EA4C8" : "#44587A" }}>{r}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Rank trial */}
        {!atTop || retest ? (
          <Frame kind="premium" cut={16} style={{ marginTop: 22 }} contentStyle={{ padding: 16, gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Label tone={retest ? AMBER : "#EEF0FF"}>{fill(retest ? t.skills.retest : t.skills.trial, { rank: RANKS[target] })}</Label>
              <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.skills.met, { a: met, b: items.length })}</Text>
            </View>
            <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{habit && !retest ? t.skills.habitAuto : t.skills.confirm}</Text>
            {items.map((it) => <TrialRow key={it.key} kind={it.kind} text={it.text} done={isDone(it)} auto={it.auto} extra={it.extra} onPress={() => toggle(it)} />)}
            {unlock ? <Text style={{ fontFamily: font.body, fontSize: 13, color: "#CAD6EC" }}>{fill(t.skills.unlocks, { name: unlock })}</Text> : null}
            <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{fill(t.skills.proof, { type: t.skills.proofTypes[L.proof] })}</Text>
            {error ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.dangerSoft }}>{error}</Text> : null}
            {!habit || retest ? (
              <SysButton label={retest ? t.skills.passRetest : t.skills.pass} onPress={pass} disabled={!canPass || busy} style={{ marginTop: 6 }} />
            ) : null}
            {!habit && !retest && v.rank + 2 <= v.max ? (
              <View style={{ marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: color.line, gap: 8 }}>
                <Label>{t.skills.placementTitle}</Label>
                <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.skills.placementSub}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {RANKS.map((r, i) => i > v.rank && i <= v.max ? (
                    <Pressable key={r} accessibilityRole="button" accessibilityState={{ selected: target === i }} onPress={() => { setPlacement(i === v.rank + 1 ? null : i); setChecked({}); }}
                      style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: target === i ? "rgba(168,126,255,0.18)" : "rgba(5,10,24,0.7)", borderWidth: 1, borderColor: target === i ? color.purple : "rgba(159,203,255,0.22)" }}>
                      <Text style={{ fontFamily: font.num, fontSize: 18, color: target === i ? "#FFFFFF" : "#B8C7E3" }}>{r}</Text>
                    </Pressable>
                  ) : null)}
                </View>
              </View>
            ) : null}
          </Frame>
        ) : null}

        {/* Tiles */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Tile k={t.skills.streak} v={String(v.streak)} u={unit} />
          <Tile k={t.skills.total} v={v.hours >= 10 ? String(Math.round(v.hours)) : v.hours.toFixed(1)} u={t.skills.hours} />
          <Tile k={t.skills.rustIn} v={v.rustIn == null ? "–" : v.rustIn <= 0 ? t.skills.rustNow : String(v.rustIn)} u={v.rustIn != null && v.rustIn > 0 ? t.skills.daysUnit : ""} tone={v.rustIn != null && v.rustIn <= 3 ? AMBER : undefined} />
        </View>

        {/* Last 14 days */}
        <Frame cut={12} style={{ marginTop: 12 }} contentStyle={{ padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Text style={{ fontFamily: font.bold, fontSize: 16, color: color.text }}>{t.skills.last14}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.skills.minutesPerDay}</Text>
          </View>
          <View style={{ marginTop: 14, height: 80, flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
            {v.last14.map((m, i) => (
              <View key={i} style={{ flex: 1, height: m ? Math.max(6, Math.round((m / barMax) * 80)) : 3, backgroundColor: m ? (i === 13 ? color.frame : color.blue) : "rgba(96,160,255,0.14)", opacity: m && i !== 13 ? 0.75 : 1 }} />
            ))}
          </View>
          <View style={{ marginTop: 6, flexDirection: "row", justifyContent: "flex-end" }}>
            <Text style={{ fontFamily: font.body, fontSize: 11, color: "#7B8DB0" }}>{t.skills.today}</Text>
          </View>
        </Frame>

        {/* Ladder */}
        <Frame cut={12} style={{ marginTop: 12 }} contentStyle={{ padding: 16 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 16, color: color.text, marginBottom: 6 }}>{t.skills.ladder}</Text>
          {ladderRows.map(({ r, i, text }) => {
            const cur = i === v.rank;
            return (
              <View key={r} style={{ flexDirection: "row", gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: color.line, alignItems: "flex-start" }}>
                <Text style={{ width: 28, fontFamily: font.num, fontSize: 18, color: cur ? "#FFFFFF" : i < v.rank ? "#8EA4C8" : "#5B6F94" }}>{r}</Text>
                <Text style={{ flex: 1, fontFamily: cur ? font.bodyBold : font.body, fontSize: 14, lineHeight: 20, color: cur ? "#FFFFFF" : i < v.rank ? "#B8C7E3" : color.muted }}>{text}</Text>
              </View>
            );
          })}
        </Frame>

        {/* How it works */}
        <Frame cut={12} style={{ marginTop: 12 }} contentStyle={{ padding: 16, gap: 14 }}>
          <Info title={t.skills.howRank} text={habit ? L.target : L.note} />
          <Info title={t.skills.quests} text={L.quests} />
          <Info title={t.skills.earn} text={L.earn} />
          <Info title={t.skills.test} text={L.test} />
        </Frame>

        <SysButton label={t.skills.request} onPress={onRequest} style={{ marginTop: 18 }} />
      </ScrollView>
      <RankUp data={rankUp} onClose={() => setRankUp(null)} />
      <LevelUp data={rankUp ? null : levelUp} onClose={() => setLevelUp(null)} />
    </View>
  );
}
