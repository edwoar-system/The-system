// Quick log bar: one tap per small thing you just did. Counts add up toward today's main quests.
import { useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { quickBar, quickTarget, quickToday } from "../game/quick";
import { quickLog, quickUndo } from "../lib/quick";
import { Frame, Label, nativeDriver } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";
import { doneFeel, tapFeel } from "../lib/haptics";
import { DIFF_SETS, difficultyOf } from "../game/difficulty";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

export default function QuickLog({ user, player, day, onCompleted, style }) {
  const { color, font } = useTheme();
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(null);
  const fade = useRef(new Animated.Value(0)).current;
  const counts = quickToday(player);

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
      if (r.completed) doneFeel(); else tapFeel();
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
        <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{t.quick.hint}</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {quickBar(day).map((item) => {
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
      <Animated.Text accessibilityLiveRegion="polite" style={{ minHeight: 16, fontFamily: font.bodyMedium, fontSize: 12, color: color.accent, opacity: fade }}>{note ?? " "}</Animated.Text>
    </Frame>
  );
}
