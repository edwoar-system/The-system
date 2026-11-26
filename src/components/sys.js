// Building blocks for the System look (design v0.1): cut-corner frames, hexagons, the coin mark.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, Text, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../theme";

export const nativeDriver = Platform.OS !== "web";
let gid = 0;
const useId = (p) => useRef(`${p}${++gid}`).current;

const chamfer = (w, h, c, i = 0) =>
  `${c + i},${i} ${w - i},${i} ${w - i},${h - c - i} ${w - c - i},${h - i} ${i},${h - i} ${i},${c + i}`;

// A frame's outline in the theme's shape (see SKINS in game/shop.js). Returns the points and where the lit top edge starts.
function outline(shape, w, h, c, i = 0) {
  if (shape === "notch") {
    const k = Math.max(6, Math.round(c * 0.55));
    return { pts: `${k + i},${i} ${w - k - i},${i} ${w - i},${k + i} ${w - i},${h - k - i} ${w - k - i},${h - i} ${k + i},${h - i} ${i},${h - k - i} ${i},${k + i}`, from: k + 1 };
  }
  if (shape === "bracket") return { pts: `${i},${i} ${w - i},${i} ${w - i},${h - i} ${i},${h - i}`, from: 2 };
  const cc = shape === "double" ? Math.round(c * 1.3) : c;
  return { pts: chamfer(w, h, cc, i), from: cc + 1 };
}

export const hexPoints = (w, h, i = 0) => {
  const q = h / 4;
  return `${w / 2},${i} ${w - i},${q + i / 2} ${w - i},${h - q - i / 2} ${w / 2},${h - i} ${i},${h - q - i / 2} ${i},${q + i / 2}`;
};

// A cut-corner window. "premium" = the edge catches light (white into blue); "plain" = a thin light-blue edge.
export function Frame({ children, cut = 14, kind = "plain", style, contentStyle, corners = false, tone }) {
  const { color, shape = "chamfer" } = useTheme();
  const [size, setSize] = useState(null);
  const fillId = useId("ff");
  const edgeId = useId("fe");
  const edge = tone ?? color.accent;
  const line = size ? outline(shape, size.width, size.height, cut, 0.5) : null;
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
          <Polygon points={line.pts} fill={`url(#${fillId})`} stroke={`url(#${edgeId})`} strokeWidth={1} />
          {shape === "double" && size.width > 24 && size.height > 24 ? (
            <Polygon points={outline("double", size.width, size.height, cut, 4).pts} fill="none" stroke={edge} strokeOpacity={0.22} strokeWidth={1} />
          ) : null}
          <Path d={`M${line.from} 1.5 H${size.width - 2}`} stroke="#FFFFFF" strokeOpacity={0.16} strokeWidth={1} />
          {shape === "bracket" ? (
            <Path d={`M1 11 V1 H11 M${size.width - 11} 1 H${size.width - 1} V11 M${size.width - 1} ${size.height - 11} V${size.height - 1} H${size.width - 11} M11 ${size.height - 1} H1 V${size.height - 11}`}
              stroke={color.frame} strokeWidth={1.6} fill="none" />
          ) : corners ? (
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
  const { color, backdrop = "glow" } = useTheme();
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
          <Backdrop kind={backdrop} w={w} h={height} at={at} tone={color.spark ?? color.frame} />
        </Svg>
      ) : null}
    </View>
  );
}

