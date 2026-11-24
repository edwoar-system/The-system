// Level-up moment: light gathers, the level hexagon lands, then the rewards.
import { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";
import { levelFromXp } from "../game/economy";
import { Frame, Label, SysButton, hexPoints, nativeDriver } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

export default function LevelUp({ data, onClose }) {
  const { color, font } = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!data) return;
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: nativeDriver }).start();
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 40000, easing: Easing.linear, useNativeDriver: nativeDriver }));
    loop.start();
    return () => loop.stop();
  }, [data, a, spin]);

  if (!data) return null;
  const at = (s, e) => a.interpolate({ inputRange: [0, s, e, 1], outputRange: [0, 0, 1, 1], extrapolate: "clamp" });
  const hexScale = a.interpolate({ inputRange: [0, 0.2, 0.32, 0.4, 1], outputRange: [0.4, 0.4, 1.08, 1, 1] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const next = levelFromXp(data.xp);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.96)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Animated.View pointerEvents="none" style={{ position: "absolute", width: 600, height: 600, opacity: at(0.15, 0.35), transform: [{ rotate }] }}>
          <Svg width={600} height={600}>
            <Defs>
              <LinearGradient id="ray" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor={color.purple} stopOpacity="0.55" />
                <Stop offset="1" stopColor={color.blue} stopOpacity="0" />
              </LinearGradient>
              <RadialGradient id="core" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.5" />
                <Stop offset="0.25" stopColor={color.purple} stopOpacity="0.25" />
                <Stop offset="1" stopColor={color.blue} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {Array.from({ length: 12 }, (_, i) => (
              <Polygon key={i} points={i % 2 ? "300,300 295,60 305,60" : "300,300 294,0 306,0"} fill="url(#ray)" transform={`rotate(${i * 30} 300 300)`} />
            ))}
            <Rect x="150" y="150" width="300" height="300" fill="url(#core)" />
          </Svg>
        </Animated.View>

        <Animated.View style={{ width: 130, height: 144, alignItems: "center", justifyContent: "center", opacity: at(0.18, 0.24), transform: [{ scale: hexScale }] }}>
          <Svg width={130} height={144} style={{ position: "absolute" }}>
            <Defs>
              <LinearGradient id="lvE" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#EAF4FF" />
                <Stop offset="0.4" stopColor={color.purple} />
                <Stop offset="1" stopColor={color.blue} />
              </LinearGradient>
            </Defs>
            <Polygon points={hexPoints(130, 144, 2)} fill="#0A0A1C" stroke="url(#lvE)" strokeWidth={3} />
            <Polygon points={hexPoints(130, 144, 14)} fill="none" stroke={color.accent} strokeOpacity={0.3} strokeWidth={1} />
          </Svg>
          <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 4, color: color.muted }}>{t.levelUp.level}</Text>
          <Text style={{ fontFamily: font.num, fontSize: 64, lineHeight: 66, color: "#FFFFFF" }}>{data.level}</Text>
        </Animated.View>

        <Animated.Text style={{ marginTop: 24, fontFamily: font.displayHeavy, fontSize: 34, letterSpacing: 6, color: "#FFFFFF", opacity: at(0.36, 0.5) }}>
          {t.levelUp.title}
        </Animated.Text>
        <Animated.Text style={{ marginTop: 6, fontFamily: font.body, fontSize: 14, color: color.muted, opacity: at(0.45, 0.58) }}>
          {t.levelUp.sub}
        </Animated.Text>

        <Animated.View style={{ width: "100%", maxWidth: 360, marginTop: 24, opacity: at(0.55, 0.7) }}>
          <Frame kind="premium" contentStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 15, color: color.text }}>{t.levelUp.next}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.levelUp.nextSub, { level: data.level + 1 })}</Text>
              </View>
              <Text style={{ fontFamily: font.num, fontSize: 22, color: color.accent }}>{next.xpForLevel - next.xpIntoLevel}</Text>
            </View>
          </Frame>
        </Animated.View>

        <Animated.View style={{ width: "100%", maxWidth: 360, marginTop: 18, opacity: at(0.75, 0.9) }}>
          <SysButton label={t.levelUp.claim} onPress={onClose} />
        </Animated.View>
        <Label style={{ position: "absolute", top: 60 }} tone={color.hi}>{t.status.system}</Label>
      </View>
    </Modal>
  );
}
