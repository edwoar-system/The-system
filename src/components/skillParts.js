// Shared pieces for the Skills screens: the I–IV step bar, the rank hexagon and the status line.
import { View } from "react-native";
import { HexBadge } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

export const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
export const AMBER = "#F6B45A";

// Four cut segments that fill up: the I–IV steps inside a rank.
export function StepBar({ value, height = 6, dim = false }) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {[0, 1, 2, 3].map((i) => {
        const f = Math.max(0, Math.min(1, value * 4 - i));
        return (
          <View key={i} style={{ flex: 1, height, backgroundColor: "rgba(96,160,255,0.14)", overflow: "hidden", transform: [{ skewX: "-30deg" }] }}>
            <View style={{ width: `${f * 100}%`, height, backgroundColor: dim ? "#5B6F94" : color.blue }} />
          </View>
        );
      })}
    </View>
  );
}

// One line of state under a skill name: fresh, rust soon, rusting, rusty.
export function skillStatus(v) {
  if (!v.trained) return { text: t.skills.untrained, tone: "muted" };
  if (v.rusty) return { text: t.skills.rusty, tone: "amber" };
  if (v.draining) return { text: t.skills.rusting, tone: "amber" };
  if (v.since === 0) return { text: t.skills.fresh, tone: "hi" };
  if (v.since === 1) return { text: t.skills.freshYesterday, tone: "hi" };
  if (v.rustIn <= 3) return { text: fill(t.skills.rustSoon, { n: v.rustIn }), tone: "amber" };
  return { text: fill(t.skills.freshDays, { n: v.since }), tone: "muted" };
}

export function RankHex({ v, size = 34 }) {
  const { color } = useTheme();
  const on = v.trained && !v.rusty;
  return (
    <HexBadge w={size} h={Math.round(size * 1.12)} label={v.letter} labelSize={Math.round(size * 0.42)}
      tone={on ? color.purple : "#5B6F94"} fill={on ? "rgba(168,126,255,0.14)" : "rgba(159,203,255,0.05)"} ink={on ? "#FFFFFF" : color.muted} lit={on} />
  );
}
