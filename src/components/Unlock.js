// Opening an app: hold the seal until it breaks, then the System grants access.
// The purchase only happens when the seal breaks; letting go early cancels.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Polygon } from "react-native-svg";
import { lockFeel, tapFeel } from "../lib/haptics";
import { Frame, Label, SysButton, hexPoints, nativeDriver } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);
const HOLD_MS = 1500;
const S = 200; // seal size
const R = 92; // charge ring radius
const CIRC = 2 * Math.PI * R;
const ACircle = Animated.createAnimatedComponent(Circle);

// The cracks that appear when the seal breaks (from the centre outward).
const CRACKS = ["M100 100 L62 48 L48 30", "M100 100 L150 64 L168 52", "M100 100 L138 152 L146 174", "M100 100 L52 140 L34 150", "M100 100 L104 40", "M100 100 L160 112"];

// kind: label of what opens (e.g. "Social media"), minutes, cost. onConfirm: does the purchase, returns a promise.
export default function Unlock({ kind, minutes, cost, onConfirm, onClose }) {
  const { color, font } = useTheme();
  const charge = useRef(new Animated.Value(0)).current;
  const crack = useRef(new Animated.Value(0)).current;
  const win = useRef(new Animated.Value(0)).current;
  const anim = useRef(null);
  const ticks = useRef([]);
  const [phase, setPhase] = useState("hold"); // hold | breaking | granted | error
  const [error, setError] = useState(null);

  useEffect(() => () => { anim.current?.stop(); ticks.current.forEach(clearTimeout); }, []);

  function start() {
    if (phase !== "hold") return;
    tapFeel();
    // Small buzzes while it charges, so you feel it building up.
    ticks.current = [400, 800, 1200].map((ms) => setTimeout(tapFeel, ms));
    anim.current = Animated.timing(charge, { toValue: 1, duration: HOLD_MS, easing: Easing.in(Easing.quad), useNativeDriver: false });
    anim.current.start(({ finished }) => { if (finished) breakSeal(); });
  }
  function stop() {
    if (phase !== "hold") return;
    ticks.current.forEach(clearTimeout);
    anim.current?.stop();
    Animated.timing(charge, { toValue: 0, duration: 250, useNativeDriver: false }).start();
  }
  async function breakSeal() {
    setPhase("breaking");
    lockFeel();
    Animated.timing(crack, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
    try {
      await onConfirm();
      setTimeout(() => {
        setPhase("granted");
        win.setValue(0);
        Animated.timing(win, { toValue: 1, duration: 360, easing: Easing.out(Easing.back(1.6)), useNativeDriver: nativeDriver }).start();
      }, 450);
    } catch (e) {
      setError(e?.message);
      setPhase("error");
    }
  }

  const dash = charge.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] });
  const shake = charge.interpolate({ inputRange: [0, 0.7, 0.8, 0.9, 1], outputRange: [0, 0, 1.5, -1.5, 2] });

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.94)", alignItems: "center", justifyContent: "center", padding: 22 }}>
        {phase === "granted" ? (
          // The System window: glitches in, then shows what's unlocked.
          <Animated.View style={{ width: "100%", maxWidth: 380,
            opacity: win.interpolate({ inputRange: [0, 0.3, 0.45, 0.6, 1], outputRange: [0, 1, 0.3, 1, 1] }),
            transform: [{ scaleY: win.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }, { translateX: win.interpolate({ inputRange: [0, 0.4, 0.5, 1], outputRange: [0, 6, -4, 0] }) }] }}>
            <Frame kind="premium" cut={16} contentStyle={{ padding: 20, gap: 12, alignItems: "center" }}>
              <Label tone={color.hi} style={{ letterSpacing: 4 }}>{t.unlock.kicker}</Label>
              <Text style={{ fontFamily: font.displayHeavy, fontSize: 26, letterSpacing: 2, color: "#FFFFFF", textAlign: "center" }}>{t.unlock.granted}</Text>
              <Text style={{ fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 22, color: color.text, textAlign: "center" }}>{fill(t.unlock.line, { kind, min: minutes })}</Text>
              <Text style={{ fontFamily: font.num, fontSize: 18, color: color.reward }}>{fill(t.unlock.cost, { n: cost })}</Text>
              <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted, textAlign: "center" }}>{t.unlock.note}</Text>
              <SysButton label={t.unlock.ok} onPress={onClose} style={{ alignSelf: "stretch" }} />
            </Frame>
          </Animated.View>
        ) : (
          <View style={{ alignItems: "center", gap: 18 }}>
            <Label tone={color.hi} style={{ letterSpacing: 4 }}>{t.unlock.sealKicker}</Label>
            <Text style={{ fontFamily: font.bold, fontSize: 20, color: "#FFFFFF", textAlign: "center" }}>{fill(t.unlock.title, { kind, min: minutes })}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={fill(t.unlock.holdLabel, { kind, min: minutes, n: cost })} accessibilityHint={t.unlock.holdHint}
              onPressIn={start} onPressOut={stop} disabled={phase !== "hold"}>
              <Animated.View style={{ width: S, height: S, transform: [{ translateX: shake }] }}>
                <Svg width={S} height={S}>
                  <Circle cx={100} cy={100} r={R} stroke="rgba(159,203,255,0.12)" strokeWidth={4} fill="none" />
                  <ACircle cx={100} cy={100} r={R} stroke={color.purple} strokeWidth={4} fill="none" strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={dash}
                    strokeLinecap="round" transform="rotate(-90 100 100)" />
                  <Polygon points={hexPoints(120, 136, 1).split(" ").map((p) => p.split(",").map(Number)).map(([x, y]) => `${x + 40},${y + 32}`).join(" ")}
                    fill="rgba(15,45,102,0.55)" stroke={color.frame} strokeWidth={1.6} />
                  <Polygon points="100,62 128,78 128,122 100,138 72,122 72,78" fill="none" stroke="rgba(207,228,255,0.35)" strokeWidth={1} strokeDasharray="3 4" />
                  {/* lock */}
                  <Path d="M88 98 v-8 a12 12 0 0 1 24 0 v8" stroke={color.frame} strokeWidth={2.4} fill="none" />
                  <Polygon points="84,98 116,98 116,120 84,120" fill={color.frame} />
                  <Line x1={100} y1={106} x2={100} y2={113} stroke="#01040A" strokeWidth={2.4} strokeLinecap="round" />
                </Svg>
                <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, opacity: crack, transform: [{ scale: crack.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.08] }) }] }}>
                  <Svg width={S} height={S}>
                    {CRACKS.map((d) => <Path key={d} d={d} stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinecap="round" />)}
                  </Svg>
                </Animated.View>
              </Animated.View>
            </Pressable>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.muted }}>{phase === "breaking" ? t.unlock.breaking : fill(t.unlock.hold, { n: cost })}</Text>
            {phase === "error" ? (
              <>
                <Text style={{ fontFamily: font.body, fontSize: 13, color: "#F6B45A", textAlign: "center" }}>{error === "no-coins" ? t.shop.noCoins : error === "other-kind" ? t.shop.otherKind : t.shop.failed}</Text>
                <SysButton label={t.unlock.close} onPress={onClose} />
              </>
            ) : (
              <Pressable accessibilityRole="button" onPress={onClose} disabled={phase !== "hold"} style={{ minHeight: 44, justifyContent: "center" }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{t.unlock.cancel}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}
