// Your schedule: your usual week of busy blocks, and today's changes. Everything saves by itself.
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_BLOCKS, addOnDay, blocksOn, copyDay, editOnDay, hhmm, removeOnDay, weekdayOf } from "../game/schedule";
import { todayKey } from "../game/quests";
import { addGap, addToday, editToday, removeToday, resetToday, saveSchedule, skipToday } from "../lib/schedule";
import { SavedStamp, useSavedStamp } from "./saved";
import { Frame, Glow, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";
import SwipeBack from "./SwipeBack";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const PRESETS = {
  school: { start: 8.5, end: 15.5 },
  training: { start: 18, end: 19.5 },
  work: { start: 10, end: 16 },
  other: { start: 17, end: 18 },
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

function BlockEditor({ block, onChange, onRemove, shared }) {
  const { color, font } = useTheme();
  return (
    <View style={{ gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.line }}>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TextInput value={block.label} onChangeText={(v) => onChange({ label: v.slice(0, 30) })} accessibilityLabel={t.schedule.name}
          style={{ flex: 1, minWidth: 0, minHeight: 42, paddingHorizontal: 10, fontFamily: font.bold, fontSize: 15, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.25)", backgroundColor: "rgba(5,10,24,0.7)" }} />
        <Pressable accessibilityRole="button" onPress={onRemove} style={{ minHeight: 40, justifyContent: "center", paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.schedule.remove}</Text>
        </Pressable>
      </View>
      <Step label={t.schedule.from} value={block.start} onChange={(v) => onChange({ start: v, end: Math.max(block.end, v + 0.25) })} />
      <Step label={t.schedule.to} value={block.end} onChange={(v) => onChange({ end: Math.max(v, block.start + 0.25) })} />
      {shared ? <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{fill(t.schedule.shared, { days: shared })}</Text> : null}
    </View>
  );
}

// One of today's blocks, with the quick changes from the first System site: ended earlier, started later,
// a free hour in between, or not going at all. Only for today.
function TodayBlock({ user, block, edited, skipped, gaps, track }) {
  const { color, font } = useTheme();
  const [mode, setMode] = useState(null); // "end" | "start" | "gap"
  const [val, setVal] = useState(null);
  const b = { ...block, ...(edited ?? {}) };
  const changed = !!edited || skipped || gaps.length > 0;
  const opt = (key, label, onPress) => (
    <Pressable key={key} accessibilityRole="button" onPress={onPress}
      style={{ minHeight: 36, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1, borderColor: mode === key ? color.frame : "rgba(159,203,255,0.25)", backgroundColor: mode === key ? "rgba(159,203,255,0.16)" : "transparent" }}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.text }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: color.line, opacity: skipped ? 0.55 : 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: color.text, textDecorationLine: skipped ? "line-through" : "none" }}>{block.label}</Text>
          <Text style={{ fontFamily: font.num, fontSize: 13, color: changed ? color.accent : color.muted }}>
            {`${hhmm(b.start)}–${hhmm(b.end)}`}{gaps.map((g) => `  ·  ${fill(t.schedule.freeGap, { from: hhmm(g.start), to: hhmm(g.end) })}`).join("")}
          </Text>
        </View>
        {changed ? (
          <Pressable accessibilityRole="button" onPress={() => track(resetToday(user.uid, block.id)).catch(() => {})} style={{ minHeight: 40, justifyContent: "center" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.muted }}>{t.schedule.undo}</Text>
          </Pressable>
        ) : null}
      </View>
      {!skipped ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {opt("end", t.schedule.endedEarly, () => { setMode(mode === "end" ? null : "end"); setVal(Math.max(b.start + 0.25, b.end - 1)); })}
          {opt("start", t.schedule.startedLate, () => { setMode(mode === "start" ? null : "start"); setVal(Math.min(b.end - 0.25, b.start + 1)); })}
          {opt("gap", t.schedule.freeHour, () => { setMode(mode === "gap" ? null : "gap"); setVal(Math.round((b.start + 1) * 4) / 4); })}
          {opt("skip", t.schedule.notGoing, () => track(skipToday(user.uid, block.id, true)).catch(() => {}))}
        </View>
      ) : null}
      {mode && !skipped ? (
        <View style={{ gap: 8 }}>
          <Step label={mode === "start" ? t.schedule.from : t.schedule.to} value={val}
            min={mode === "end" ? b.start + 0.25 : mode === "start" ? 5 : b.start} max={mode === "start" ? b.end - 0.25 : mode === "gap" ? b.end - 0.25 : b.end}
            onChange={setVal} />
          {mode === "gap" ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.schedule.gapNote, { from: hhmm(val), to: hhmm(Math.min(b.end, val + 1)) })}</Text> : null}
          <SysButton label={t.schedule.saveToday} onPress={() => {
            const p = mode === "end" ? editToday(user.uid, block.id, { end: val }) : mode === "start" ? editToday(user.uid, block.id, { start: val }) : addGap(user.uid, block.id, val, Math.min(b.end, val + 1));
            track(p).catch(() => {});
            setMode(null);
          }} />
        </View>
      ) : null}
      {skipped ? (
        <Pressable accessibilityRole="button" onPress={() => track(skipToday(user.uid, block.id, false)).catch(() => {})} style={{ minHeight: 36, justifyContent: "center" }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.accent }}>{t.schedule.unskip}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function Schedule({ user, player, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const { stamp, track, Provider } = useSavedStamp();
  const [blocks, setBlocks] = useState(player.schedule ?? []);
  const [extra, setExtra] = useState(null); // a one-off for today being added
  const today = todayKey();
  const wd = weekdayOf(today);
  const [day, setDay] = useState(wd);
  const [copyTo, setCopyTo] = useState(null); // days picked to copy this day to
  const timer = useRef(null);
  const latest = useRef(null);
  const flushRef = useRef(null);
  flushRef.current = () => { clearTimeout(timer.current); if (latest.current) { track(saveSchedule(user.uid, latest.current)).catch(() => {}); latest.current = null; } };
  useEffect(() => () => flushRef.current(), []);
  const change = (next) => { setBlocks(next); latest.current = next; clearTimeout(timer.current); timer.current = setTimeout(() => flushRef.current(), 800); };

  const todayDay = player.scheduleDay?.date === today ? player.scheduleDay : { skip: [], extra: [], edits: {}, gaps: [] };
  const usualToday = blocksOn(player.schedule, wd);
  const onDay = blocksOn(blocks, day);
  const calToday = player.calendarBusy?.[today] ?? [];

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <SwipeBack onBack={onClose}>
      <Provider value={track}>
        <View style={{ flex: 1, backgroundColor: color.bg }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 80, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 12 }}>
            <Glow height={380} at={0.18} />
            <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.schedule.back}`}</Text>
            </Pressable>
            <Text accessibilityRole="header" style={{ textAlign: "center", fontFamily: font.bold, fontSize: 26, color: "#FFFFFF" }}>{t.schedule.title}</Text>
            <Text style={{ textAlign: "center", fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.schedule.sub}</Text>

            <Frame cut={12} contentStyle={{ padding: 14, gap: 4 }}>
              <Label tone={color.hi}>{fill(t.schedule.todayTitle, { day: t.board.dayNames[wd].toUpperCase() })}</Label>
              <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted, marginBottom: 4 }}>{t.schedule.todayNote}</Text>
              {usualToday.length === 0 && !todayDay.extra?.length && !calToday.length ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.schedule.todayFree}</Text> : null}
              {usualToday.map((b) => (
                <TodayBlock key={b.id} user={user} block={b} edited={todayDay.edits?.[b.id]} skipped={todayDay.skip?.includes(b.id)}
                  gaps={(todayDay.gaps ?? []).filter((g) => g.of === b.id)} track={track} />
              ))}
              {calToday.map((e, i) => (
                <View key={`cal${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 40, borderTopWidth: 1, borderTopColor: color.line }}>
                  <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{e.label ?? t.schedule.calendarEvent}</Text>
                  <Text style={{ fontFamily: font.num, fontSize: 13, color: color.muted }}>{`${hhmm(e.start)}–${hhmm(e.end)}  ·  ${t.schedule.fromCalendar}`}</Text>
                </View>
              ))}
              {(todayDay.extra ?? []).map((b) => (
                <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, borderTopWidth: 1, borderTopColor: color.line }}>
                  <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{`${b.label}  ${hhmm(b.start)}–${hhmm(b.end)}`}</Text>
                  <Pressable accessibilityRole="button" onPress={() => track(removeToday(user.uid, b.id)).catch(() => {})} style={{ minHeight: 40, justifyContent: "center" }}>
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.schedule.remove}</Text>
                  </Pressable>
                </View>
              ))}
              {extra ? (
                <View style={{ gap: 8, marginTop: 6 }}>
                  <TextInput value={extra.label} onChangeText={(v) => setExtra({ ...extra, label: v.slice(0, 30) })} placeholder={t.schedule.extraPh} placeholderTextColor="#4A5A7A" accessibilityLabel={t.schedule.extraPh}
                    style={{ minHeight: 42, paddingHorizontal: 10, fontFamily: font.body, fontSize: 15, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.25)", backgroundColor: "rgba(5,10,24,0.7)" }} />
                  <Step label={t.schedule.from} value={extra.start} onChange={(v) => setExtra({ ...extra, start: v, end: Math.max(extra.end, v + 0.25) })} />
                  <Step label={t.schedule.to} value={extra.end} onChange={(v) => setExtra({ ...extra, end: Math.max(v, extra.start + 0.25) })} />
                  <SysButton label={t.schedule.addIt} disabled={extra.label.trim().length < 2} onPress={() => { track(addToday(user.uid, { label: extra.label.trim(), start: extra.start, end: extra.end })).catch(() => {}); setExtra(null); }} />
                </View>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => { const h = Math.min(22, Math.ceil(new Date().getHours() + 1)); setExtra({ label: "", start: h, end: h + 1 }); }} style={{ minHeight: 40, justifyContent: "center", marginTop: 4 }}>
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.schedule.addToday}</Text>
                </Pressable>
              )}
            </Frame>

            <Frame cut={12} contentStyle={{ padding: 14, gap: 8 }}>
              <Label tone={color.hi}>{t.schedule.week}</Label>
              <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.schedule.weekHint}</Text>
              <View style={{ flexDirection: "row", gap: 3 }}>
                {t.gym.weekdays.map((d, i) => {
                  const on = day === i;
                  const n = blocksOn(blocks, i).length;
                  return (
                    <Pressable key={d} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { setDay(i); setCopyTo(null); }}
                      style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", gap: 1, borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.2)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 12, color: on ? "#FFFFFF" : color.muted }}>{d}</Text>
                      <Text style={{ fontFamily: font.num, fontSize: 10, color: color.muted }}>{n || "·"}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {onDay.length === 0 ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{fill(t.schedule.dayEmpty, { day: t.board.dayNames[day] })}</Text> : null}
              {onDay.map((b) => {
                const others = b.days.filter((k) => k !== day);
                return (
                  <BlockEditor key={b.id} block={b} shared={others.length ? others.map((k) => t.gym.weekdays[k]).join(", ") : null}
                    onChange={(patch) => change(editOnDay(blocks, b.id, day, patch))} onRemove={() => change(removeOnDay(blocks, b.id, day))} />
                );
              })}
              {blocks.length < MAX_BLOCKS ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {Object.keys(PRESETS).map((k) => (
                    <Pressable key={k} accessibilityRole="button" onPress={() => change(addOnDay(blocks, day, { label: t.schedule.presets[k], start: PRESETS[k].start, end: PRESETS[k].end }))}
                      style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)" }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 13, color: color.accent }}>{fill(t.schedule.addPreset, { name: t.schedule.presets[k] })}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {onDay.length ? (
                copyTo ? (
                  <View style={{ gap: 8, marginTop: 6 }}>
                    <Text style={{ fontFamily: font.body, fontSize: 13, color: color.text }}>{fill(t.schedule.copyAsk, { day: t.board.dayNames[day] })}</Text>
                    <View style={{ flexDirection: "row", gap: 3 }}>
                      {t.gym.weekdays.map((d, i) => {
                        const on = copyTo.includes(i);
                        return (
                          <Pressable key={d} accessibilityRole="button" accessibilityState={{ selected: on }} disabled={i === day}
                            onPress={() => setCopyTo(on ? copyTo.filter((x) => x !== i) : [...copyTo, i])}
                            style={{ flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", opacity: i === day ? 0.3 : 1, borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.2)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
                            <Text style={{ fontFamily: font.bold, fontSize: 12, color: on ? "#FFFFFF" : color.muted }}>{d}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <SysButton label={fill(t.schedule.copyGo, { n: copyTo.length })} disabled={!copyTo.length} onPress={() => { change(copyDay(blocks, day, copyTo)); setCopyTo(null); }} />
                  </View>
                ) : (
                  <Pressable accessibilityRole="button" onPress={() => setCopyTo([])} style={{ minHeight: 40, justifyContent: "center" }}>
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{fill(t.schedule.copy, { day: t.board.dayNames[day] })}</Text>
                  </Pressable>
                )
              ) : null}
            </Frame>
          </ScrollView>
          <SavedStamp stamp={stamp} />
        </View>
      </Provider>
          </SwipeBack>
    </Modal>
  );
}
