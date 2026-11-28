// Small icons under the body: a glass (tap = one glass of water, hold = undo) and a moon (last night's sleep).
// The water you log fills the body map. Buffs and debuffs sit in one quiet line; the full list is on the body screen.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { ClipPath, Defs, Path, Rect } from "react-native-svg";
import { statusEffects } from "../game/effects";
import { quickLog, quickUndo } from "../lib/quick";
import { tapFeel } from "../lib/haptics";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

function Glass({ level, c, w }) {
  const y = 4 + 16 * (1 - Math.max(0, Math.min(1, level)));
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Defs><ClipPath id="glassIn"><Path d="M6 4h12l-1.6 16H7.6z" /></ClipPath></Defs>
      <Rect x={0} y={y} width={24} height={24} fill={w} opacity={0.85} clipPath="url(#glassIn)" />
      <Path d="M6 4h12l-1.6 16H7.6z" fill="none" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}
function Moon({ c }) {
  return <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke={c} strokeWidth={1.6} strokeLinejoin="round" /></Svg>;
}

export function waterLevel(player) {
  const { bars } = statusEffects(player);
  return bars.hydration.max ? bars.hydration.value / bars.hydration.max : 0;
}

export default function BodyIcons({ user, player, onSleep, onMore }) {
  const { color, font } = useTheme();
  const [busy, setBusy] = useState(false);
  const { effects, bars } = statusEffects(player);
  const h = bars.hydration;
  async function glass(undo = false) {
    if (busy) return;
    setBusy(true);
    try { await (undo ? quickUndo(user.uid, "water") : quickLog(user.uid, "water")); tapFeel(); } catch { /* try again */ } finally { setBusy(false); }
  }
  const pill = { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(159,203,255,0.24)" };
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={fill(t.bodyIcons.water, { n: h.value, of: h.max })} accessibilityHint={t.bodyIcons.waterHint}
          onPress={() => glass(false)} onLongPress={() => h.value > 0 && glass(true)} disabled={busy}
          style={({ pressed }) => ({ ...pill, backgroundColor: pressed ? "rgba(96,170,255,0.18)" : "transparent" })}>
          <Glass level={h.max ? h.value / h.max : 0} c={color.text} w="#60AAFF" />
          <Text style={{ fontFamily: font.num, fontSize: 14, color: h.value >= h.max ? color.accent : color.text }}>{`${h.value}/${h.max}`}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={bars.sleep ? fill(t.bodyIcons.sleep, { h: bars.sleep.value }) : t.bodyIcons.sleepNone} onPress={onSleep}
          style={({ pressed }) => ({ ...pill, backgroundColor: pressed ? "rgba(159,203,255,0.14)" : "transparent" })}>
          <Moon c={color.text} />
          <Text style={{ fontFamily: font.num, fontSize: 14, color: bars.sleep ? color.text : color.muted }}>{bars.sleep ? `${bars.sleep.value}h` : t.bodyIcons.log}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onMore} style={{ flex: 1, minHeight: 40, justifyContent: "center" }}>
          <Text numberOfLines={2} style={{ fontFamily: font.bodyBold, fontSize: 11, lineHeight: 15, color: color.muted, textAlign: "right" }}>
            {effects.filter((e) => e.pct).map((e) => `${e.pct > 0 ? "▲" : "▼"} ${t.effects.names[e.id]} ${e.pct > 0 ? "+" : "−"}${Math.abs(e.pct)}%`).join("  ")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
