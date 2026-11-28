// Body map: a faceted front and back figure with 35 real muscles. Each fills with this week's training load,
// or (mode "rest") shows how recovered it is.
// Shapes are the left half (viewer's left) in a 120 × 206 box per figure, mirrored for the right half.
import { useEffect, useId, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { ClipPath, Defs, G, Line, Polygon, Rect } from "react-native-svg";
import { level, recoveryState } from "../game/muscles";
import { nativeDriver } from "./sys";

const HEAD = [60,3, 68,6, 71.5,16, 68,26, 60,30, 52,26, 48.5,16, 52,6];
// [muscle or "base", flat points x,y,…, centred (not mirrored)]. 35 real muscles over the two views.
const FRONT = [
  ["base", [54,29, 66,29, 67.5,38, 52.5,38], true],
  ["neck", [52.8,31, 56,30.5, 58.5,38.5, 53,38]],
  ["upperTraps", [52.5,37, 43,41.5, 49,43, 55.5,40]],
  ["frontDelt", [42.5,42, 38,43, 33.5,52, 32.5,61, 34.5,62, 38.5,55.5, 41.5,48]],
  ["sideDelt", [38,43, 35,44, 30.5,50, 29.5,60, 32.5,61, 33.5,52]],
  ["upperChest", [49.5,43.5, 59.6,43, 59.6,51, 50,51.5, 41,51.5, 42.5,48.5]],
  ["lowerChest", [41,51.5, 50,51.5, 59.6,51, 59.6,60.5, 53,63.5, 44.5,62, 39.5,56]],
  ["biceps", [29.5,61.5, 35,63.5, 37.5,72, 35.5,80, 31,80, 29,71, 28.5,66]],
  ["brachialis", [27.5,72.5, 29,71, 31,80, 35.5,80, 35.5,83.5, 29.5,83.5]],
  ["forearmFlexors", [28,85, 35,85, 35.5,94, 32.5,107, 27,107, 25,96]],
  ["base", [27,108.5, 32.5,108.5, 33.5,117, 29.5,122, 25,116]],
  ["serratus", [44,63.5, 51,65, 50.5,71, 42.8,73]],
  ["obliques", [42.8,73, 50.5,71, 51.5,82, 53.5,95.5, 48,98.5, 44.5,88]],
  ["upperAbs", [52.5,64.5, 59.6,62.5, 59.6,79, 52.2,79]],
  ["lowerAbs", [52.2,79, 59.6,79, 59.6,97, 54,95.5, 52,82]],
  ["hipFlexors", [48,100, 53.5,98, 55,104, 52,111, 50,104]],
  ["base", [53.5,98, 59.6,99, 59.6,112, 57.5,116, 52,111, 55,104]],
  ["vastusLateralis", [44,99.5, 46.5,101, 46.5,120, 48.5,141, 47,149.5, 42.5,137, 41.5,117]],
  ["rectusFemoris", [46.5,101, 50,104, 52,111, 52,122, 51,140, 48.5,141, 46.5,120]],
  ["adductors", [52,111, 57.5,116, 56.8,130, 52,122]],
  ["vastusMedialis", [52,122, 56.8,130, 56.5,139, 53.5,149.5, 49.5,149, 48.5,141, 51,140]],
  ["base", [47,151, 53.5,151, 54,157.5, 47,157.5]],
  ["tibialis", [45.5,159, 49.5,159, 50,176, 48.5,192, 45,175]],
  ["gastrocnemius", [49.5,159, 54,159, 54.5,174, 52.5,192, 48.5,192, 50,176]],
  ["base", [47.5,193.5, 53,193.5, 55.5,201, 45,201]],
];
const BACK = [
  ["base", [55,29, 65,29, 65.5,35, 54.5,35], true],
  ["upperTraps", [54.5,35, 43,41.5, 48.5,45, 59.6,44, 59.6,35]],
  ["midTraps", [48.5,45, 59.6,44, 59.6,55, 54,51]],
  ["lowerTraps", [54,51, 59.6,55, 59.6,66, 56,58]],
  ["rearDelt", [42.5,42, 38,43, 33.5,52, 32.5,61, 34.5,62, 39.5,54.5, 47,46.5]],
  ["sideDelt", [38,43, 35,44, 30.5,50, 29.5,60, 32.5,61, 33.5,52]],
  ["rotatorCuff", [47,46.5, 49.5,53, 48,61, 41.5,62, 40.5,57]],
  ["rhomboids", [48.5,45.5, 54,51, 56,58, 53,62, 48,61, 49.5,53]],
  ["lats", [41.5,62, 48,61, 53,62, 56,58, 59.6,67, 59.6,84, 53,87.5, 46,82, 42,70]],
  ["tricepsLateral", [29.5,61.5, 32.5,62.5, 32,83.5, 29.5,83.5, 27.5,72.5]],
  ["tricepsLong", [32.5,62.5, 35,63, 38,72, 35.5,83.5, 32,83.5]],
  ["forearmExtensors", [28,85, 35,85, 35.5,94, 32.5,107, 27,107, 25,96]],
  ["base", [27,108.5, 32.5,108.5, 33.5,117, 29.5,122, 25,116]],
  ["lowerBack", [53.5,88.5, 59.6,85.5, 59.6,99, 53,99, 47,96, 46.5,86]],
  ["gluteMed", [44.5,99.5, 52,99, 49,104.5, 43.5,107]],
  ["gluteMax", [49,104.5, 52,99, 59.6,100.5, 59.6,114, 53,119, 46,116, 43.5,107]],
  ["hamstringOuter", [43.5,117.5, 50,120, 50,149.5, 47,149.5, 43,137]],
  ["hamstringInner", [50,120, 52.5,121, 58,119, 56.5,140, 53.5,149.5, 50,149.5]],
  ["base", [47,151, 53.5,151, 54,157, 47,157]],
  ["gastrocnemius", [45,158.5, 54.5,158.5, 56,171, 53,178, 47.5,178, 44,172]],
  ["soleus", [44,172, 47.5,178, 53,178, 56,171, 53,191, 48,191]],
  ["base", [47.5,193, 53,193, 54.5,201, 46,201]],
];

const BG = "#08101F";
const BASE = "#101830";
// Untrained, then four steps up to a full week.
const STEPS = ["#18233F", "#22406E", "#3D6DB0", "#6FA8EE", "#CFE4FF"];
export const stepColor = (v) => (v <= 0 ? STEPS[0] : v < 0.34 ? STEPS[1] : v < 0.67 ? STEPS[2] : v < 1 ? STEPS[3] : STEPS[4]);
// Recovery: fresh, recovering, tired.
export const REST_COLORS = { fresh: "#22406E", recovering: "#8C6A3C", tired: "#F6B45A" };
export const restColor = (v) => REST_COLORS[recoveryState(v ?? 0)];

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
// mode "rest" colours by fatigue instead ({ muscle: 0–2 } in fatigue). onMuscle: tap a muscle.
// water (0–1): how far today's water has filled the body, drawn as a rising blue level.
export default function BodyMap({ load = {}, hit = null, width = 300, mode = "week", fatigue = {}, onMuscle, selected, water = 0 }) {
  const clipId = `wl${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const waterY = 206 * (1 - Math.max(0, Math.min(1, water)));
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
          <Polygon key={s.key} points={s.points} strokeLinejoin="round"
            fill={s.m === "base" ? BASE : mode === "rest" ? restColor(fatigue[s.m]) : stepColor(level(load[s.m]))}
            stroke={selected && s.m === selected ? "#FFFFFF" : BG} strokeWidth={selected && s.m === selected ? 1.6 : 1.1}
            onPress={onMuscle && s.m !== "base" ? () => onMuscle(s.m) : undefined} />
        ))}
        {[72, 80, 88].map((y) => <Line key={y} x1={52.5} y1={y} x2={67.5} y2={y} stroke={BG} strokeWidth={1} />)}
        {water > 0 ? (
          <>
            <Defs><ClipPath id={clipId}><Rect x={0} y={waterY} width={240} height={206 - waterY} /></ClipPath></Defs>
            <G clipPath={`url(#${clipId})`}>
              {HEADS.map((p, i) => <Polygon key={`wh${i}`} points={p} fill="rgba(96,170,255,0.32)" />)}
              {ALL.map((s) => <Polygon key={`w${s.key}`} points={s.points} fill="rgba(96,170,255,0.32)" />)}
            </G>
          </>
        ) : null}
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
