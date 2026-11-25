// The bar at the top of the quest screen, like a game HUD: level and EXP, coins, the streak and today's
// buffs and debuffs. Everything you earned is visible where you play. Tap the effects to see why and fix them.
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EFFECT_CAP, statusEffects } from "../game/effects";
import { levelFromXp } from "../game/economy";
import { liveStreak, missedYesterday, streakOnTheLine } from "../game/streak";
import { isHard } from "../game/hard";
import StatusEffects from "./StatusEffects";
import { HabitsScreen } from "./Habits";
import { Coins } from "./sys";
import { HelpDot } from "./Explain";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

function Chip({ text, tone, filled, onPress, label }) {
  const { font } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label ?? text} onPress={onPress} hitSlop={4}
      style={({ pressed }) => ({ minHeight: 30, paddingHorizontal: 9, justifyContent: "center", borderWidth: 1, borderColor: tone,
        backgroundColor: pressed ? "rgba(159,203,255,0.18)" : filled ? "rgba(159,203,255,0.08)" : "transparent" })}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 0.5, color: tone }}>{text}</Text>
    </Pressable>
  );
}

export default function Hud({ user, player }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(null); // "effects" | "streak" | null
  const [sleep, setSleep] = useState(false);
  const sleepTimer = useRef(null);
  useEffect(() => () => clearTimeout(sleepTimer.current), []);
  const { level, xpIntoLevel, xpForLevel } = levelFromXp(player.xp ?? 0);
  const { effects } = statusEffects(player);
  const sum = Math.max(-EFFECT_CAP, Math.min(EFFECT_CAP, effects.reduce((a, e) => a + e.pct, 0)));
  const streak = liveStreak(player);
  const onLine = streakOnTheLine(player);
  const missed = missedYesterday(player);
  const shields = player.streakShields ?? 0;

  const streakText = missed ? fill(t.hud.dontMissTwice, { n: streak }) : onLine ? fill(t.hud.streakToday, { n: streak }) : fill(t.hud.streak, { n: streak });
  const streakTone = missed || onLine ? "#F6B45A" : streak ? color.purple : color.muted;

  return (
    <View style={{ marginHorizontal: 14, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View accessibilityLabel={fill(t.hud.levelA11y, { level, a: xpIntoLevel, b: xpForLevel })} style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 2, color: color.hi }}>{fill(t.hud.level, { n: level })}</Text>
            <Text style={{ fontFamily: font.num, fontSize: 12, color: color.muted }}>{`${xpIntoLevel} / ${xpForLevel} ${t.status.exp}`}</Text>
          </View>
          <View style={{ height: 6, backgroundColor: "rgba(168,126,255,0.14)", borderWidth: 1, borderColor: "rgba(168,126,255,0.3)" }}>
            <View style={{ width: `${Math.min(100, (xpIntoLevel / xpForLevel) * 100)}%`, height: "100%", backgroundColor: color.purple }} />
          </View>
        </View>
        <Coins value={player.coins ?? 0} size={18} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <Chip text={streakText} tone={streakTone} filled={!!streak} onPress={() => setOpen("streak")} />
        {effects.filter((e) => e.kind !== "info").map((e) => (
          <Chip key={e.id} tone={e.kind === "buff" ? color.accent : "#F6B45A"} filled={e.kind === "buff"} onPress={() => setOpen("effects")}
            text={`${e.kind === "buff" ? "▲" : "▼"} ${t.effects.names[e.id]}${e.pct ? ` ${e.pct > 0 ? "+" : "−"}${Math.abs(e.pct)}%` : ""}`} />
        ))}
        {!effects.some((e) => e.kind !== "info") ? <Chip text={t.hud.noEffects} tone={color.muted} onPress={() => setOpen("effects")} /> : null}
        {sum ? <Text style={{ alignSelf: "center", fontFamily: font.bodyBold, fontSize: 11, color: sum > 0 ? color.accent : "#F6B45A" }}>{fill(t.hud.total, { sign: sum > 0 ? "+" : "−", n: Math.abs(sum) })}</Text> : null}
      </View>

      {open ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setOpen(null)}>
          <Pressable onPress={() => setOpen(null)} style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.7)", justifyContent: "center", padding: 16, paddingTop: insets.top + 16 }}>
            <Pressable onPress={() => {}} style={{ maxWidth: 480, width: "100%", alignSelf: "center" }}>
              <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ gap: 10 }}>
                {open === "effects" ? (
                  <StatusEffects user={user} player={player} onOpenHabits={() => { setOpen(null); sleepTimer.current = setTimeout(() => setSleep(true), 450); }} />
                ) : (
                  <View style={{ borderWidth: 1, borderColor: color.frame, backgroundColor: "rgba(4,10,24,0.97)", padding: 16, gap: 10 }}>
                    <Text style={{ fontFamily: font.bold, fontSize: 12, letterSpacing: 3, color: color.hi }}>{t.hud.streakTitle}</Text>
                    <Text style={{ fontFamily: font.num, fontSize: 34, color: streak ? color.purple : color.muted }}>{fill(t.hud.days, { n: streak })}</Text>
                    <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text }}>{isHard(player) ? t.hud.ruleHard : t.hud.ruleNormal}</Text>
                    {missed ? <Text style={{ fontFamily: font.bodyBold, fontSize: 14, lineHeight: 20, color: "#F6B45A" }}>{t.hud.missedLine}</Text> : null}
                    {!missed && onLine ? <Text style={{ fontFamily: font.bodyBold, fontSize: 14, lineHeight: 20, color: "#F6B45A" }}>{t.hud.onLineLine}</Text> : null}
                    <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{fill(t.hud.shields, { n: shields })}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <HelpDot term="streak" size={18} />
                      <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.hud.more}</Text>
                    </View>
                  </View>
                )}
                <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted, textAlign: "center" }}>{t.hud.close}</Text>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
      {sleep ? <HabitsScreen user={user} player={player} start="sleep" onClose={() => setSleep(false)} /> : null}
    </View>
  );
}
