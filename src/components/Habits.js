// Habits: the card on Status and the full screen with four parts: habits, quitting, sleep and screen time.
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { skillById } from "../game/guild";
import { dayTimes } from "../game/profile";
import { todayKey } from "../game/quests";
import { dayNum } from "../game/skills";
import {
  HABIT_IDS, MAX_TRACKED, QUIT_PRESETS, REDEMPTION_QUESTS, cleanDays, habitGrid, habitStreak, hhmm, longestClean,
  nextMilestone, screenDays, sleepNights, sleepSummary, tracked, weekPct,
} from "../game/habits";
import { getQuest } from "../lib/day";
import { addQuit, logHabit, logScreen, logSleep, removeQuit, setTracked, slipQuit, takeRedemption } from "../lib/habits";
import { doneFeel, tapFeel } from "../lib/haptics";
import { Frame, Glow, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);
const AMBER = "#F6B45A";
const TABS = ["habits", "quit", "sleep", "screen"];

function Chip({ label, on, onPress, flex }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}
      style={{ flex: flex ? 1 : undefined, minHeight: 44, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? "#FFFFFF" : color.muted }}>{label}</Text>
    </Pressable>
  );
}

function Stepper({ label, value, onChange, step, min, max, format }) {
  const { color, font } = useTheme();
  const b = (d, s) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${s}`} onPress={() => onChange(Math.min(max, Math.max(min, value + d)))}
      style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 20, color: color.text }}>{s}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{label}</Text>
      {b(-step, "−")}
      <Text style={{ width: 74, textAlign: "center", fontFamily: font.num, fontSize: 22, color: "#FFFFFF" }}>{format(value)}</Text>
      {b(step, "+")}
    </View>
  );
}

// Bars for the last nights or days. target: a line to compare with.
function Bars({ items, value, max, target, label }) {
  const { color, font } = useTheme();
  const H = 110;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
        {target ? <View style={{ position: "absolute", left: 0, right: 0, bottom: (Math.min(target, max) / max) * H, borderTopWidth: 1, borderStyle: "dashed", borderColor: color.muted }} /> : null}
        {items.map((it) => (
          <View key={it.date} accessibilityLabel={`${it.date}: ${label(it)}`} style={{ flex: 1, height: Math.max(2, (Math.min(value(it), max) / max) * H), backgroundColor: color.purple, opacity: 0.85 }} />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{items[0]?.date.slice(5)}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{items[items.length - 1]?.date.slice(5)}</Text>
      </View>
    </View>
  );
}

// ---- Habits ----
function HabitsTab({ user, player }) {
  const { color, font } = useTheme();
  const [choosing, setChoosing] = useState(false);
  const today = dayNum();
  const list = tracked(player);
  const toggle = (id) => {
    const next = list.includes(id) ? list.filter((x) => x !== id) : list.length < MAX_TRACKED ? [...list, id] : list;
    setTracked(user.uid, next).catch(() => {});
  };
  return (
    <View style={{ gap: 12 }}>
      {list.map((id) => {
        const e = player.skills?.[id];
        const doneToday = e?.days?.[e.days.length - 1] === today;
        const grid = habitGrid(e, today);
        return (
          <Frame key={id} cut={12} contentStyle={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 16, color: "#FFFFFF" }}>{skillById[id]?.name ?? id}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.habits.line, { s: habitStreak(e, today), p: weekPct(e, today) })}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityState={{ checked: doneToday }} disabled={doneToday}
                onPress={() => logHabit(user.uid, id).then((r) => { if (!r?.already) doneFeel(); }).catch(() => {})}
                style={{ minHeight: 40, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: doneToday ? color.purple : color.frame, backgroundColor: doneToday ? "rgba(168,126,255,0.18)" : "transparent" }}>
                <Text style={{ fontFamily: font.bold, fontSize: 12, color: doneToday ? "#FFFFFF" : color.accent }}>{doneToday ? t.habits.doneToday : t.habits.markToday}</Text>
              </Pressable>
            </View>
            <View accessibilityLabel={fill(t.habits.gridLabel, { n: grid.flat().filter(Boolean).length })} style={{ gap: 3 }}>
              {grid.map((week, w) => (
                <View key={w} style={{ flexDirection: "row", gap: 3 }}>
                  {week.map((d, i) => (
                    <View key={i} style={{ flex: 1, height: 14, backgroundColor: d === null ? "transparent" : d ? color.purple : "rgba(159,203,255,0.08)", borderWidth: d === null ? 0 : 1, borderColor: d ? color.purple : "rgba(159,203,255,0.12)" }} />
                  ))}
                </View>
              ))}
            </View>
          </Frame>
        );
      })}
      <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.habits.how}</Text>
      <SysButton label={choosing ? t.habits.chooseDone : t.habits.choose} onPress={() => setChoosing(!choosing)} />
      {choosing ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {HABIT_IDS.map((id) => <Chip key={id} label={skillById[id]?.name ?? id} on={list.includes(id)} onPress={() => toggle(id)} />)}
          <Text style={{ width: "100%", fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.habits.max, { n: MAX_TRACKED })}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ---- Quitting ----
function QuitTab({ user, player }) {
  const { color, font } = useTheme();
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");
  const [ago, setAgo] = useState(0);
  const [confirm, setConfirm] = useState(null); // id to slip
  const [redeem, setRedeem] = useState(null); // id just slipped
  const [taken, setTaken] = useState(null);
  const quits = player.quits ?? [];
  const now = Date.now();
  const add = (id, name) => {
    addQuit(user.uid, { id, name, since: now - ago * 86400000 }).then(doneFeel).catch(() => {});
    setAdding(false); setCustom(""); setAgo(0);
  };
  return (
    <View style={{ gap: 12 }}>
      {quits.length === 0 && !adding ? <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.muted }}>{t.habits.quitEmpty}</Text> : null}
      {quits.map((q) => {
        const days = cleanDays(q, now);
        const next = nextMilestone(days);
        return (
          <Frame key={q.id} cut={12} contentStyle={{ padding: 14, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 16, color: "#FFFFFF" }}>{q.name}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.habits.longest, { n: longestClean(q, now) })}{next ? `  ·  ${fill(t.habits.nextMile, { n: next - days })}` : ""}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontFamily: font.num, fontSize: 40, lineHeight: 42, color: "#FFFFFF" }}>{days}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{t.habits.daysClean}</Text>
              </View>
            </View>
            {confirm === q.id ? (
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text }}>{t.habits.slipAsk}</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Chip flex label={t.habits.cancel} onPress={() => setConfirm(null)} />
                  <Chip flex on label={t.habits.slipYes} onPress={() => { slipQuit(user.uid, q.id).catch(() => {}); tapFeel(); setConfirm(null); setRedeem(q.id); setTaken(null); }} />
                </View>
              </View>
            ) : redeem === q.id ? (
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text }}>{taken === "error" ? t.habits.redeemFailed : taken ? t.habits.redeemTaken : t.habits.redeemAsk}</Text>
                {!taken ? (
                  <>
                    {REDEMPTION_QUESTS.map((id) => (
                      <Pressable key={id} accessibilityRole="button" onPress={() => takeRedemption(user.uid, id).then(() => { doneFeel(); setTaken(id); }).catch(() => setTaken("error"))}
                        style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.25)" }}>
                        <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: "#FFFFFF" }}>{getQuest(id)?.title}</Text>
                      </Pressable>
                    ))}
                    <Pressable accessibilityRole="button" onPress={() => setRedeem(null)} style={{ minHeight: 40, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.habits.noThanks}</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable accessibilityRole="button" onPress={() => setRedeem(null)} style={{ minHeight: 40, justifyContent: "center" }}>
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.habits.ok}</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Pressable accessibilityRole="button" onPress={() => setConfirm(q.id)} style={{ minHeight: 40, justifyContent: "center" }}>
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: AMBER }}>{t.habits.slip}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => removeQuit(user.uid, q.id).catch(() => {})} style={{ minHeight: 40, justifyContent: "center" }}>
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.habits.stopTracking}</Text>
                </Pressable>
              </View>
            )}
          </Frame>
        );
      })}
      {adding ? (
        <Frame cut={12} contentStyle={{ padding: 14, gap: 10 }}>
          <Label tone={color.hi}>{t.habits.addQuitTitle}</Label>
          <Stepper label={t.habits.stoppedAgo} value={ago} onChange={setAgo} step={1} min={0} max={365} format={(v) => (v ? fill(t.habits.daysN, { n: v }) : t.habits.todayWord)} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {QUIT_PRESETS.filter((id) => !quits.some((q) => q.id === id)).map((id) => <Chip key={id} label={t.habits.presets[id]} onPress={() => add(id, t.habits.presets[id])} />)}
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput value={custom} onChangeText={setCustom} placeholder={t.habits.customPh} placeholderTextColor="#4A5A7A" accessibilityLabel={t.habits.customPh} maxLength={40}
              style={{ flex: 1, minWidth: 0, minHeight: 46, paddingHorizontal: 12, fontFamily: font.body, fontSize: 15, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
            <SysButton label={t.habits.add} disabled={custom.trim().length < 2} onPress={() => add(`c${Date.now()}`, custom.trim())} style={{ minHeight: 46 }} />
          </View>
          <Pressable accessibilityRole="button" onPress={() => setAdding(false)} style={{ minHeight: 40, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.habits.cancel}</Text>
          </Pressable>
        </Frame>
      ) : <SysButton label={t.habits.addQuit} onPress={() => setAdding(true)} />}
      <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.habits.quitNote}</Text>
    </View>
  );
}

// ---- Sleep ----
function SleepTab({ user, player }) {
  const { color, font } = useTheme();
  const times = dayTimes(player.profile);
  const last = player.sleepLog?.[todayKey()];
  const [bed, setBed] = useState(last ? (last[0] < 12 ? last[0] + 24 : last[0]) : times.bed);
  const [wake, setWake] = useState(last ? last[1] : times.wake);
  const [saved, setSaved] = useState(!!last);
  const nights = sleepNights(player.sleepLog, 14);
  const sum = sleepSummary(player.sleepLog, player.profile);
  const target = Math.round((times.wake + 24 - times.bed) * 10) / 10;
  return (
    <View style={{ gap: 12 }}>
      <Frame cut={12} contentStyle={{ padding: 14, gap: 10 }}>
        <Label tone={color.hi}>{t.habits.lastNight}</Label>
        <Stepper label={t.habits.wentToBed} value={bed} onChange={(v) => { setBed(v); setSaved(false); }} step={0.25} min={18} max={30} format={hhmm} />
        <Stepper label={t.habits.wokeUp} value={wake} onChange={(v) => { setWake(v); setSaved(false); }} step={0.25} min={3} max={14} format={hhmm} />
        <SysButton label={saved ? t.habits.sleepSaved : t.habits.saveSleep} disabled={saved} onPress={() => logSleep(user.uid, bed % 24, wake).then(() => { doneFeel(); setSaved(true); }).catch(() => {})} />
      </Frame>
      {sum ? (
        <Frame cut={12} contentStyle={{ padding: 14, gap: 10 }}>
          <Label tone={color.hi}>{t.habits.sleepWeek}</Label>
          <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text }}>
            {fill(t.habits.sleepAvg, { h: sum.hours, bed: hhmm(sum.bed), t: hhmm(sum.targetBed) })}
            {Math.abs(sum.lateBy) >= 15 ? ` ${fill(sum.lateBy > 0 ? t.habits.later : t.habits.earlier, { m: Math.abs(sum.lateBy) })}` : ` ${t.habits.onTime}`}
          </Text>
          {nights.length >= 2 ? <Bars items={nights} value={(n) => n.hours} max={12} target={target} label={(n) => `${n.hours} h`} /> : null}
          <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.habits.sleepLine, { h: target })}</Text>
        </Frame>
      ) : <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.habits.sleepEmpty}</Text>}
    </View>
  );
}

// ---- Screen time ----
function ScreenTab({ user, player }) {
  const { color, font } = useTheme();
  const today = player.screenLog?.[todayKey()];
  const [mins, setMins] = useState(today ?? 180);
  const [saved, setSaved] = useState(today != null);
  const days = screenDays(player.screenLog, 14);
  const avg = days.length ? Math.round(days.reduce((s, d) => s + d.minutes, 0) / days.length) : null;
  const hm = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}`;
  return (
    <View style={{ gap: 12 }}>
      <Frame cut={12} contentStyle={{ padding: 14, gap: 10 }}>
        <Label tone={color.hi}>{t.habits.screenToday}</Label>
        <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.habits.screenHow}</Text>
        <Stepper label={t.habits.screenLabel} value={mins} onChange={(v) => { setMins(v); setSaved(false); }} step={15} min={0} max={960} format={hm} />
        <SysButton label={saved ? t.habits.screenSaved : t.habits.saveScreen} disabled={saved} onPress={() => logScreen(user.uid, mins).then(() => { doneFeel(); setSaved(true); }).catch(() => {})} />
      </Frame>
      {days.length >= 2 ? (
        <Frame cut={12} contentStyle={{ padding: 14, gap: 10 }}>
          <Label tone={color.hi}>{t.habits.screenDays}</Label>
          <Text style={{ fontFamily: font.body, fontSize: 14, color: color.text }}>{fill(t.habits.screenAvg, { t: hm(avg) })}</Text>
          <Bars items={days} value={(d) => d.minutes} max={Math.max(240, ...days.map((d) => d.minutes))} label={(d) => hm(d.minutes)} />
        </Frame>
      ) : null}
      <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.habits.screenLater}</Text>
    </View>
  );
}

