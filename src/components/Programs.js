// Programs: your active ones (on the Skills tab), browsing them, and making your own from the formula.
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_PROGRAMS, PROGRAMS, PROGRAM_DONE_BONUS, PROGRAM_IDS, UNITS, customSessions, programById, weekKey } from "../game/programs";
import { INTERESTS, interestSkills } from "../game/profile";
import { STATS, todayKey, widenBy } from "../game/quests";
import { currentStreak } from "../lib/day";
import { createProgram, startProgram, stopProgram } from "../lib/programs";
import { doneFeel } from "../lib/haptics";
import { Frame, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

function Chip({ label, on, onPress, flex }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}
      style={{ flex: flex ? 1 : undefined, minHeight: 42, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? "#FFFFFF" : color.muted }}>{label}</Text>
    </Pressable>
  );
}

function NumRow({ label, value, onChange, step, min, max }) {
  const { color, font } = useTheme();
  const b = (d, s) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${s}`} onPress={() => onChange(Math.min(max, Math.max(min, Math.round((value + d) * 10) / 10)))}
      style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.text }}>{s}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{label}</Text>
      {b(-step, "−")}
      <Text style={{ width: 56, textAlign: "center", fontFamily: font.num, fontSize: 20, color: "#FFFFFF" }}>{value}</Text>
      {b(step, "+")}
    </View>
  );
}

// Make your own program: from a start to a goal over a few weeks.
function MakeProgram({ uid, onDone }) {
  const { color, font } = useTheme();
  const [name, setName] = useState("");
  const [stat, setStat] = useState("STR");
  const [unit, setUnit] = useState("reps");
  const [start, setStart] = useState(10);
  const [goal, setGoal] = useState(50);
  const [perWeek, setPerWeek] = useState(3);
  const [weeks, setWeeks] = useState(4);
  const [how, setHow] = useState("");
  const [error, setError] = useState(null);
  const step = UNITS[unit].step * (unit === "reps" || unit === "pages" ? 5 : unit === "min" ? 5 : 1);
  const c = { name: name.trim() || t.programs.yourOwn, stat, unit, unitLabel: t.programs.units[unit], start, goal, perWeek, weeks, how: how.trim() };
  const sessions = customSessions(c);
  async function create() {
    try { await createProgram(uid, c); doneFeel(); onDone(); } catch { setError(t.programs.failed); }
  }
  return (
    <View style={{ gap: 10 }}>
      <TextInput value={name} onChangeText={(v) => setName(v.slice(0, 30))} placeholder={t.programs.namePh} placeholderTextColor="#4A5A7A" accessibilityLabel={t.programs.namePh}
        style={{ minHeight: 46, paddingHorizontal: 12, fontFamily: font.bold, fontSize: 16, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
      <View style={{ flexDirection: "row", gap: 4 }}>{STATS.map((s) => <Chip key={s} flex label={s} on={stat === s} onPress={() => setStat(s)} />)}</View>
      <View style={{ flexDirection: "row", gap: 4 }}>{Object.keys(UNITS).map((u) => <Chip key={u} flex label={t.programs.units[u]} on={unit === u} onPress={() => setUnit(u)} />)}</View>
      <NumRow label={t.programs.startAt} value={start} onChange={(v) => { setStart(v); if (goal < v) setGoal(v); }} step={step} min={UNITS[unit].step} max={1000} />
      <NumRow label={t.programs.goalAt} value={goal} onChange={(v) => setGoal(Math.max(v, start))} step={step} min={start} max={2000} />
      <NumRow label={t.programs.perWeek} value={perWeek} onChange={setPerWeek} step={1} min={1} max={7} />
      <NumRow label={t.programs.weeks} value={weeks} onChange={setWeeks} step={1} min={1} max={12} />
      <TextInput value={how} onChangeText={(v) => setHow(v.slice(0, 160))} placeholder={t.programs.howPh} placeholderTextColor="#4A5A7A" accessibilityLabel={t.programs.howPh} multiline
        style={{ minHeight: 60, padding: 10, fontFamily: font.body, fontSize: 14, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
      <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 19, color: color.muted }}>
        {fill(t.programs.preview, { n: sessions.length, a: sessions[0].title, b: sessions[Math.floor(sessions.length / 2)].title, c: sessions[sessions.length - 1].title })}
      </Text>
      {error ? <Text style={{ fontFamily: font.body, fontSize: 13, color: "#F6B45A" }}>{error}</Text> : null}
      <SysButton label={t.programs.create} disabled={name.trim().length < 2} onPress={create} />
    </View>
  );
}

function Browse({ user, player, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [making, setMaking] = useState(false);
  const [msg, setMsg] = useState(null);
  const active = Object.keys(player.programs ?? {});
  const full = active.length >= MAX_PROGRAMS;
  const start = (id) => startProgram(user.uid, id).then(() => { doneFeel(); setMsg(t.programs.started); }).catch((e) => setMsg(e.message === "max" ? fill(t.programs.max, { n: MAX_PROGRAMS }) : t.programs.failed));
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 12 }}>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.programs.back}`}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 24, color: "#FFFFFF" }}>{t.programs.browseTitle}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{fill(t.programs.browseSub, { n: MAX_PROGRAMS, b: PROGRAM_DONE_BONUS })}</Text>
          {msg ? <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{msg}</Text> : null}
          {PROGRAM_IDS.map((id) => {
            const p = PROGRAMS[id];
            const on = active.includes(id);
            return (
              <Frame key={id} cut={12} contentStyle={{ padding: 14, gap: 6 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 17, color: "#FFFFFF" }}>{p.name}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text }}>{p.sub}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.programs.meta, { s: p.stat, n: p.sessions.length, w: p.perWeek })}</Text>
                <SysButton label={on ? t.programs.following : t.programs.start} disabled={on || full} onPress={() => start(id)} style={{ marginTop: 4 }} />
              </Frame>
            );
          })}
          <Frame cut={12} contentStyle={{ padding: 14, gap: 10 }}>
            <Label tone={color.hi}>{t.programs.ownTitle}</Label>
            <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.programs.ownSub}</Text>
            {making ? <MakeProgram uid={user.uid} onDone={() => { setMaking(false); setMsg(t.programs.created); }} /> : <SysButton label={t.programs.make} onPress={() => setMaking(true)} />}
          </Frame>
        </ScrollView>
      </View>
    </Modal>
  );
}

