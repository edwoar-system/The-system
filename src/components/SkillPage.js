// One skill: rank, progress inside the rank, the next rank trial (or a retest), rust, the last 14 days and the ladder.
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Polygon, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DISTANCE, skillById } from "../game/guild";
import { TIERS, TIER_RANKS } from "../game/tiers";
import { HABIT_LADDER, RANKS } from "../game/ladders";
import { dayNum, isHabit, skillView, trialParts, trialQuestId, trialState } from "../game/skills";
import { startTrial, stopTrial } from "../lib/skills";
import QuestSheet from "./QuestSheet";
import { BodyReport } from "./Body";
import { needsProof } from "../game/proof";
import CheckIn from "./CheckIn";
import GymSetup from "./GymSetup";
import { getQuest } from "../lib/day";
import RankUp from "./RankUp";
import LevelUp from "./LevelUp";
import { AMBER, StepBar, fill, skillStatus } from "./skillParts";
import { Frame, Glow, Label, SysButton, hexPoints } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";
import { HelpDot } from "./Explain";
import { courseForSkill } from "../game/courses";
import { PLAN_TIMES, WEEKDAYS } from "../game/weekplan";
import { patchProfile, setWeekPlan } from "../lib/player";

function Chevron({ c }) {
  return <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" fill="none" stroke={c} strokeWidth={1.8} /></Svg>;
}

// A trial line you tick yourself (or that ticks itself, for counted things).
function TrialRow({ kind, text, done, onPress, auto, extra }) {
  // auto = counted by itself or not tappable yet
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
  const { font } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Label>{title.toUpperCase()}</Label>
      <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: "#CAD6EC" }}>{text}</Text>
    </View>
  );
}

// Plan this skill on fixed weekdays at a time: its quest is on your board those days, with a reminder before.
// Your own way for this skill: what exactly you want, your limits, how long at most, and for distance skills
// how far. Quests of this skill follow it (game/guild.js withPrefs).
function MyWay({ user, player, id }) {
  const { color, font } = useTheme();
  const saved = player.profile?.skillPrefs?.[id] ?? {};
  const [focus, setFocus] = useState(saved.focus ?? "");
  const [limit, setLimit] = useState(saved.limit ?? "");
  const [maxMin, setMaxMin] = useState(saved.maxMin ?? 0);
  const [km, setKm] = useState(saved.km ?? null);
  const [state, setState] = useState(null);
  const dist = DISTANCE[id];
  const input = { minHeight: 46, paddingHorizontal: 12, fontFamily: font.body, fontSize: 15, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" };
  const step = (label, value, onChange, unit, min, max, d) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} −`} onPress={() => onChange(Math.max(min, value - d))} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.frame }}><Text style={{ color: "#FFFFFF", fontSize: 18 }}>−</Text></Pressable>
      <Text style={{ minWidth: 64, textAlign: "center", fontFamily: font.num, fontSize: 18, color: "#FFFFFF" }}>{value ? `${value} ${unit}` : t.skills.noMax}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} +`} onPress={() => onChange(Math.min(max, value + d))} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.frame }}><Text style={{ color: "#FFFFFF", fontSize: 18 }}>+</Text></Pressable>
    </View>
  );
  async function save() {
    const pr = { focus: focus.trim() || null, limit: limit.trim() || null, maxMin: maxMin || null, km: dist && km ? km : null };
    const empty = !pr.focus && !pr.limit && !pr.maxMin && !pr.km;
    setState("saving");
    try { await patchProfile(user.uid, { [`skillPrefs.${id}`]: empty ? null : pr }); setState("saved"); } catch { setState("error"); }
  }
  return (
    <Frame cut={12} style={{ marginTop: 18 }} contentStyle={{ padding: 16, gap: 10 }}>
      <Label tone={color.hi}>{t.skills.myWay}</Label>
      <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.skills.myWaySub}</Text>
      <TextInput value={focus} onChangeText={(v) => { setFocus(v); setState(null); }} placeholder={t.skills.focusPh} placeholderTextColor="#5A6A8A" maxLength={80} accessibilityLabel={t.skills.focusPh} style={input} />
      <TextInput value={limit} onChangeText={(v) => { setLimit(v); setState(null); }} placeholder={t.skills.limitPh} placeholderTextColor="#5A6A8A" maxLength={80} accessibilityLabel={t.skills.limitPh} style={input} />
      {step(t.skills.maxMin, maxMin, (v) => { setMaxMin(v); setState(null); }, t.skills.minUnit, 0, 180, 5)}
      {dist ? (
        <>
          {step(t.skills.kmFrom, km?.[0] ?? 0, (v) => { setKm(v ? [v, Math.max(v, km?.[1] ?? v)] : null); setState(null); }, "km", 0, 50, 1)}
          {km ? step(t.skills.kmTo, km[1], (v) => { setKm([km[0], Math.max(km[0], v)]); setState(null); }, "km", 1, 60, 1) : null}
        </>
      ) : null}
      <SysButton label={state === "saved" ? t.skills.myWaySaved : t.skills.myWaySave} disabled={state === "saving"} onPress={save} />
      {state === "error" ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.skills.myWayError}</Text> : null}
    </Frame>
  );
}