export function HabitsScreen({ user, player, onClose, start = "habits" }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(start);
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 12 }}>
          <Glow height={380} at={0.18} />
          <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.habits.back}`}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ textAlign: "center", fontFamily: font.bold, fontSize: 26, color: "#FFFFFF" }}>{t.habits.title}</Text>
          <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 4 }}>
            {TABS.map((k) => <Chip key={k} flex label={t.habits.tabs[k]} on={tab === k} onPress={() => setTab(k)} />)}
          </View>
          {tab === "habits" ? <HabitsTab user={user} player={player} /> : null}
          {tab === "quit" ? <QuitTab user={user} player={player} /> : null}
          {tab === "sleep" ? <SleepTab user={user} player={player} /> : null}
          {tab === "screen" ? <ScreenTab user={user} player={player} /> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

// Status card: today's habits at a glance, your longest clean streak, and a nudge to log last night's sleep.
export function HabitsCard({ user, player }) {
  const { color, font } = useTheme();
  const [open, setOpen] = useState(null);
  const today = dayNum();
  const list = tracked(player);
  const done = list.filter((id) => player.skills?.[id]?.days?.slice(-1)[0] === today).length;
  const best = [...(player.quits ?? [])].sort((a, b) => cleanDays(b) - cleanDays(a))[0];
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const needSleep = !player.sleepLog?.[todayKey()] && hour >= dayTimes(player.profile).wake && hour < 14;
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(needSleep ? "sleep" : "habits")} style={({ pressed }) => ({ marginTop: 12, marginHorizontal: 14, opacity: pressed ? 0.85 : 1 })}>
        <Frame cut={14} contentStyle={{ padding: 16, gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Label tone={color.hi}>{t.habits.cardTitle}</Label>
            <Text style={{ fontFamily: font.num, fontSize: 18, color: "#FFFFFF" }}>{done}<Text style={{ fontSize: 14, color: color.muted }}> / {list.length}</Text></Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {list.map((id) => {
              const on = player.skills?.[id]?.days?.slice(-1)[0] === today;
              return (
                <View key={id} style={{ paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: on ? color.purple : "rgba(159,203,255,0.18)", backgroundColor: on ? "rgba(168,126,255,0.15)" : "transparent" }}>
                  <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: on ? "#FFFFFF" : color.muted }}>{skillById[id]?.name ?? id}</Text>
                </View>
              );
            })}
          </View>
          {best ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.text }}>{fill(t.habits.cardClean, { name: best.name, n: cleanDays(best) })}</Text> : null}
          {needSleep ? <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.habits.cardSleep}</Text> : null}
        </Frame>
      </Pressable>
      {open ? <HabitsScreen user={user} player={player} start={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
