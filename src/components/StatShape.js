// The attribute hexagon on Status: six stats, upright, with a slowly turning outer ring.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Polygon, Stop } from "react-native-svg";
import { STATS } from "../game/quests";
import { useTheme } from "../theme";
import { t } from "../i18n";
import { nativeDriver } from "./sys";

const W = 330;
const H = 290;
const R = 92;
const cx = W / 2;
const cy = H / 2;
const ang = (i) => -Math.PI / 2 + (i * Math.PI) / 3;
const P = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const pts = (arr) => arr.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
const ring = (fr) => pts(STATS.map((_, i) => P(R * fr, ang(i))));

// onStat: tap a stat label to explain it.
export default function StatShape({ values, onStat }) {
  const { color, font } = useTheme();
  const grow = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const [k, setK] = useState(0);

  useEffect(() => {
    const id = grow.addListener(({ value }) => setK(value));
    Animated.timing(grow, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: nativeDriver }));
    loop.start();
    return () => { grow.removeListener(id); loop.stop(); };
  }, [grow, spin]);

  const max = Math.max(20, ...STATS.map((s) => values[s] ?? 0)) * 1.15;
  const data = STATS.map((s, i) => P(R * Math.max(0.06, (values[s] ?? 0) / max) * k, ang(i)));
  const axes = STATS.map((_, i) => { const o = P(R, ang(i)); return `M${cx} ${cy}L${o[0].toFixed(1)} ${o[1].toFixed(1)}`; }).join("");
  const dots = data.map((q) => `M${q[0].toFixed(1)} ${(q[1] - 4).toFixed(1)}l4 4l-4 4l-4 -4z`).join("");
  const orbitR = R * 1.4;
  const orbit = pts(STATS.map((_, i) => P(orbitR, ang(i))));
  const nodes = STATS.map((_, i) => P(orbitR, ang(i))).map((q) => `M${q[0].toFixed(1)} ${(q[1] - 2.5).toFixed(1)}l2.5 2.5l-2.5 2.5l-2.5 -2.5z`).join("");
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View accessibilityRole="image" accessibilityLabel={STATS.map((s) => `${s} ${values[s] ?? 0}`).join(", ")}
      style={{ width: W, height: H, alignSelf: "center" }}>
      <Animated.View style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: [{ rotate }] }}>
        <Svg width={W} height={H}>
          <Polygon points={orbit} fill="none" stroke={color.accent} strokeOpacity={0.45} strokeWidth={1} strokeDasharray="2 9" />
          <Path d={nodes} fill={color.hi} />
        </Svg>
      </Animated.View>
      <Svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id="statFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color.blue} stopOpacity="0.5" />
            <Stop offset="1" stopColor={color.purple} stopOpacity="0.35" />
          </LinearGradient>
        </Defs>
        <Polygon points={ring(1)} fill="rgba(8,16,32,0.7)" stroke={color.accent} strokeOpacity={0.5} strokeWidth={1} />
        <Polygon points={ring(0.66)} fill="none" stroke={color.accent} strokeOpacity={0.2} strokeWidth={1} />
        <Polygon points={ring(0.33)} fill="none" stroke={color.accent} strokeOpacity={0.2} strokeWidth={1} />
        <Path d={axes} stroke={color.accent} strokeOpacity={0.2} strokeWidth={1} />
        <Polygon points={pts(data)} fill="url(#statFill)" stroke={color.accent} strokeWidth={2} strokeLinejoin="round" />
        <Path d={dots} fill="#FFFFFF" />
      </Svg>
      {STATS.map((s, i) => {
        const q = P(R + 30, ang(i));
        return (
          <Pressable key={s} disabled={!onStat} onPress={() => onStat?.(s)} accessibilityRole={onStat ? "button" : undefined}
            accessibilityLabel={`${t.stats[s]} ${values[s] ?? 0}`} hitSlop={6}
            style={({ pressed }) => ({ position: "absolute", left: q[0] - 32, top: q[1] - 22, width: 64, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: color.muted }}>{s}</Text>
            <Text style={{ fontFamily: font.num, fontSize: 20, color: color.hi }}>{Math.round((values[s] ?? 0) * k)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