function WeekPlan({ user, player, id }) {
  const { color, font } = useTheme();
  const plan = player.weekPlan?.[id] ?? null;
  const [open, setOpen] = useState(false);
  const days = plan?.days ?? [];
  const time = plan?.time ?? "07:00";
  const save = (next) => setWeekPlan(user.uid, id, next.days.length ? next : null).catch(() => {});
  const chip = (on, label, onPress, key) => (
    <Pressable key={key} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onPress}
      style={({ pressed }) => ({ minWidth: 44, minHeight: 40, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderWidth: 1,
        borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: pressed ? "rgba(159,203,255,0.2)" : on ? "rgba(159,203,255,0.16)" : "transparent" })}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: on ? "#FFFFFF" : color.text }}>{label}</Text>
    </Pressable>
  );
  return (
    <Frame cut={12} style={{ marginTop: 12 }} contentStyle={{ padding: 14, gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((x) => !x)} style={{ minHeight: 36, justifyContent: "center" }}>
        <Label tone={color.hi}>{t.weekPlan.title}</Label>
        <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: plan ? color.accent : color.muted }}>
          {plan ? fill(t.weekPlan.summary, { days: days.map((d) => t.weekPlan.days[d]).join(", "), time }) : t.weekPlan.none}
        </Text>
      </Pressable>
      {open ? (
        <>
          <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.weekPlan.sub}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {WEEKDAYS.map((d) => chip(days.includes(d), t.weekPlan.days[d], () => save({ days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort(), time }), d))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {PLAN_TIMES.map((tm) => chip(time === tm, tm, () => save({ days: days.length ? days : [], time: tm }), tm))}
          </View>
        </>
      ) : null}
    </Frame>
  );
}

