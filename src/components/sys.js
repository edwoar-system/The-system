// Building blocks for the System look (design v0.1): cut-corner frames, hexagons, the coin mark.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../theme";

export const nativeDriver = Platform.OS !== "web";
let gid = 0;
const useId = (p) => useRef(`${p}${++gid}`).current;

const chamfer = (w, h, c, i = 0) =>
  `${c + i},${i} ${w - i},${i} ${w - i},${h - c - i} ${w - c - i},${h - i} ${i},${h - i} ${i},${c + i}`;

export const hexPoints = (w, h, i = 0) => {
  const q = h / 4;
  return `${w / 2},${i} ${w - i},${q + i / 2} ${w - i},${h - q - i / 2} ${w / 2},${h - i} ${i},${h - q - i / 2} ${i},${q + i / 2}`;
};

// A cut-corner window. "premium" = the edge catches light (white into blue); "plain" = a thin light-blue edge.
export function Frame({ children, cut = 14, kind = "plain", style, contentStyle, corners = false, tone }) {
  const { color } = useTheme();
  const [size, setSize] = useState(null);
  const fillId = useId("ff");
  const edgeId = useId("fe");
  const edge = tone ?? color.accent;
  return (
    <View style={style} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {size ? (
        <Svg pointerEvents="none" width={size.width} height={size.height} style={{ position: "absolute", left: 0, top: 0 }}>
          <Defs>
            <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color.panelTop} />
              <Stop offset="1" stopColor={color.panelBottom} />
            </LinearGradient>
            <LinearGradient id={edgeId} x1="0" y1="0" x2="1" y2="1">
              {kind === "premium" ? (
                <>
                  <Stop offset="0" stopColor="#EAF4FF" />
                  <Stop offset="0.38" stopColor={edge} stopOpacity="0.3" />
                  <Stop offset="0.62" stopColor={edge} stopOpacity="0.1" />
                  <Stop offset="1" stopColor={color.blue} />
                </>
              ) : (
                <>
                  <Stop offset="0" stopColor={edge} stopOpacity="0.45" />
                  <Stop offset="1" stopColor={edge} stopOpacity="0.25" />
                </>
              )}
            </LinearGradient>
          </Defs>
          <Polygon points={chamfer(size.width, size.height, cut, 0.5)} fill={`url(#${fillId})`} stroke={`url(#${edgeId})`} strokeWidth={1} />
          <Path d={`M${cut + 1} 1.5 H${size.width - 2}`} stroke="#FFFFFF" strokeOpacity={0.16} strokeWidth={1} />
          {corners ? (
            <>
              <Path d={`M${size.width - 12} 1 H${size.width - 1} V12`} stroke={color.frame} strokeWidth={2} fill="none" />
              <Path d={`M1 ${size.height - 12} V${size.height - 1} H12`} stroke={color.frame} strokeWidth={2} fill="none" />
            </>
          ) : null}
        </Svg>
      ) : null}
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

// The coin mark: an open hexagon like a C, with a diamond inside.
export function CoinMark({ size = 16 }) {
  const { color } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M19.2 7.4 12 3.2 4.8 7.4 V16.6 L12 20.8 19.2 16.6" fill="none" stroke={color.reward} strokeWidth={3.2} />
      <Path d="M12 9.4 14.6 12 12 14.6 9.4 12z" fill={color.reward} />
    </Svg>
  );
}

// Coins: number + mark, in the number font.
export function Coins({ value, size = 18, sign = "" }) {
  const { color, font } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Text style={{ fontFamily: font.num, fontSize: size, color: color.reward, fontVariant: ["tabular-nums"] }}>{sign}{value}</Text>
      <CoinMark size={Math.round(size * 0.85)} />
    </View>
  );
}

// A hexagon badge with a label inside (stat, rank, level).
export function HexBadge({ w = 36, h = 40, label, sub, labelSize = 11, tone, lit = false, fill, ink }) {
  const { color, font } = useTheme();
  const t = tone ?? color.frame;
  return (
    <View style={{ width: w, height: h, alignItems: "center", justifyContent: "center" }}>
      <Svg width={w} height={h} style={{ position: "absolute" }}>
        <Polygon points={hexPoints(w, h, 1)} fill={fill ?? "rgba(159,203,255,0.08)"} stroke={t} strokeOpacity={0.8} strokeWidth={1.2} />
        {lit ? <Path d={`M1.5 ${h / 4} L${w / 2} 1.5 L${w - 1.5} ${h / 4}`} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.2} fill="none" /> : null}
      </Svg>
      <Text style={{ fontFamily: font.bold, fontSize: labelSize, letterSpacing: 1, color: ink ?? color.hi }}>{label}</Text>
      {sub ? <Text style={{ fontFamily: font.num, fontSize: labelSize + 2, color: color.hi }}>{sub}</Text> : null}
    </View>
  );
}

