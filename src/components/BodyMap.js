// Body map: a faceted front and back figure. Each muscle group fills with this week's training load.
// Shapes are the left half (viewer's left) in a 120 × 206 box per figure, mirrored for the right half.
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Line, Polygon } from "react-native-svg";
import { level } from "../game/muscles";
import { nativeDriver } from "./sys";

const HEAD = [60,3, 68,6, 71.5,16, 68,26, 60,30, 52,26, 48.5,16, 52,6];
// [muscle or "base", flat points x,y,…, centred (not mirrored)]
const FRONT = [
  ["base", [54,29, 66,29, 67.5,38, 52.5,38], true],
  ["traps", [52.5,37, 43,41.5, 49,43, 55.5,40]],
  ["shoulders", [42.5,42, 35,44, 30.5,50, 29.5,60, 34.5,62, 38.5,55.5, 41.5,48]],
  ["chest", [49.5,43.5, 59.6,43, 59.6,60.5, 53,63.5, 44.5,62, 39.5,56, 42.5,48.5]],
  ["biceps", [29.5,61.5, 35,63.5, 37.5,72, 35.5,83.5, 29.5,83.5, 27.5,72.5]],
  ["forearms", [28,85, 35,85, 35.5,94, 32.5,107, 27,107, 25,96]],
  ["base", [27,108.5, 32.5,108.5, 33.5,117, 29.5,122, 25,116]],
  ["abs", [52.5,64.5, 59.6,62.5, 59.6,97, 54,95.5, 52,82]],
  ["obliques", [44,63.5, 51.5,65, 51.5,82, 53.5,95.5, 48,98.5, 44.5,88, 42.5,74.5]],
  ["base", [48.5,100, 54,97.5, 59.6,99, 59.6,110, 53.5,112.5]],
  ["quads", [44,99.5, 48,100, 53.5,113, 57.5,116, 56.5,139, 53.5,149.5, 47,149.5, 42.5,137, 41.5,117]],
  ["base", [47,151, 53.5,151, 54,157.5, 47,157.5]],
  ["calves", [45.5,159, 54,159, 54.5,174, 52.5,192, 48.5,192, 45,175]],
  ["base", [47.5,193.5, 53,193.5, 55.5,201, 45,201]],
];
const BACK = [
  ["base", [55,29, 65,29, 65.5,35, 54.5,35], true],
  ["traps", [54.5,35, 43,41.5, 48.5,46, 55,53, 59.6,65, 59.6,35]],
  ["shoulders", [42.5,42, 35,44, 30.5,50, 29.5,60, 34.5,62, 39.5,54.5, 47,46.5]],
  ["back", [48.5,47, 54.5,54, 59.6,67, 59.6,84, 53,87.5, 46,82, 42,70, 40.5,57.5]],
  ["triceps", [29.5,61.5, 35,63, 38,72, 35.5,83.5, 29.5,83.5, 27.5,72.5]],
  ["forearms", [28,85, 35,85, 35.5,94, 32.5,107, 27,107, 25,96]],
  ["base", [27,108.5, 32.5,108.5, 33.5,117, 29.5,122, 25,116]],
  ["lowerback", [53.5,88.5, 59.6,85.5, 59.6,99, 53,99, 47,96, 46.5,86]],
  ["glutes", [44.5,99.5, 52,99, 59.6,100.5, 59.6,114, 53,119, 46,116, 43,108]],
  ["hamstrings", [43.5,117.5, 52.5,121, 58,119, 56.5,140, 53.5,149.5, 47,149.5, 43,137]],
  ["base", [47,151, 53.5,151, 54,157, 47,157]],
  ["calves", [45,158.5, 54.5,158.5, 56,171, 53,191, 48,191, 44,172]],
  ["base", [47.5,193, 53,193, 54.5,201, 46,201]],
];

const BG = "#08101F";
const BASE = "#101830";
// Untrained, then four steps up to a full week.
const STEPS = ["#18233F", "#22406E", "#3D6DB0", "#6FA8EE", "#CFE4FF"];
export const stepColor = (v) => (v <= 0 ? STEPS[0] : v < 0.34 ? STEPS[1] : v < 0.67 ? STEPS[2] : v < 1 ? STEPS[3] : STEPS[4]);

const pairs = (flat) => {
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
  return out;
};
const pts = (p, dx) => p.map(([x, y]) => `${x + dx},${y}`).join(" ");
const mirror = (p) => p.map(([x, y]) => [120 - x, y]);

function shapes(regions, dx) {
  const out = [];
  regions.forEach(([m, flat, centred], i) => {
    const p = pairs(flat);
    (centred ? [p] : [p, mirror(p)]).forEach((q, k) => out.push({ key: `${dx}-${i}-${k}`, m, points: pts(q, dx) }));
  });
  return out;
}
const ALL = [...shapes(FRONT, 0), ...shapes(BACK, 120)];
const HEADS = [pts(pairs(HEAD), 0), pts(pairs(HEAD), 120)];

// load: { muscle: n } for the week. hit: muscles to pulse (just trained).
export default function BodyMap({ load = {}, hit = null, width = 300 }) {
  const height = Math.round((width * 206) / 240);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hit) return;
    pulse.setValue(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
      Animated.timing(pulse, { toValue: 0.25, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [hit, pulse]);

  const hitSet = hit ? new Set(Object.keys(hit)) : null;
  return (
    <View style={{ width, height }} accessibilityRole="image">
      <Svg width={width} height={height} viewBox="0 0 240 206">
        {HEADS.map((p, i) => <Polygon key={i} points={p} fill={BASE} stroke={BG} strokeWidth={1.1} strokeLinejoin="round" />)}
        {ALL.map((s) => (
          <Polygon key={s.key} points={s.points} fill={s.m === "base" ? BASE : stepColor(level(load[s.m]))} stroke={BG} strokeWidth={1.1} strokeLinejoin="round" />
        ))}
        {[72, 80, 88].map((y) => <Line key={y} x1={52.5} y1={y} x2={67.5} y2={y} stroke={BG} strokeWidth={1} />)}
      </Svg>
      {hitSet ? (
        <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, opacity: pulse }}>
          <Svg width={width} height={height} viewBox="0 0 240 206">
            {ALL.filter((s) => hitSet.has(s.m)).map((s) => (
              <Polygon key={s.key} points={s.points} fill="rgba(234,244,255,0.35)" stroke="#FFFFFF" strokeWidth={1.2} strokeLinejoin="round" />
            ))}
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}