export default function SkillPage({ user, player, id, onBack, onRequest, onOpenCourse, initialPlacement = null }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const skill = skillById[id];
  const v = skillView(id, player.skills?.[id], dayNum());
  const L = v.ladder;
  // Example sessions: the guild quest (tier I), the ladder's own ideas, then tiers II and III.
  const ways = [
    ...(skill?.quest ? [{ tier: "I", text: skill.quest, min: skill.minutes }] : []),
    ...String(L.quests ?? "").split(";").map((x) => x.trim().replace(/\.$/, "")).filter((x) => x && x.toLowerCase() !== String(skill?.quest ?? "").toLowerCase()).map((x) => ({ text: x.charAt(0).toUpperCase() + x.slice(1) })),
    ...(TIERS[id] ?? []).map(([text, min], k) => ({ tier: k ? "III" : "II", text, min, unlock: TIER_RANKS[k + 1], locked: v.rank < TIER_RANKS[k + 1] })),
  ];
  const habit = isHabit(L);
  const st = skillStatus(v);

  const [placement, setPlacement] = useState(initialPlacement); // a higher target rank (set when you came from the assessment)
  const [more, setMore] = useState(false);
  const [gymOpen, setGymOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [rankUp, setRankUp] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const [sheet, setSheet] = useState(null); // a trial part opened as a quest
  const [body, setBody] = useState(null);
  const [check, setCheck] = useState(null);

  // The trial: a running one, a retest when rusty, otherwise the next rank (or a higher one: placement).
  const active = trialState(player.trials?.[id], L, v.ticks);
  const retest = !active && v.rusty;
  const target = active ? active.rank : retest ? v.earned : placement ?? v.rank + 1;
  const atTop = !active && !retest && v.rank >= v.max;

  const items = [];
  if (!atTop) {
    if (habit) {
      items.push({ key: "days", kind: t.skills.habitDays, text: HABIT_LADDER[L.freq][target], auto: true,
        done: v.next.count >= v.next.need, extra: `${v.next.count} / ${v.next.need}` });
    }
    const parts = active ? active.parts : trialParts(L, target, v.ticks).filter((p) => !retest || p.main);
    parts.forEach((p) => items.push({
      key: p.key, kind: p.main ? t.skills.mainTest : `${t.skills.achievement} · ${RANKS[p.rank]}`, text: p.text,
      done: !!p.done, extra: p.value != null ? String(p.value) : null, questId: trialQuestId(id, target, p.key),
    }));
  }
  const met = items.filter((it) => it.done).length;
  const needsQuests = items.some((it) => it.questId);

  async function start() {
    setBusy(true);
    setError(null);
    try { await startTrial(user.uid, id, target); setPlacement(null); } catch { setError(t.skills.failed); } finally { setBusy(false); }
  }
  async function stop() {
    setBusy(true);
    try { await stopTrial(user.uid, id); } catch { setError(t.skills.failed); } finally { setBusy(false); }
  }
  function onResult(r) {
    if (r.logId && sheet?.id) setCheck({ logId: r.logId, title: getQuest(sheet.id)?.title ?? "", proof: needsProof(player, "trial"), ask: true });
    if (r.muscles) setBody(r.muscles);
    if (r.levelUp) setLevelUp({ level: r.levelUp, xp: (player.xp ?? 0) + r.xp });
    if (r.skillUp) setRankUp({ letter: RANKS[r.skillUp.rank], name: skill.name, xp: r.skillUp.xp });
    else if (r.trialDone) setRankUp({ letter: RANKS[target], name: skill.name, xp: 0, restored: true });
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: st.tone === "amber" ? "rgba(246,180,90,0.5)" : "rgba(159,203,255,0.35)", backgroundColor: st.tone === "amber" ? "rgba(246,180,90,0.08)" : "rgba(159,203,255,0.08)" }}>
            <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: stTone }}>{st.text}</Text>
          </View>
          {st.tone === "amber" ? <HelpDot term="rust" size={20} /> : null}
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
        {!atTop ? (
          <Frame kind="premium" cut={16} style={{ marginTop: 22 }} contentStyle={{ padding: 16, gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Label tone={retest || v.rusty ? AMBER : "#EEF0FF"}>{fill(v.rusty && target === v.earned ? t.skills.retest : t.skills.trial, { rank: RANKS[target] })}</Label>
                <HelpDot term={v.rusty ? "rust" : "trials"} size={18} />
              </View>
              <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>
                {active ? (active.daysLeft != null ? fill(t.skills.trialActive, { n: active.daysLeft }) : t.skills.trialWaiting) : fill(t.skills.met, { a: met, b: items.length })}
              </Text>
            </View>
            <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>
              {active ? t.skills.trialPartHint : needsQuests ? t.skills.trialIntro : t.skills.habitAuto}
            </Text>
            {active?.expired ? <Text style={{ fontFamily: font.body, fontSize: 13, color: AMBER }}>{t.skills.trialExpired}</Text> : null}
            {items.map((it) => (
              <TrialRow key={it.key} kind={it.kind} text={it.text} done={it.done} extra={it.extra}
                auto={it.auto || !active || it.done} onPress={() => setSheet({ id: it.questId, done: it.done })} />
            ))}
            {unlock ? <Text style={{ fontFamily: font.body, fontSize: 13, color: "#CAD6EC" }}>{fill(t.skills.unlocks, { name: unlock })}</Text> : null}
            <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{fill(t.skills.proof, { type: t.skills.proofTypes[L.proof] })}</Text>
            {error ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.dangerSoft }}>{error}</Text> : null}
            {!active && needsQuests ? <SysButton label={t.skills.trialStart} onPress={start} disabled={busy} style={{ marginTop: 6 }} /> : null}
            {active ? (
              <Pressable accessibilityRole="button" onPress={stop} disabled={busy} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{t.skills.trialStop}</Text>
              </Pressable>
            ) : null}
            {!active && !retest && !habit && v.rank + 2 <= v.max ? (
              <View style={{ marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: color.line, gap: 8 }}>
                <Label>{t.skills.placementTitle}</Label>
                <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.skills.placementSub}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {RANKS.map((r, i) => i > v.rank && i <= v.max ? (
                    <Pressable key={r} accessibilityRole="button" accessibilityState={{ selected: target === i }} onPress={() => setPlacement(i === v.rank + 1 ? null : i)}
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

        {/* Ways to train: example sessions, harder ones unlock with rank */}
        <Frame cut={12} style={{ marginTop: 18 }} contentStyle={{ padding: 16, gap: 4 }}>
          <Label tone={color.hi}>{t.skills.ways}</Label>
          <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted, marginBottom: 4 }}>{t.skills.waysSub}</Text>
          {ways.map((w, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: color.line, opacity: w.locked ? 0.5 : 1 }}>
              <Text style={{ width: 20, fontFamily: font.num, fontSize: 14, color: w.locked ? color.muted : color.accent }}>{w.tier ?? "·"}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, lineHeight: 20, color: color.text }}>{w.text}</Text>
                {w.min || w.locked ? (
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>
                    {[w.min ? fill(t.guild.min, { n: w.min }) : null, w.locked ? fill(t.skills.unlockAt, { rank: RANKS[w.unlock] }) : null].filter(Boolean).join("  ·  ")}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </Frame>

        {onOpenCourse && courseForSkill(id) ? (
          <SysButton label={t.course.openCourse} onPress={() => onOpenCourse(courseForSkill(id).id)} style={{ marginTop: 18 }} />
        ) : null}
        <SysButton label={t.skills.request} onPress={onRequest} style={{ marginTop: 18 }} />
        <MyWay key={id} user={user} player={player} id={id} />
        <WeekPlan user={user} player={player} id={id} />
        {id === "gym" ? (
          <Pressable accessibilityRole="button" onPress={() => setGymOpen(true)} style={{ minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 6 }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{player.gym ? t.gym.edit : t.gym.setUp}</Text>
          </Pressable>
        ) : null}

        {/* The full ladder and how the skill works: folded, it's reference, not something you need every visit. */}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: more }} onPress={() => setMore((m) => !m)}
          style={{ marginTop: 14, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: color.line }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{more ? t.skills.less : t.skills.more}</Text>
          <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.muted }}>{more ? "−" : "+"}</Text>
        </Pressable>
        {more ? (
          <>
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
          </>
        ) : null}
      </ScrollView>
      {sheet ? <QuestSheet user={user} player={player} questId={sheet.id} slot="trial" done={sheet.done} onClose={() => setSheet(null)} onResult={onResult} /> : null}
      {gymOpen ? <GymSetup user={user} player={player} onClose={() => setGymOpen(false)} /> : null}
      <CheckIn uid={user.uid} data={check} onClose={() => setCheck(null)} />
      <BodyReport data={check ? null : body} onClose={() => setBody(null)} />
      <RankUp data={check || body ? null : rankUp} onClose={() => setRankUp(null)} />
      <LevelUp data={check || body || rankUp ? null : levelUp} onClose={() => setLevelUp(null)} />
    </View>
  );
}
