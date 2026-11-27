// "This week" on the quest screen: things you want to do this week, with or without a day. And a picker to make
// anything your side quest for today (a week item, a to-do or one of your skills).
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { suggestWhen, weekDone, weekItems } from "../game/week";
import { WEEKDAYS, PLAN_TIMES, weekdayOf } from "../game/weekplan";
import { skillById } from "../game/guild";
import { interestSkills } from "../game/profile";
import { todayKey } from "../game/quests";
import { todosToday } from "../game/todos";
import { addWeekItem, planWeekItem, removeWeekItem, setSide, skillQuestId, tickWeekItem } from "../lib/week";
import { doneFeel, tapFeel } from "../lib/haptics";
import { showSystem } from "../lib/popup";
import { Frame, HexCheck, Label, SysButton } from "./sys";
import SwipeBack from "./SwipeBack";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const nameOf = (x) => (x.skill ? skillById[x.skill]?.name ?? x.skill : x.text);

function Chip({ label, on, onPress }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}
      style={{ minHeight: 40, minWidth: 44, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.25)", backgroundColor: on ? "rgba(159,203,255,0.14)" : "transparent" }}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: on ? "#FFFFFF" : color.muted }}>{label}</Text>
    </Pressable>
  );
}

// Add something for this week: a skill (search) or anything in your own words, how often, and maybe a day.
function AddWeek({ user, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState(null);
  const [times, setTimes] = useState(1);
  const [day, setDay] = useState(null);
  const [time, setTime] = useState(null);
  const [busy, setBusy] = useState(false);
  const query = q.trim().toLowerCase();
  const matches = query.length > 1 && !skill ? Object.values(skillById).filter((s) => s.name.toLowerCase().includes(query)).slice(0, 6) : [];
  const ready = skill || query.length > 1;
  async function save() {
    setBusy(true);
    try { await addWeekItem(user.uid, { skill: skill?.id, text: skill ? null : q, times, day, time: day ? time : null }); onClose(); } catch { setBusy(false); }
  }
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <SwipeBack onBack={onClose}>
        <View style={{ flex: 1, backgroundColor: color.bg }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40, paddingHorizontal: 14, gap: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
            <Pressable accessibilityRole="button" onPress={onClose} style={{ alignSelf: "flex-start", minHeight: 40, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{t.week.back}</Text>
            </Pressable>
            <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 22, color: "#FFFFFF" }}>{t.week.addTitle}</Text>
            {skill ? (
              <Pressable accessibilityRole="button" onPress={() => setSkill(null)} style={{ minHeight: 48, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: color.frame }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 16, color: "#FFFFFF" }}>{skill.name}<Text style={{ color: color.muted, fontSize: 12 }}>{`   ${t.week.change}`}</Text></Text>
              </Pressable>
            ) : (
              <TextInput value={q} onChangeText={setQ} autoFocus placeholder={t.week.placeholder} placeholderTextColor="#5A6A8A" maxLength={60} accessibilityLabel={t.week.placeholder}
                style={{ minHeight: 48, paddingHorizontal: 12, fontFamily: font.body, fontSize: 16, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.35)", backgroundColor: "rgba(5,10,24,0.7)" }} />
            )}
            {matches.length ? (
              <View style={{ gap: 6 }}>
                <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.week.asSkill}</Text>
                {matches.map((s) => (
                  <Pressable key={s.id} accessibilityRole="button" onPress={() => setSkill(s)} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.25)" }}>
                    <Text style={{ fontFamily: font.bodyMedium, fontSize: 15, color: color.text }}>{s.name}</Text>
                  </Pressable>
                ))}
                <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.week.asText, { text: q.trim() })}</Text>
              </View>
            ) : null}
            <Label>{t.week.howOften}</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => <Chip key={n} label={fill(t.week.times, { n })} on={times === n} onPress={() => setTimes(n)} />)}
            </View>
            <Label>{t.week.when}</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <Chip label={t.week.anyDay} on={!day} onPress={() => setDay(null)} />
              {WEEKDAYS.map((d) => <Chip key={d} label={t.week.days[d - 1]} on={day === d} onPress={() => setDay(d)} />)}
            </View>
            {day ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <Chip label={t.week.anyTime} on={!time} onPress={() => setTime(null)} />
                {PLAN_TIMES.map((x) => <Chip key={x} label={x} on={time === x} onPress={() => setTime(x)} />)}
              </View>
            ) : null}
            <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{day ? t.week.dayHint : t.week.anyHint}</Text>
            <SysButton label={t.week.save} disabled={!ready || busy} onPress={save} />
          </ScrollView>
        </View>
      </SwipeBack>
    </Modal>
  );
}

