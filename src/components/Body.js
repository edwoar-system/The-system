// Body pieces: the "Muscles this week" card, the full body screen and the report after a quest.
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import BodyMap, { REST_COLORS, restColor, stepColor } from "./BodyMap";
import { MUSCLES, REGIONS, coverage, fatigueNow, hoursToFresh, level, muscleById, recoveryState, weekLoad } from "../game/muscles";
import { dayNum, weekNum } from "../game/skills";
import { Frame, Glow, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";
import StatusEffects from "./StatusEffects";
import { HabitsScreen } from "./Habits";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

function Legend() {
  const { color, font } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" }}>
      <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{t.body.legendNone}</Text>
      {[0, 0.2, 0.5, 0.8, 1].map((v) => <View key={v} style={{ width: 18, height: 6, backgroundColor: stepColor(v), transform: [{ skewX: "-30deg" }] }} />)}
      <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{t.body.legendFull}</Text>
    </View>
  );
}

function RestLegend() {
  const { color, font } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, justifyContent: "center" }}>
      {["fresh", "recovering", "tired"].map((k) => (
        <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 14, height: 6, backgroundColor: REST_COLORS[k], transform: [{ skewX: "-30deg" }] }} />
          <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{t.body.rest[k]}</Text>
        </View>
      ))}
    </View>
  );
}

function Percent({ value, size = 44 }) {
  const { color, font } = useTheme();
  return (
    <Text style={{ fontFamily: font.num, fontSize: size, lineHeight: size + 2, color: "#FFFFFF" }}>
      {value}<Text style={{ fontSize: size * 0.5, color: color.accent }}>%</Text>
    </Text>
  );
}

