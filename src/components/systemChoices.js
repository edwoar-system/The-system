// The two System settings as chip rows: urgent quests per day, and the Penalty Zone severity.
import { Pressable, Text, View } from "react-native";
import { SEVERITIES } from "../game/penalty";
import { DIFFICULTIES } from "../game/difficulty";
import { useTheme } from "../theme";
import { t } from "../i18n";

export function UrgentChips({ value, onChange, disabled }) {
  const { color, font } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {[0, 1, 2, 3, 4].map((n) => {
        const on = value === n;
        return (
          <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${t.urgent.perDay}: ${n}`} accessibilityState={{ selected: on }} disabled={disabled} onPress={() => onChange(n)}
            style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
            <Text style={{ fontFamily: font.num, fontSize: 18, color: on ? "#FFFFFF" : color.muted }}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SeverityChips({ value, onChange, disabled }) {
  const { color, font } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {SEVERITIES.map((s) => {
          const on = value === s;
          return (
            <Pressable key={s} accessibilityRole="button" accessibilityState={{ selected: on }} disabled={disabled} onPress={() => onChange(s)}
              style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 1, borderColor: on ? color.dangerSoft : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(255,46,69,0.12)" : "transparent" }}>
              <Text style={{ fontFamily: font.bold, fontSize: 14, color: on ? "#FFFFFF" : color.muted }}>{t.penalty.severities[s]}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.penalty.severityHint[value]}</Text>
    </View>
  );
}

// Difficulty: Easy, Normal, Hard, Extreme (on top of your level in each skill).
export function DifficultyChips({ value, onChange, disabled }) {
  const { color, font } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {DIFFICULTIES.map((d) => {
          const on = value === d;
          return (
            <Pressable key={d} accessibilityRole="button" accessibilityState={{ selected: on }} disabled={disabled} onPress={() => onChange(d)}
              style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 2, borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
              <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? "#FFFFFF" : color.muted }}>{t.difficulty.names[d]}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.difficulty.hint[value]}</Text>
    </View>
  );
}
