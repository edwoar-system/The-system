// Quick log bar: one tap per small thing you just did. Counts add up toward today's main quests.
import { useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { QUICK, QUICK_DEFAULT, QUICK_MAX, quickBar, quickTarget, quickToday } from "../game/quick";
import { setQuickPins } from "../lib/player";
import { quickLog, quickUndo } from "../lib/quick";
import { Frame, Label, nativeDriver } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";
import { tapFeel } from "../lib/haptics";
import { DIFF_SETS, difficultyOf } from "../game/difficulty";
import { fitsSituation } from "../game/effort";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

export default function QuickLog({ user, player, day, onCompleted, style, situation = null }) {
  const { color, font } = useTheme();
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(null);
  const fade = useRef(new Animated.Value(0)).current;
  const counts = quickToday(player);
  const [editing, setEditing] = useState(false);
  const pins = player.quickPins?.length ? player.quickPins : QUICK_DEFAULT;
  function togglePin(id) {
    const next = pins.includes(id) ? pins.filter((x) => x !== id) : [...pins, id].slice(-QUICK_MAX);
    setQuickPins(user.uid, next).catch(() => say(t.quick.failed));
  }

  function say(text) {
    setNote(text);
    fade.setValue(1);
    Animated.timing(fade, { toValue: 0, duration: 2600, delay: 900, useNativeDriver: nativeDriver }).start();
  }

  async function tap(item) {
    if (busy) return;
    setBusy(item.id);
    try {
      const r = await quickLog(user.uid, item.id);
      if (!r.completed) tapFeel(); // a finished quest gets the clear window and its sound
      const target = r.target;
      say(target ? `${fill(t.quick.added, { label: item.label })} · ${fill(t.quick.progress, { a: Math.min(r.count, target.goal), b: target.goal })}` : fill(t.quick.added, { label: item.label }));
      if (r.completed) onCompleted?.(r.completed, r.completedQuest);
    } catch {
      say(t.quick.failed);
    } finally {
      setBusy(null);
    }
  }

  async function undo(item) {
    if (!counts[item.id]) return;
    try {
      await quickUndo(user.uid, item.id);
      say(fill(t.quick.undone, { label: item.label.toLowerCase() }));
    } catch {
      say(t.quick.failed);
    }
  }

  return (
    <Frame cut={12} style={style} contentStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Label tone={color.hi}>{t.quick.title}</Label>
        <Pressable accessibilityRole="button" onPress={() => setEditing(true)} hitSlop={10}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.accent }}>{t.quick.edit}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {quickBar(day, pins).filter((item) => fitsSituation({ skill: item.skill }, situation)).map((item) => {
          const n = counts[item.id] ?? 0;
          const target = quickTarget(item, day, DIFF_SETS[difficultyOf(player)]);
          const full = target && n >= target.goal;
          return (
            <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.label}, ${target ? fill(t.quick.progress, { a: n, b: target.goal }) : n}`}
              accessibilityHint={t.quick.hint} onPress={() => tap(item)} onLongPress={() => undo(item)} delayLongPress={450}
              style={({ pressed }) => ({ flexGrow: 1, minWidth: 96, minHeight: 56, paddingHorizontal: 10, paddingVertical: 7, justifyContent: "center",
                borderWidth: 1, borderColor: target ? "rgba(207,228,255,0.45)" : "rgba(159,203,255,0.22)",
                backgroundColor: pressed || busy === item.id ? "rgba(159,203,255,0.22)" : target ? "rgba(159,203,255,0.08)" : "rgba(5,10,24,0.7)" })}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: "#FFFFFF" }}>+ {item.label}</Text>
              <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>
                {item.unit} · <Text style={{ fontFamily: font.num, fontSize: 13, color: full ? color.frame : color.accent }}>{target ? fill(t.quick.progress, { a: n, b: target.goal }) : n}</Text>
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{t.quick.hint}</Text>
      {editing ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setEditing(false)}>
          <Pressable onPress={() => setEditing(false)} style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.72)", justifyContent: "center", padding: 16 }}>
            <Pressable onPress={() => {}} style={{ maxWidth: 460, width: "100%", alignSelf: "center", borderWidth: 1, borderColor: color.frame, backgroundColor: "rgba(4,10,24,0.98)", padding: 16, gap: 10 }}>
              <Label tone={color.hi}>{t.quick.editTitle}</Label>
              <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.quick.editSub}</Text>
              <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 6 }}>
                {QUICK.map((item) => {
                  const on = pins.includes(item.id);
                  return (
                    <Pressable key={item.id} accessibilityRole="switch" accessibilityState={{ checked: on }} onPress={() => togglePin(item.id)}
                      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", minHeight: 48, paddingHorizontal: 12, gap: 10, borderWidth: 1,
                        borderColor: on ? color.frame : "rgba(159,203,255,0.2)", backgroundColor: pressed ? "rgba(159,203,255,0.16)" : on ? "rgba(159,203,255,0.08)" : "transparent" })}>
                      <Text style={{ width: 18, fontFamily: font.bold, fontSize: 15, color: on ? color.accent : color.muted }}>{on ? "✓" : "+"}</Text>
                      <Text style={{ flex: 1, fontFamily: font.bodyBold, fontSize: 14, color: "#FFFFFF" }}>{item.label}</Text>
                      <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{item.unit}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={{ minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.frame }}>
                <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 2, color: "#FFFFFF" }}>{t.quick.editDone}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
      <Animated.Text accessibilityLiveRegion="polite" style={{ minHeight: 16, fontFamily: font.bodyMedium, fontSize: 12, color: color.accent, opacity: fade }}>{note ?? " "}</Animated.Text>
    </Frame>
  );
}