// Card on the Status screen.
export function BodyCard({ user, player }) {
  const { color, font } = useTheme();
  const [open, setOpen] = useState(false);
  const { load, lastWeek } = weekLoad(player.muscleLoad, weekNum(dayNum()));
  const pct = coverage(load);
  const tired = Object.entries(fatigueNow(player.fatigue)).filter(([, v]) => recoveryState(v) === "tired").map(([m]) => muscleById[m]?.name).filter(Boolean);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${t.body.title} ${pct}%. ${t.body.open}`} onPress={() => setOpen(true)}
        style={({ pressed }) => ({ marginTop: 12, marginHorizontal: 14, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
        <Frame cut={16} contentStyle={{ padding: 16, gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ gap: 4 }}>
              <Label tone={color.hi}>{t.body.title}</Label>
              <Percent value={pct} />
              <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.body.vsLast, { n: coverage(lastWeek) })}</Text>
            </View>
            <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)" }}>
              <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" fill="none" stroke={color.muted} strokeWidth={1.8} /></Svg>
            </View>
          </View>
          <View style={{ alignItems: "center" }}><BodyMap load={load} width={300} /></View>
          <Legend />
          {tired.length ? (
            <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: REST_COLORS.tired }}>{fill(t.body.tiredLine, { list: tired.slice(0, 4).join(", ") })}</Text>
          ) : null}
        </Frame>
      </Pressable>
      {open ? <BodyScreen user={user} player={player} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// Full screen: the map (this week, or recovery), tap a muscle for its details, and every muscle by region.
export function BodyScreen({ user, player, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState("week"); // "week" | "rest" | "status"
  const [sleepOpen, setSleepOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const { load, lastWeek } = weekLoad(player.muscleLoad, weekNum(dayNum()));
  const fat = fatigueNow(player.fatigue);
  const pick = (m) => setSel(sel === m ? null : m);
  const detail = (m) => {
    const v = level(load[m]);
    const f = fat[m] ?? 0;
    const st = recoveryState(f);
    const h = hoursToFresh(m, f);
    return fill(t.body.detail, { pct: Math.round(v * 100), state: t.body.rest[st] }) + (h ? ` ${fill(t.body.freshIn, { h })}` : "");
  };
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 30, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <Glow height={420} at={0.2} />
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" fill="none" stroke={color.muted} strokeWidth={1.8} /></Svg>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{t.body.back}</Text>
          </Pressable>
          <View style={{ alignItems: "center", gap: 6, marginTop: 6 }}>
            <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 26, color: "#FFFFFF" }}>{t.body.screenTitle}</Text>
            {mode === "week" ? (
              <>
                <Percent value={coverage(load)} size={56} />
                <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.body.vsLast, { n: coverage(lastWeek) })}</Text>
              </>
            ) : <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, textAlign: "center", color: color.muted }}>{mode === "rest" ? t.body.restSub : t.body.statusSub}</Text>}
          </View>
          <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6, marginTop: 14 }}>
            {["week", "rest", "status"].map((k) => (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: mode === k }} onPress={() => setMode(k)}
                style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: mode === k ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: mode === k ? "rgba(159,203,255,0.16)" : "transparent" }}>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: mode === k ? "#FFFFFF" : color.muted }}>{t.body.modes[k]}</Text>
              </Pressable>
            ))}
          </View>
          {mode === "status" ? (
            <View style={{ marginTop: 22 }}>
              {/* Your status today: water, sleep and the buffs and debuffs they give. */}
              <StatusEffects bare user={user} player={player} onOpenHabits={() => setSleepOpen(true)} />
              {sleepOpen ? <HabitsScreen user={user} player={player} start="sleep" onClose={() => setSleepOpen(false)} /> : null}
            </View>
          ) : (
            <>
          <View style={{ alignItems: "center", marginTop: 12 }}>
              <BodyMap load={load} mode={mode} fatigue={fat} width={340} onMuscle={pick} selected={sel} />
            </View>
            <View style={{ marginTop: 10 }}>{mode === "week" ? <Legend /> : <RestLegend />}</View>
            {sel ? (
              <Frame cut={12} style={{ marginTop: 12 }} contentStyle={{ padding: 14, gap: 4 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 17, color: "#FFFFFF" }}>{muscleById[sel].name}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{detail(sel)}</Text>
              </Frame>
            ) : <Text style={{ marginTop: 12, fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted, textAlign: "center" }}>{t.body.tapHint}</Text>}
            </>
          )}
          {mode !== "status" && REGIONS.map((r) => (
            <Frame key={r} cut={12} style={{ marginTop: 12 }} contentStyle={{ padding: 16 }}>
              <Label tone={color.hi}>{t.body.regions[r]}</Label>
              {MUSCLES.filter((m) => m.region === r).map((m) => {
                const v = level(load[m.id]);
                const f = fat[m.id] ?? 0;
                return (
                  <Pressable key={m.id} onPress={() => pick(m.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: color.line, marginTop: 6 }}>
                    <View style={{ width: 8, height: 8, transform: [{ rotate: "45deg" }], backgroundColor: restColor(f) }} />
                    <Text style={{ width: 150, fontFamily: sel === m.id ? font.bodyBold : font.bodyMedium, fontSize: 14, color: v || sel === m.id ? color.text : color.muted }}>{m.name}</Text>
                    <View style={{ flex: 1, height: 6, backgroundColor: "rgba(96,160,255,0.14)", transform: [{ skewX: "-30deg" }], overflow: "hidden" }}>
                      <View style={{ width: `${v * 100}%`, height: 6, backgroundColor: stepColor(v) }} />
                    </View>
                    <Text style={{ width: 40, textAlign: "right", fontFamily: font.num, fontSize: 15, color: v >= 1 ? "#FFFFFF" : color.muted }}>{Math.round(v * 100)}%</Text>
                  </Pressable>
                );
              })}
            </Frame>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// After a quest that trained muscles: the trained groups pulse, then continue or jump to the skill.
// data: { hit, load, before, after, skillName, skillId }
export function BodyReport({ data, onClose, onOpenSkill }) {
  const { color, font } = useTheme();
  if (!data) return null;
  const names = Object.keys(data.hit).sort((a, b) => data.hit[b] - data.hit[a]).map((m) => muscleById[m]?.name).filter(Boolean);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.96)", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <View style={{ width: "100%", maxWidth: 420, alignItems: "center", gap: 10 }}>
          <Label tone={color.hi}>{t.body.updated}</Label>
          <BodyMap load={data.load} hit={data.hit} width={330} />
          <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.body.trained}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
            {names.map((n) => (
              <View key={n} style={{ paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(207,228,255,0.5)", backgroundColor: "rgba(159,203,255,0.1)" }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: "#FFFFFF" }}>{n}</Text>
              </View>
            ))}
          </View>
          <Text style={{ marginTop: 6, fontFamily: font.bodyBold, fontSize: 15, color: color.text }}>{fill(t.body.weekLine, { a: data.before, b: data.after })}</Text>
          <SysButton label={t.body.continue} onPress={onClose} style={{ alignSelf: "stretch", marginTop: 10 }} />
          {onOpenSkill && data.skillId ? (
            <Pressable accessibilityRole="button" onPress={() => { onClose(); onOpenSkill(data.skillId); }} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{fill(t.body.openSkill, { skill: data.skillName })}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