// The quest checkbox: a hexagon that softly pulses until it's done.
export function HexCheck({ done, onPress, disabled, label, size = 40 }) {
  const { color } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (done) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [done, pulse]);
  const w = size, h = Math.round(size * 1.1);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ checked: !!done, disabled: !!disabled }}
      onPress={onPress} disabled={disabled || done} hitSlop={8}
      style={({ pressed }) => ({ width: w + 8, height: h + 8, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.92 : 1 }] })}>
      <Animated.View style={{ position: "absolute", opacity: done ? 1 : pulse }}>
        <Svg width={w} height={h}><Polygon points={hexPoints(w, h, 1)} fill={done ? color.frame : "rgba(159,203,255,0.16)"} /></Svg>
      </Animated.View>
      <View style={{ width: w, height: h }}><Svg width={w} height={h}>
        <Polygon points={hexPoints(w, h, 1)} fill="none" stroke={color.frame} strokeWidth={1.5} />
        <Path d={`M${w * 0.31} ${h * 0.51} L${w * 0.45} ${h * 0.64} L${w * 0.7} ${h * 0.39}`} fill="none"
          stroke={done ? color.panelBottom : "rgba(234,244,255,0.55)"} strokeWidth={2.4} strokeLinecap="square" />
      </Svg></View>
    </Pressable>
  );
}

// Black screen with one blue glow at the top and a small white light in its centre.
export function Glow({ height = 520, at = 0.24 }) {
  const { color } = useTheme();
  const [w, setW] = useState(0);
  const a = useId("ga");
  const b = useId("gb");
  return (
    <View pointerEvents="none" onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ position: "absolute", left: 0, right: 0, top: 0, height }}>
      {w ? (
        <Svg width={w} height={height}>
          <Defs>
            <RadialGradient id={a} cx="50%" cy={`${at * 100}%`} rx="75%" ry="45%">
              <Stop offset="0" stopColor={color.glow} stopOpacity="1" />
              <Stop offset="1" stopColor={color.glow} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id={b} cx="50%" cy={`${at * 100 + 6}%`} rx="18%" ry="12%">
              <Stop offset="0" stopColor="#EAF4FF" stopOpacity="0.16" />
              <Stop offset="1" stopColor="#EAF4FF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={w} height={height} fill={`url(#${a})`} />
          <Rect x="0" y="0" width={w} height={height} fill={`url(#${b})`} />
        </Svg>
      ) : null}
    </View>
  );
}

// Small letter-spaced label ("SYSTEM", "GOALS").
export function Label({ children, style, tone }) {
  const { color, font } = useTheme();
  return <Text style={[{ fontFamily: font.bold, fontSize: 11, letterSpacing: 3, color: tone ?? color.muted }, style]}>{children}</Text>;
}

// The main action button: dark fill, light edge, lit top (same as Sealed's hold button).
export function SysButton({ label, onPress, disabled, tone, style }) {
  const { color, font } = useTheme();
  const [size, setSize] = useState(null);
  const edge = tone ?? color.frame;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} onLayout={(e) => setSize(e.nativeEvent.layout)}
      style={({ pressed }) => [{ minHeight: 50, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
      {size ? (
        <Svg pointerEvents="none" width={size.width} height={size.height} style={{ position: "absolute", left: 0, top: 0 }}>
          <Defs>
            <LinearGradient id="sbtn" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#16294A" />
              <Stop offset="1" stopColor="#070D1C" />
            </LinearGradient>
          </Defs>
          <Polygon points={chamfer(size.width, size.height, 10, 0.5)} fill="url(#sbtn)" stroke={edge} strokeOpacity={0.7} strokeWidth={1} />
          <Path d={`M11 1.5 H${size.width - 2}`} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1} />
        </Svg>
      ) : null}
      <Text style={{ fontFamily: font.bold, fontSize: 14, letterSpacing: 3, color: "#FFFFFF" }}>{label}</Text>
    </Pressable>
  );
}