// The theme's backdrop over the glow: a few quiet marks that fade out downwards. Same places every time.
function Backdrop({ kind, w, h, at, tone }) {
  if (!kind || kind === "glow") return null;
  // A fixed pseudo-random number for mark k, value j.
  const rnd = (k, j) => { const x = Math.sin(k * 12.9898 + j * 78.233 + kind.length) * 43758.5453; return x - Math.floor(x); };
  const fade = (y) => Math.max(0, 1 - y / h);
  const cx = w / 2;
  const cy = h * at;
  if (kind === "grid") {
    const step = 28;
    const lines = [];
    for (let x = step / 2; x < w; x += step) lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={h * 0.8} stroke={tone} strokeOpacity={0.07} strokeWidth={1} />);
    for (let y = step; y < h * 0.8; y += step) lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={w} y2={y} stroke={tone} strokeOpacity={0.09 * fade(y)} strokeWidth={1} />);
    return <G>{lines}</G>;
  }
  if (kind === "runes") {
    const ring = (rad, n, len, o) => Array.from({ length: n }, (_, k) => {
      const a = (k / n) * Math.PI * 2;
      return <Line key={`${rad}-${k}`} x1={cx + Math.cos(a) * rad} y1={cy + Math.sin(a) * rad} x2={cx + Math.cos(a) * (rad + len)} y2={cy + Math.sin(a) * (rad + len)} stroke={tone} strokeOpacity={o} strokeWidth={1} />;
    });
    return (
      <G>
        <Circle cx={cx} cy={cy} r={150} fill="none" stroke={tone} strokeOpacity={0.16} strokeWidth={1} />
        <Circle cx={cx} cy={cy} r={122} fill="none" stroke={tone} strokeOpacity={0.1} strokeWidth={1} strokeDasharray="2 6" />
        <Circle cx={cx} cy={cy} r={60} fill="none" stroke={tone} strokeOpacity={0.12} strokeWidth={1} />
        {ring(150, 48, 7, 0.18)}
        {ring(60, 6, 62, 0.08)}
        <Polygon points={Array.from({ length: 6 }, (_, k) => { const a = (k / 6) * Math.PI * 2 - Math.PI / 2; return `${cx + Math.cos(a) * 122},${cy + Math.sin(a) * 122}`; }).join(" ")}
          fill="none" stroke={tone} strokeOpacity={0.09} strokeWidth={1} />
      </G>
    );
  }
  if (kind === "rays") {
    return (
      <G>
        {Array.from({ length: 13 }, (_, k) => {
          const a = Math.PI * (0.12 + (k / 12) * 0.76);
          return <Line key={k} x1={cx} y1={-20} x2={cx + Math.cos(a) * h * 1.4} y2={-20 + Math.sin(a) * h * 1.4} stroke={tone} strokeOpacity={k % 2 ? 0.05 : 0.09} strokeWidth={k % 3 ? 1 : 2} />;
        })}
      </G>
    );
  }
  // Scattered marks: sparks, stars or petals.
  const n = kind === "stars" ? 46 : kind === "petals" ? 16 : 28;
  return (
    <G>
      {Array.from({ length: n }, (_, k) => {
        const x = rnd(k, 1) * w;
        const y = rnd(k, 2) * h * 0.85;
        const o = (0.15 + rnd(k, 3) * 0.45) * fade(y);
        if (kind === "petals") {
          return <Ellipse key={k} cx={x} cy={y} rx={4 + rnd(k, 4) * 3} ry={2 + rnd(k, 5) * 1.5} fill={tone} fillOpacity={o} transform={`rotate(${Math.round(rnd(k, 6) * 180)} ${x} ${y})`} />;
        }
        const size = kind === "stars" ? 0.6 + rnd(k, 4) * 1.1 : 1 + rnd(k, 4) * 1.8;
        return <Circle key={k} cx={x} cy={y} r={size} fill={tone} fillOpacity={kind === "embers" ? o * 1.4 : o} />;
      })}
    </G>
  );
}

// Small letter-spaced label ("SYSTEM", "GOALS").
export function Label({ children, style, tone }) {
  const { color, font } = useTheme();
  return <Text style={[{ fontFamily: font.bold, fontSize: 11, letterSpacing: 3, color: tone ?? color.muted }, style]}>{children}</Text>;
}

// The main action button: dark fill, light edge, lit top (same as Sealed's hold button).
export function SysButton({ label, onPress, disabled, tone, style }) {
  const { color, font, shape = "chamfer" } = useTheme();
  const [size, setSize] = useState(null);
  const btnId = useId("sb");
  const btnLine = size ? outline(shape === "double" ? "chamfer" : shape, size.width, size.height, 10, 0.5) : null;
  const edge = tone ?? color.frame;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} onLayout={(e) => setSize(e.nativeEvent.layout)}
      style={({ pressed }) => [{ minHeight: 50, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
      {size ? (
        <Svg pointerEvents="none" width={size.width} height={size.height} style={{ position: "absolute", left: 0, top: 0 }}>
          <Defs>
            <LinearGradient id={btnId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color.btnTop} />
              <Stop offset="1" stopColor={color.btnBottom} />
            </LinearGradient>
          </Defs>
          <Polygon points={btnLine.pts} fill={`url(#${btnId})`} stroke={edge} strokeOpacity={0.7} strokeWidth={1} />
          <Path d={`M${btnLine.from} 1.5 H${size.width - 2}`} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1} />
        </Svg>
      ) : null}
      <Text style={{ fontFamily: font.bold, fontSize: 14, letterSpacing: 3, color: "#FFFFFF" }}>{label}</Text>
    </Pressable>
  );
}
