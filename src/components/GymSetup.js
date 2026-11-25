// Gym split setup: pick a template, then change exercises, sets and reps, your gym days and how you log.
// Every change saves itself.
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EXERCISES, LOG_MODES, TEMPLATES, TEMPLATE_IDS, WEEKDAYS, dayMinutes, exerciseById, splitFrom } from "../game/gym";
import { REGIONS, muscleById } from "../game/muscles";
import { saveSplit } from "../lib/gym";
import { SavedStamp, useSavedStamp } from "./saved";
import { Frame, Glow, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const mainMuscles = (e) => Object.entries(e.muscles).filter(([, k]) => k >= 0.9).map(([m]) => muscleById[m]?.name).filter(Boolean);
const regionOf = (e) => {
  const [top] = Object.entries(e.muscles).sort((a, b) => b[1] - a[1]);
  return muscleById[top[0]]?.region ?? "core";
};

function Chip({ label, on, onPress, flex, small }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}
      style={{ flex: flex ? 1 : undefined, minHeight: small ? 40 : 44, paddingHorizontal: small ? 10 : 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? "#FFFFFF" : color.muted }}>{label}</Text>
    </Pressable>
  );
}

function Step({ value, onChange, min, max, label }) {
  const { color, font } = useTheme();
  const b = (d, s) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${s}`} hitSlop={4} onPress={() => onChange(Math.min(max, Math.max(min, value + d)))}
      style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.25)" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 16, color: color.text }}>{s}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {b(-1, "−")}
      <Text style={{ width: 28, textAlign: "center", fontFamily: font.num, fontSize: 17, color: "#FFFFFF" }}>{value}</Text>
      {b(1, "+")}
    </View>
  );
}

// The list of all exercises to add one, grouped by body region, with a search.
function ExercisePicker({ onPick, onClose, have }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const match = (e) => !q.trim() || `${e.name} ${mainMuscles(e).join(" ")}`.toLowerCase().includes(q.trim().toLowerCase());
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 30, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 12 }}>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.gym.back}`}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 24, color: "#FFFFFF" }}>{t.gym.addTitle}</Text>
          <TextInput value={q} onChangeText={setQ} placeholder={t.gym.search} placeholderTextColor="#4A5A7A" accessibilityLabel={t.gym.search}
            style={{ minHeight: 46, paddingHorizontal: 12, fontFamily: font.body, fontSize: 15, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
          {REGIONS.map((r) => {
            const list = EXERCISES.filter((e) => regionOf(e) === r && match(e));
            if (!list.length) return null;
            return (
              <Frame key={r} cut={12} contentStyle={{ padding: 14 }}>
                <Label tone={color.hi}>{t.body.regions[r]}</Label>
                {list.map((e) => (
                  <Pressable key={e.id} accessibilityRole="button" onPress={() => onPick(e.id)}
                    style={({ pressed }) => ({ minHeight: 52, paddingVertical: 8, borderTopWidth: 1, borderTopColor: color.line, marginTop: 6, opacity: pressed ? 0.7 : 1, flexDirection: "row", alignItems: "center", gap: 10 })}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{e.name}</Text>
                      <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{mainMuscles(e).join(", ")}</Text>
                    </View>
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: have.includes(e.id) ? color.muted : color.accent }}>{have.includes(e.id) ? t.gym.inDay : t.gym.add}</Text>
                  </Pressable>
                ))}
              </Frame>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function GymSetup({ user, player, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const { stamp, track, Provider } = useSavedStamp();
  const [gym, setGym] = useState(player.gym ?? null);
  const [choosing, setChoosing] = useState(!player.gym);
  const [openDay, setOpenDay] = useState(0);
  const [adding, setAdding] = useState(null); // day index
  const timer = useRef(null);
  const latest = useRef(gym);

  // Saves a moment after the last change, and right away when you leave.
  const flush = () => { clearTimeout(timer.current); if (latest.current && latest.current !== player.gym) track(saveSplit(user.uid, latest.current)).catch(() => {}); };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => flushRef.current(), []);
  function change(next) {
    setGym(next);
    latest.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), 800);
  }
  const editDay = (i, fn) => change({ ...gym, days: gym.days.map((d, k) => (k === i ? fn(d) : d)) });

  function pickTemplate(id) {
    const next = { ...splitFrom(id, gym?.weekdays ?? [0, 2, 4]), log: gym?.log ?? "sets" };
    change(next);
    setChoosing(false);
    setOpenDay(0);
  }

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <Provider value={track}>
        <View style={{ flex: 1, backgroundColor: color.bg }}>
          <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 80, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 12 }}>
            <Glow height={380} at={0.18} />
            <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.gym.back}`}</Text>
            </Pressable>
            <Text accessibilityRole="header" style={{ textAlign: "center", fontFamily: font.bold, fontSize: 26, color: "#FFFFFF" }}>{t.gym.setupTitle}</Text>
            <Text style={{ textAlign: "center", fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.gym.setupSub}</Text>

            {choosing || !gym ? (
              <View style={{ gap: 10 }}>
                <Label tone={color.hi} style={{ marginTop: 6 }}>{t.gym.pickTemplate}</Label>
                {gym ? <Text style={{ fontFamily: font.body, fontSize: 13, color: "#F6B45A" }}>{t.gym.replaceWarn}</Text> : null}
                {TEMPLATE_IDS.map((id) => (
                  <Pressable key={id} accessibilityRole="button" onPress={() => pickTemplate(id)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                    <Frame cut={12} contentStyle={{ padding: 14, gap: 4 }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 17, color: "#FFFFFF" }}>{TEMPLATES[id].name}</Text>
                      <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{TEMPLATES[id].sub}</Text>
                      <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.text }}>{TEMPLATES[id].days.map((d) => d.name).join("  ·  ")}</Text>
                    </Frame>
                  </Pressable>
                ))}
                {gym ? <SysButton label={t.gym.keepMine} onPress={() => setChoosing(false)} /> : null}
              </View>
            ) : (
              <>
                <Frame cut={12} contentStyle={{ padding: 14, gap: 10 }}>
                  <Label tone={color.hi}>{t.gym.days}</Label>
                  <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.gym.daysSub}</Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {WEEKDAYS.map((d) => {
                      const on = gym.weekdays.includes(d);
                      return <Chip key={d} flex small label={t.gym.weekdays[d]} on={on} onPress={() => change({ ...gym, weekdays: on ? gym.weekdays.filter((x) => x !== d) : [...gym.weekdays, d].sort() })} />;
                    })}
                  </View>
                </Frame>

                <Frame cut={12} contentStyle={{ padding: 14, gap: 10 }}>
                  <Label tone={color.hi}>{t.gym.logTitle}</Label>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {LOG_MODES.map((m) => <Chip key={m} flex label={t.gym.logModes[m]} on={gym.log === m} onPress={() => change({ ...gym, log: m })} />)}
                  </View>
                  <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.gym.logSub[gym.log]}</Text>
                </Frame>

                <Label tone={color.hi} style={{ marginTop: 6 }}>{fill(t.gym.split, { name: TEMPLATES[gym.template]?.name ?? "" })}</Label>
                {gym.days.map((d, i) => {
                  const open = openDay === i;
                  return (
                    <Frame key={i} cut={12} contentStyle={{ padding: 14 }}>
                      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpenDay(open ? null : i)}
                        style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontFamily: font.bold, fontSize: 17, color: "#FFFFFF" }}>{d.name}</Text>
                          <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.gym.dayLine, { n: d.ex.length, min: dayMinutes(d) })}{(gym.next ?? 0) % gym.days.length === i ? `  ·  ${t.gym.nextUp}` : ""}</Text>
                        </View>
                        <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.muted }}>{open ? "−" : "+"}</Text>
                      </Pressable>
                      {open ? (
                        <View style={{ marginTop: 6 }}>
                          {d.ex.map((x, k) => {
                            const e = exerciseById[x.id];
                            return (
                              <View key={`${x.id}-${k}`} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.line, gap: 8 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{e?.name ?? x.id}</Text>
                                    <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{e ? mainMuscles(e).join(", ") : ""}</Text>
                                  </View>
                                  <Pressable accessibilityRole="button" accessibilityLabel={`${t.gym.remove} ${e?.name ?? ""}`} hitSlop={8}
                                    onPress={() => editDay(i, (dd) => ({ ...dd, ex: dd.ex.filter((_, j) => j !== k) }))} style={{ minHeight: 36, justifyContent: "center", paddingHorizontal: 6 }}>
                                    <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.gym.remove}</Text>
                                  </Pressable>
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.gym.sets}</Text>
                                  <Step label={t.gym.sets} value={x.sets} min={1} max={10} onChange={(v) => editDay(i, (dd) => ({ ...dd, ex: dd.ex.map((y, j) => (j === k ? { ...y, sets: v } : y)) }))} />
                                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.gym.reps}</Text>
                                  <Step label={t.gym.reps} value={x.reps} min={1} max={50} onChange={(v) => editDay(i, (dd) => ({ ...dd, ex: dd.ex.map((y, j) => (j === k ? { ...y, reps: v } : y)) }))} />
                                </View>
                              </View>
                            );
                          })}
                          <SysButton label={t.gym.addExercise} onPress={() => setAdding(i)} style={{ marginTop: 8 }} />
                        </View>
                      ) : null}
                    </Frame>
                  );
                })}
                <Pressable accessibilityRole="button" onPress={() => setChoosing(true)} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{t.gym.otherTemplate}</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
          <SavedStamp stamp={stamp} />
        </View>
        {adding != null && gym ? (
          <ExercisePicker have={gym.days[adding].ex.map((x) => x.id)} onClose={() => setAdding(null)}
            onPick={(id) => { editDay(adding, (dd) => ({ ...dd, ex: [...dd.ex, { id, sets: exerciseById[id].sets, reps: exerciseById[id].reps }] })); setAdding(null); }} />
        ) : null}
      </Provider>
    </Modal>
  );
}

