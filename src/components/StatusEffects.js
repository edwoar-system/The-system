// Status: your buffs and debuffs today, with the hydration and sleep bars. Tap an effect to see why.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { EFFECT_CAP, statusEffects } from "../game/effects";
import { quickLog } from "../lib/quick";
import { tapFeel } from "../lib/haptics";
import { Frame, Label } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

function Bar({ label, value, max, text, tone, action }) {
  const { color, font } = useTheme();
  const pct = max ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ flex: 1, fontFamily: font.bodyBold, fontSize: 13, color: color.text }}>{label}</Text>
        <Text style={{ fontFamily: font.num, fontSize: 13, color: color.muted }}>{text}</Text>
        {action}
      </View>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: Math.min(value, max) }}
        style={{ height: 10, backgroundColor: "rgba(159,203,255,0.1)", borderWidth: 1, borderColor: "rgba(159,203,255,0.22)" }}>
        <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: tone }} />
      </View>
    </View>
  );
}

export default function StatusEffects({ user, player, onOpenHabits }) {
  const { color, font } = useTheme();
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const { effects, bars } = statusEffects(player);
  const sum = Math.max(-EFFECT_CAP, Math.min(EFFECT_CAP, effects.reduce((a, e) => a + e.pct, 0)));

  async function glass() {
    if (busy) return;
    setBusy(true);
    try { await quickLog(user.uid, "water"); tapFeel(); } catch { /* try again */ } finally { setBusy(false); }
  }

  return (
    <Frame cut={14} contentStyle={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Label tone={color.hi}>{t.effects.title}</Label>
        {sum ? <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: sum > 0 ? color.accent : "#F6B45A" }}>{fill(t.effects.total, { sign: sum > 0 ? "+" : "−", n: Math.abs(sum) })}</Text> : null}
      </View>

      <Bar label={t.effects.hydration} value={bars.hydration.value} max={bars.hydration.max} text={`${bars.hydration.value} / ${bars.hydration.max}`}
        tone={color.purple}
        action={(
          <Pressable accessibilityRole="button" accessibilityLabel={t.effects.addGlass} disabled={busy} onPress={glass}
            style={({ pressed }) => ({ minHeight: 32, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: pressed ? "rgba(159,203,255,0.18)" : "transparent" })}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: color.text }}>{t.effects.addGlass}</Text>
          </Pressable>
        )} />

      {bars.sleep ? (
        <Bar label={t.effects.sleep} value={bars.sleep.value} max={bars.sleep.max} text={`${bars.sleep.value} h`}
          tone={bars.sleep.value >= 7.5 ? color.accent : bars.sleep.value < 6 ? "#F6B45A" : "#4F8DFF"} />
      ) : (
        <Pressable accessibilityRole="button" onPress={onOpenHabits} style={{ flexDirection: "row", justifyContent: "space-between", minHeight: 32, alignItems: "center" }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.text }}>{t.effects.sleep}</Text>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.accent }}>{`${t.effects.sleepNone} · ${t.effects.logSleep} ›`}</Text>
        </Pressable>
      )}

      {effects.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {effects.map((e) => {
            const tone = e.kind === "buff" ? color.accent : e.kind === "debuff" ? "#F6B45A" : color.muted;
            return (
              <Pressable key={e.id} accessibilityRole="button" accessibilityState={{ expanded: open === e.id }} onPress={() => setOpen(open === e.id ? null : e.id)}
                style={{ minHeight: 34, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1, borderColor: tone, backgroundColor: e.kind === "buff" ? "rgba(159,203,255,0.08)" : "transparent" }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: tone }}>
                  {`${e.kind === "buff" ? "▲" : e.kind === "debuff" ? "▼" : "•"} ${t.effects.names[e.id]}${e.pct ? ` ${e.pct > 0 ? "+" : "−"}${Math.abs(e.pct)}%` : ""}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.effects.none}</Text>
      )}
      {open ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text }}>{fill(t.effects.why[open], effects.find((e) => e.id === open)?.vars)}</Text> : null}
    </Frame>
  );
}
