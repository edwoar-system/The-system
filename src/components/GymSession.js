// In the gym: today's split day. Weight and reps are filled in from last time, so most sets are one tap.
// Log every set, or one line per exercise (Gym split settings). Closing keeps your sets until you finish.
import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { exerciseById } from "../game/gym";
import { fatigueNow, muscleById, recoveryState } from "../game/muscles";
import { getQuest } from "../lib/day";
import { finishGym } from "../lib/gym";
import { doneFeel, tapFeel } from "../lib/haptics";
import { Frame, Glow, Label, SysButton, hexPoints } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";
import SwipeBack from "./SwipeBack";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const AMBER = "#F6B45A";
const num = (v) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

// Sessions in progress, kept while the app is open (per quest id).
const drafts = {};

function newDraft(q, day, player) {
  return {
    started: Date.now(),
    exercises: day.ex.map((x) => {
      const last = player.gymLast?.[x.id] ?? [];
      return {
        id: x.id,
        target: { sets: x.sets, reps: x.reps },
        // One row per planned set: pre-filled from last time (or the plan), done when ticked.
        rows: Array.from({ length: x.sets }, (_, i) => ({ w: last[i]?.w ?? last[last.length - 1]?.w ?? "", r: last[i]?.r ?? x.reps, done: false })),
      };
    }),
  };
}

function Check({ done, onPress, label }) {
  const { color } = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={label} hitSlop={6} onPress={onPress}
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
      <Svg width={32} height={35}>
        <Polygon points={hexPoints(32, 35, 1)} fill={done ? color.purple : "rgba(159,203,255,0.06)"} stroke={done ? color.purple : "rgba(159,203,255,0.45)"} strokeWidth={1.4} />
        {done ? <Path d="M10 18l4.5 4.5 8-9" stroke="#FFFFFF" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      </Svg>
    </Pressable>
  );
}

