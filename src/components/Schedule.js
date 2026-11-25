// Your schedule: your usual week of busy blocks, and today's changes. Everything saves by itself.
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_BLOCKS, busyBlocks, hhmm, weekdayOf } from "../game/schedule";
import { todayKey } from "../game/quests";
import { addToday, removeToday, saveSchedule, skipToday } from "../lib/schedule";
import { SavedStamp, useSavedStamp } from "./saved";
import { Frame, Glow, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);
const PRESETS = {
  school: { days: [0, 1, 2, 3, 4], start: 8.5, end: 15.5 },
  training: { days: [1, 3], start: 18, end: 19.5 },
  work: { days: [5], start: 10, end: 16 },
  other: { days: [0], start: 17, end: 18 },
};

function Step({ label, value, onChange, min = 5, max = 24 }) {
  const { color, font } = useTheme();
  const b = (d, s) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${s}`} onPress={() => onChange(Math.min(max, Math.max(min, value + d)))}
      style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.25)" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 16, color: color.text }}>{s}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Text style={{ width: 40, fontFamily: font.body, fontSize: 12, color: color.muted }}>{label}</Text>
      {b(-0.25, "−")}
      <Text style={{ width: 52, textAlign: "center", fontFamily: font.num, fontSize: 17, color: "#FFFFFF" }}>{hhmm(value)}</Text>
      {b(0.25, "+")}
    </View>
  );
}

function BlockEditor({ block, onChange, onRemove }) {
  const { color, font } = useTheme();
  return (
    <View style={{ gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.line }}>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TextInput value={block.label} onChangeText={(v) => onChange({ ...block, label: v.slice(0, 30) })} accessibilityLabel={t.schedule.name}
          style={{ flex: 1, minWidth: 0, minHeight: 42, paddingHorizontal: 10, fontFamily: font.bold, fontSize: 15, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.25)", backgroundColor: "rgba(5,10,24,0.7)" }} />
        <Pressable accessibilityRole="button" onPress={onRemove} style={{ minHeight: 40, justifyContent: "center", paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.schedule.remove}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 3 }}>
        {t.gym.weekdays.map((d, i) => {
          const on = block.days.includes(i);
          return (
            <Pressable key={d} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange({ ...block, days: on ? block.days.filter((x) => x !== i) : [...block.days, i].sort() })}
              style={{ flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.2)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
              <Text style={{ fontFamily: font.bold, fontSize: 11, color: on ? "#FFFFFF" : color.muted }}>{d}</Text>
            </Pressable>
          );
        })}
      </View>
      <Step label={t.schedule.from} value={block.start} onChange={(v) => onChange({ ...block, start: v, end: Math.max(block.end, v + 0.25) })} />
      <Step label={t.schedule.to} value={block.end} onChange={(v) => onChange({ ...block, end: Math.max(v, block.start + 0.25) })} />
    </View>
  );
}

export default function Schedule({ user, player, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const { stamp, track, Provider } = useSavedStamp();
  const [blocks, setBlocks] = useState(player.schedule ?? []);
  const [extra, setExtra] = useState(null); // a one-off for today being added
  const timer = useRef(null);
  const latest = useRef(null);
  const flushRef = useRef(null);
  flushRef.current = () => { clearTimeout(timer.current); if (latest.current) { track(saveSchedule(user.uid, latest.current)).catch(() => {}); latest.current = null; } };
  useEffect(() => () => flushRef.current(), []);
  const change = (next) => { setBlocks(next); latest.current = next; clearTimeout(timer.current); timer.current = setTimeout(() => flushRef.current(), 800); };

  const today = todayKey();
  const wd = weekdayOf(today);
  const todayDay = player.scheduleDay?.date === today ? player.scheduleDay : { skip: [], extra: [] };
  const usualToday = (player.schedule ?? []).filter((b) => b.days?.includes(wd));
  const busy = busyBlocks(player, today);

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <Provider value={track}>
        <View style={{ flex: 1, backgroundColor: color.bg }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 80, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 12 }}>
            <Glow height={380} at={0.18} />
            <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.schedule.back}`}</Text>
            </Pressable>
            <Text accessibilityRole="header" style={{ textAlign: "center", fontFamily: font.bold, fontSize: 26, color: "#FFFFFF" }}>{t.schedule.title}</Text>
            <Text style={{ textAlign: "center", fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.schedule.sub}</Text>

            <Frame cut={12} contentStyle={{ padding: 14, gap: 8 }}>
              <Label tone={color.hi}>{t.schedule.today}</Label>
              {usualToday.length === 0 && !todayDay.extra?.length ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.schedule.todayFree}</Text> : null}
              {usualToday.map((b) => {
                const skipped = todayDay.skip?.includes(b.id);
                return (
                  <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, opacity: skipped ? 0.5 : 1 }}>
                    <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: color.text, textDecorationLine: skipped ? "line-through" : "none" }}>{`${b.label}  ${hhmm(b.start)}–${hhmm(b.end)}`}</Text>
                    <Pressable accessibilityRole="button" onPress={() => track(skipToday(user.uid, b.id, !skipped)).catch(() => {})} style={{ minHeight: 40, justifyContent: "center" }}>
                      <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{skipped ? t.schedule.unskip : t.schedule.skip}</Text>
                    </Pressable>
                  </View>
                );
              })}
              {(todayDay.extra ?? []).map((b) => (
                <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
                  <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{`${b.label}  ${hhmm(b.start)}–${hhmm(b.end)}`}</Text>
                  <Pressable accessibilityRole="button" onPress={() => track(removeToday(user.uid, b.id)).catch(() => {})} style={{ minHeight: 40, justifyContent: "center" }}>
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.schedule.remove}</Text>
                  </Pressable>
                </View>
              ))}
              {extra ? (
                <View style={{ gap: 8 }}>
                  <TextInput value={extra.label} onChangeText={(v) => setExtra({ ...extra, label: v.slice(0, 30) })} placeholder={t.schedule.extraPh} placeholderTextColor="#4A5A7A" accessibilityLabel={t.schedule.extraPh}
                    style={{ minHeight: 42, paddingHorizontal: 10, fontFamily: font.body, fontSize: 15, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.25)", backgroundColor: "rgba(5,10,24,0.7)" }} />
                  <Step label={t.schedule.from} value={extra.start} onChange={(v) => setExtra({ ...extra, start: v, end: Math.max(extra.end, v + 0.25) })} />
                  <Step label={t.schedule.to} value={extra.end} onChange={(v) => setExtra({ ...extra, end: Math.max(v, extra.start + 0.25) })} />
                  <SysButton label={t.schedule.addIt} disabled={extra.label.trim().length < 2} onPress={() => { track(addToday(user.uid, { label: extra.label.trim(), start: extra.start, end: extra.end })).catch(() => {}); setExtra(null); }} />
                </View>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => { const h = Math.min(22, Math.ceil(new Date().getHours() + 1)); setExtra({ label: "", start: h, end: h + 1 }); }} style={{ minHeight: 40, justifyContent: "center" }}>
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.schedule.addToday}</Text>
                </Pressable>
              )}
              {busy.length ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.schedule.todayNote}</Text> : null}
            </Frame>

            <Frame cut={12} contentStyle={{ padding: 14, gap: 4 }}>
              <Label tone={color.hi}>{t.schedule.week}</Label>
              {blocks.length === 0 ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.schedule.weekEmpty}</Text> : null}
              {blocks.map((b, i) => (
                <BlockEditor key={b.id} block={b} onChange={(nb) => change(blocks.map((x, k) => (k === i ? nb : x)))} onRemove={() => change(blocks.filter((_, k) => k !== i))} />
              ))}
              {blocks.length < MAX_BLOCKS ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {Object.keys(PRESETS).map((k) => (
                    <Pressable key={k} accessibilityRole="button" onPress={() => change([...blocks, { id: `b${Date.now().toString(36)}`, label: t.schedule.presets[k], ...PRESETS[k] }])}
                      style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)" }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 13, color: color.accent }}>{fill(t.schedule.addPreset, { name: t.schedule.presets[k] })}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Frame>
          </ScrollView>
          <SavedStamp stamp={stamp} />
        </View>
      </Provider>
    </Modal>
  );
}