// Pick today's side quest yourself.
export function SidePicker({ user, player, onClose }) {
  const { color, font } = useTheme();
  const today = todayKey();
  const week = weekItems(player).filter((x) => weekDone(player, x) < (x.times ?? 1));
  const todos = todosToday(player, today).filter((x) => !x.done);
  const mine = [...interestSkills(player.profile)].filter((id) => skillById[id]).slice(0, 8);
  const pick = (id) => { tapFeel(); setSide(user.uid, id).catch(() => {}); onClose(); };
  const row = (key, label, sub, id) => (
    <Pressable key={key} accessibilityRole="button" onPress={() => pick(id)} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.22)", backgroundColor: pressed ? "rgba(159,203,255,0.1)" : "transparent" })}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: "#FFFFFF" }}>{label}</Text>
      {sub ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{sub}</Text> : null}
    </Pressable>
  );
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable accessibilityLabel={t.week.close} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.6)" }} />
      <View style={{ maxHeight: "75%", backgroundColor: color.bg, borderTopWidth: 1, borderColor: color.frame }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 8, maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <Label tone={color.hi}>{t.week.pickSide}</Label>
          <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.week.pickSideSub}</Text>
          {week.length ? <Text style={{ marginTop: 6, fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: color.muted }}>{t.week.title}</Text> : null}
          {week.map((x) => row(`w${x.id}`, nameOf(x), fill(t.week.progress, { n: weekDone(player, x), of: x.times ?? 1 }), x.skill ? skillQuestId(player, x.skill) : `wk:${x.id}`))}
          {todos.length ? <Text style={{ marginTop: 6, fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: color.muted }}>{t.todos.title}</Text> : null}
          {todos.map((x) => row(`t${x.id}`, x.title, null, `todo:${x.id}`))}
          {mine.length ? <Text style={{ marginTop: 6, fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: color.muted }}>{t.week.yourSkills}</Text> : null}
          {mine.map((id) => row(`s${id}`, skillById[id].name, null, skillQuestId(player, id)))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// Little dots for progress (filled = done), lighter than a box.
function Dots({ n, of }) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 4 }} accessibilityLabel={fill(t.week.progress, { n, of })}>
      {Array.from({ length: of }, (_, i) => (
        <View key={i} style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: i < n ? color.purple : "rgba(159,203,255,0.4)", backgroundColor: i < n ? color.purple : "transparent" }} />
      ))}
    </View>
  );
}

// A text link, no box.
function TextLink({ label, onPress, tone }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ minHeight: 32, justifyContent: "center" }}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: tone ?? color.accent }}>{label}</Text>
    </Pressable>
  );
}

export default function WeekCard({ user, player }) {
  const { color, font } = useTheme();
  const [adding, setAdding] = useState(false);
  const items = weekItems(player);
  const wd = weekdayOf();
  const sideId = player.day?.side && !player.day.side.done ? player.day.side.id : null;
  // Spread suggestions: each item gets a different day.
  const used = new Set();
  const tick = (x) => tickWeekItem(user.uid, x.id).then((r) => {
    if (!r) return;
    doneFeel();
    showSystem({ title: fill(t.week.ticked, { name: nameOf(x) }), lines: [fill(t.week.tickedLine, { n: r.n, of: r.of, c: r.coins })], tone: "buff" });
  }).catch(() => {});
  return (
    <Frame cut={12} contentStyle={{ paddingVertical: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Label tone={color.hi}>{t.week.title}</Label>
          {!items.length ? <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.week.empty}</Text> : null}
        </View>
        <TextLink label={t.week.addShort} onPress={() => setAdding(true)} />
      </View>
      {items.map((x) => {
        const n = weekDone(player, x);
        const of = x.times ?? 1;
        const done = n >= of;
        const id = x.skill ? skillQuestId(player, x.skill) : `wk:${x.id}`;
        const isSide = sideId === id;
        const planned = x.day ? `${t.week.days[x.day - 1]}${x.time ? ` ${x.time}` : ""}${x.day === wd ? ` · ${t.week.todayWord}` : ""}` : null;
        const tip = !done && !x.day ? suggestWhen(player, x, new Date(), 7).find((o) => !used.has(o.day)) ?? null : null;
        if (tip) used.add(tip.day);
        return (
          <View key={x.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, opacity: done ? 0.5 : 1 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={fill(t.week.holdDelete, { name: nameOf(x) })} onLongPress={() => removeWeekItem(user.uid, x.id).catch(() => {})} style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ flexShrink: 1, fontFamily: font.bodyBold, fontSize: 15, color: "#FFFFFF" }}>{nameOf(x)}</Text>
                <Dots n={Math.min(n, of)} of={of} />
              </View>
              {done ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.week.doneWeek}</Text> : (
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 14 }}>
                  {planned ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{planned}</Text> : null}
                  {tip ? <TextLink label={fill(t.week.suggest, { when: `${tip.today ? t.week.todayWord : t.week.days[tip.day - 1]} ${tip.time}` })} onPress={() => { tapFeel(); planWeekItem(user.uid, x.id, tip.day, tip.time).catch(() => {}); }} /> : null}
                  {x.day !== wd ? <TextLink label={isSide ? t.week.isSide : t.week.doToday} tone={isSide ? color.purple : color.text} onPress={() => { if (!isSide) { tapFeel(); setSide(user.uid, id).catch(() => {}); } }} /> : null}
                </View>
              )}
            </Pressable>
            {!done ? <HexCheck size={30} done={false} onPress={() => tick(x)} label={fill(t.week.tickLabel, { name: nameOf(x) })} /> : null}
          </View>
        );
      })}
      {adding ? <AddWeek user={user} onClose={() => setAdding(false)} /> : null}
    </Frame>
  );
}
