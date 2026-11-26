// The bar at the top of the quest screen, like a game HUD: level and EXP, coins and the streak.
// Buffs, debuffs, water and sleep live with your body on the Status tab.
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { levelFromXp } from "../game/economy";
import { liveStreak, missedYesterday, streakOnTheLine } from "../game/streak";
import { isHard } from "../game/hard";
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
  const [open, setOpen] = useState(null); // "streak" | null
  const { level, xpIntoLevel, xpForLevel } = levelFromXp(player.xp ?? 0);
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
      </View>

      {open ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setOpen(null)}>
          <Pressable onPress={() => setOpen(null)} style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.7)", justifyContent: "center", padding: 16, paddingTop: insets.top + 16 }}>
            <Pressable onPress={() => {}} style={{ maxWidth: 480, width: "100%", alignSelf: "center" }}>
              <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ gap: 10 }}>
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
                <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted, textAlign: "center" }}>{t.hud.close}</Text>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