function Field({ value, onChange, label, width = 64, placeholder }) {
  const { font } = useTheme();
  return (
    <TextInput value={String(value ?? "")} onChangeText={onChange} keyboardType="decimal-pad" accessibilityLabel={label} placeholder={placeholder} placeholderTextColor="#4A5A7A" selectTextOnFocus
      style={{ width, minHeight: 44, textAlign: "center", fontFamily: font.num, fontSize: 18, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.28)", backgroundColor: "rgba(5,10,24,0.7)" }} />
  );
}

export default function GymSession({ user, player, questId, slot, onClose, onResult }) {
  // Close first: the clear window opens once this screen is gone (an iPhone sheet would cover it).
  const leave = (r) => { onClose(); setTimeout(() => onResult?.(r), Platform.OS === "web" ? 0 : 380); };
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const q = getQuest(questId, player);
  const day = q ? player.gym?.days?.[q.gymDay] : null;
  const [draft, setDraft] = useState(() => drafts[questId] ?? (day ? newDraft(q, day, player) : null));
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [prs, setPrs] = useState(null);
  const mode = player.gym?.log ?? "sets";

  useEffect(() => { drafts[questId] = draft; }, [questId, draft]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  if (!q || !day || !draft) return null;
  const board = player.day?.gym;
  const fat = fatigueNow(player.fatigue);
  const tiredHere = Object.entries(q.muscles).filter(([m, k]) => k >= 0.7 && recoveryState(fat[m] ?? 0) === "tired").map(([m]) => muscleById[m]?.name);
  const doneSets = draft.exercises.reduce((n, e) => n + e.rows.filter((r) => r.done).length, 0);
  const totalSets = draft.exercises.reduce((n, e) => n + e.rows.length, 0);

  const setRow = (ei, ri, patch) => setDraft((d) => ({ ...d, exercises: d.exercises.map((e, i) => (i !== ei ? e : { ...e, rows: e.rows.map((r, j) => (j === ri ? { ...r, ...patch } : r)) })) }));
  const setAll = (ei, patch) => setDraft((d) => ({ ...d, exercises: d.exercises.map((e, i) => (i !== ei ? e : { ...e, rows: e.rows.map((r) => ({ ...r, ...patch })) })) }));
  const setCount = (ei, n) => setDraft((d) => ({ ...d, exercises: d.exercises.map((e, i) => {
    if (i !== ei) return e;
    const rows = Array.from({ length: Math.max(1, Math.min(10, n)) }, (_, j) => e.rows[j] ?? { ...e.rows[e.rows.length - 1], done: false });
    return { ...e, rows };
  }) }));
  const addSet = (ei) => setDraft((d) => ({ ...d, exercises: d.exercises.map((e, i) => (i !== ei ? e : { ...e, rows: [...e.rows, { ...e.rows[e.rows.length - 1], done: false }] })) }));

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const session = { questId, slot, exercises: draft.exercises.map((e) => ({ id: e.id, sets: e.rows.filter((r) => r.done).map((r) => ({ w: num(r.w), r: Math.max(0, Math.round(num(r.r))) })) })) };
      const r = await finishGym(user.uid, player, session);
      delete drafts[questId];
      doneFeel();
      if (r.prs?.length) setPrs({ list: r.prs, result: r });
      else leave(r);
    } catch (e) {
      setError(e.message === "already-done" ? t.gym.alreadyDone : t.gym.failed);
    } finally {
      setBusy(false);
    }
  }

  if (prs) {
    return (
      <Modal transparent animationType="fade" visible onRequestClose={() => leave(prs.result)}>
        <View style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.95)", justifyContent: "center", padding: 20 }}>
          <Frame kind="premium" cut={16} style={{ width: "100%", maxWidth: 420, alignSelf: "center" }} contentStyle={{ padding: 18, gap: 12 }}>
            <Label tone={color.hi}>{t.gym.prTitle}</Label>
            {prs.list.map((p) => (
              <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text style={{ fontFamily: font.bold, fontSize: 16, color: "#FFFFFF" }}>{p.name}</Text>
                <Text style={{ fontFamily: font.num, fontSize: 18, color: color.hi }}>{p.w ? `${p.w} kg × ${p.r}` : `${p.r} ${t.gym.reps.toLowerCase()}`}</Text>
              </View>
            ))}
            <SysButton label={t.gym.continue} onPress={() => leave(prs.result)} />
          </Frame>
        </View>
      </Modal>
    );
  }

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <SwipeBack onBack={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 12 }}>
          <Glow height={360} at={0.18} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.gym.backKeep}`}</Text>
            </Pressable>
            <Text accessibilityLabel={fill(t.gym.timeLabel, { t: mmss(now - draft.started) })} style={{ fontFamily: font.num, fontSize: 18, color: color.muted }}>{mmss(now - draft.started)}</Text>
          </View>
          <View style={{ gap: 4 }}>
            <Label tone={color.hi}>{t.gym.session}</Label>
            <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 28, color: "#FFFFFF" }}>{fill(t.gym.dayTitle, { name: day.name })}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{fill(t.gym.progress, { a: doneSets, b: totalSets })}</Text>
          </View>
          {board?.swapped ? (
            <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: AMBER }}>{fill(t.gym.swapped, { planned: player.gym.days[board.planned]?.name ?? "", today: day.name })}</Text>
          ) : null}
          {board?.allTired || tiredHere.length ? (
            <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: AMBER }}>{fill(t.gym.tired, { list: tiredHere.join(", ") || t.gym.mostMuscles })}</Text>
          ) : null}

          {draft.exercises.map((e, ei) => {
            const ex = exerciseById[e.id];
            const allDone = e.rows.every((r) => r.done);
            const best = player.gymBest?.[e.id];
            return (
              <Frame key={`${e.id}-${ei}`} cut={12} contentStyle={{ padding: 14, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                  <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 17, color: allDone ? color.muted : "#FFFFFF" }}>{ex?.name ?? e.id}</Text>
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.gym.target, { s: e.target.sets, r: e.target.reps })}</Text>
                </View>
                {best ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.gym.best, { b: best.w ? `${best.w} kg × ${best.r}` : `${best.r}` })}</Text> : null}
                {mode === "sets" ? (
                  <>
                    <View style={{ flexDirection: "row", gap: 8, paddingLeft: 30 }}>
                      <Text style={{ width: 64, textAlign: "center", fontFamily: font.body, fontSize: 11, color: color.muted }}>{ex?.bw ? t.gym.extraKg : t.gym.kg}</Text>
                      <Text style={{ width: 56, textAlign: "center", fontFamily: font.body, fontSize: 11, color: color.muted }}>{t.gym.reps}</Text>
                    </View>
                    {e.rows.map((r, ri) => (
                      <View key={ri} style={{ flexDirection: "row", alignItems: "center", gap: 8, opacity: r.done ? 0.65 : 1 }}>
                        <Text style={{ width: 22, fontFamily: font.num, fontSize: 15, color: color.muted }}>{ri + 1}</Text>
                        <Field value={r.w} onChange={(v) => setRow(ei, ri, { w: v })} label={fill(t.gym.kgOf, { n: ri + 1 })} placeholder={ex?.bw ? "0" : "–"} />
                        <Field value={r.r} onChange={(v) => setRow(ei, ri, { r: v })} label={fill(t.gym.repsOf, { n: ri + 1 })} width={56} />
                        <View style={{ flex: 1 }} />
                        <Check done={r.done} label={fill(t.gym.setDone, { n: ri + 1 })} onPress={() => { if (!r.done) tapFeel(); setRow(ei, ri, { done: !r.done }); }} />
                      </View>
                    ))}
                    <Pressable accessibilityRole="button" onPress={() => addSet(ei)} style={{ minHeight: 40, justifyContent: "center", alignSelf: "flex-start" }}>
                      <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.gym.addSet}</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Text style={{ width: 48, textAlign: "center", fontFamily: font.body, fontSize: 11, color: color.muted }}>{t.gym.sets}</Text>
                    <Text style={{ width: 10 }} />
                    <Text style={{ width: 52, textAlign: "center", fontFamily: font.body, fontSize: 11, color: color.muted }}>{t.gym.reps}</Text>
                    <Text style={{ width: 10 }} />
                    <Text style={{ width: 64, textAlign: "center", fontFamily: font.body, fontSize: 11, color: color.muted }}>{ex?.bw ? t.gym.extraKg : t.gym.kg}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, opacity: allDone ? 0.65 : 1 }}>
                    <Field value={e.rows.length} onChange={(v) => setCount(ei, Math.round(num(v)) || 1)} label={t.gym.sets} width={48} />
                    <Text style={{ fontFamily: font.body, fontSize: 14, color: color.muted }}>×</Text>
                    <Field value={e.rows[0].r} onChange={(v) => setAll(ei, { r: v })} label={t.gym.reps} width={52} />
                    <Text style={{ fontFamily: font.body, fontSize: 14, color: color.muted }}>×</Text>
                    <Field value={e.rows[0].w} onChange={(v) => setAll(ei, { w: v })} label={t.gym.kg} placeholder={ex?.bw ? "0" : "kg"} />
                    <View style={{ flex: 1 }} />
                    <Check done={allDone} label={fill(t.gym.exDone, { name: ex?.name ?? "" })} onPress={() => { if (!allDone) tapFeel(); setAll(ei, { done: !allDone }); }} />
                  </View>
                  </>
                )}
              </Frame>
            );
          })}
        </ScrollView>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: "rgba(3,6,13,0.96)", borderTopWidth: 1, borderTopColor: color.line }}>
          <View style={{ maxWidth: 520, width: "100%", alignSelf: "center", gap: 6 }}>
            {error ? <Text style={{ fontFamily: font.body, fontSize: 13, color: AMBER }}>{error}</Text> : null}
            <SysButton label={fill(t.gym.finish, { n: doneSets })} disabled={busy || doneSets === 0} onPress={finish} />
          </View>
        </View>
      </View>
          </SwipeBack>
    </Modal>
  );
}