// The Programs section on the Skills tab: your focus, your active programs and their next session.
export default function ProgramsSection({ user, player }) {
  const { color, font } = useTheme();
  const [browsing, setBrowsing] = useState(false);
  const today = todayKey();
  const liked = interestSkills(player.profile);
  const focusNames = INTERESTS.filter((i) => (player.profile?.interests ?? []).includes(i.id)).map((i) => i.name);
  const outside = widenBy(currentStreak(player));
  const entries = Object.entries(player.programs ?? {});
  return (
    <View style={{ gap: 10 }}>
      <Frame cut={14} contentStyle={{ padding: 16, gap: 8 }}>
        <Label tone={color.hi}>{t.programs.focusTitle}</Label>
        <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 19, color: color.text }}>
          {liked.size ? fill(t.programs.focus, { list: focusNames.join(", ") }) : t.programs.noFocus}
        </Text>
        {liked.size ? <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.programs.widen[outside]}</Text> : null}
      </Frame>
      <Frame cut={14} contentStyle={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Label tone={color.hi}>{t.programs.title}</Label>
          <Pressable accessibilityRole="button" onPress={() => setBrowsing(true)} style={{ minHeight: 40, justifyContent: "center" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{entries.length ? t.programs.browse : t.programs.find}</Text>
          </Pressable>
        </View>
        {entries.length === 0 ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.programs.empty}</Text> : null}
        {entries.map(([id, st]) => {
          const p = programById(id, player);
          if (!p) return null;
          const total = p.sessions.length;
          const finished = st.done >= total;
          const thisWeek = st.week?.key === weekKey(today) ? st.week.count : 0;
          return (
            <View key={id} style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: color.line }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{p.name}</Text>
                <Text style={{ fontFamily: font.num, fontSize: 15, color: color.frame }}>{`${Math.min(st.done, total)} / ${total}`}</Text>
              </View>
              <View style={{ height: 4, backgroundColor: "rgba(159,203,255,0.12)" }}>
                <View style={{ height: 4, width: `${Math.min(100, (st.done / total) * 100)}%`, backgroundColor: color.purple }} />
              </View>
              <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>
                {finished ? t.programs.finished : fill(t.programs.next, { title: p.sessions[st.done].title, a: thisWeek, b: p.perWeek })}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => stopProgram(user.uid, id).catch(() => {})} style={{ minHeight: 32, justifyContent: "center", alignSelf: "flex-start" }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.muted }}>{finished ? t.programs.remove : t.programs.stop}</Text>
              </Pressable>
            </View>
          );
        })}
      </Frame>
      {browsing ? <Browse user={user} player={player} onClose={() => setBrowsing(false)} /> : null}
    </View>
  );
}
