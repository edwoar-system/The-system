// Rank-up moment for a skill: the rank hexagon lands with its new letter, then the reward.
import { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Polygon, Stop } from "react-native-svg";
import { Frame, Label, SysButton, hexPoints, nativeDriver } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

// data: { letter, name, xp } or null
export default function RankUp({ data, onClose }) {
  const { color, font } = useTheme();
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!data) return;
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: nativeDriver }).start();
  }, [data, a]);

  if (!data) return null;
  const at = (s, e) => a.interpolate({ inputRange: [0, s, e, 1], outputRange: [0, 0, 1, 1], extrapolate: "clamp" });
  const hexScale = a.interpolate({ inputRange: [0, 0.1, 0.28, 0.36, 1], outputRange: [0.5, 0.5, 1.1, 1, 1] });

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.96)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Animated.View style={{ width: 140, height: 156, alignItems: "center", justifyContent: "center", opacity: at(0.08, 0.16), transform: [{ scale: hexScale }] }}>
          <Svg width={140} height={156} style={{ position: "absolute" }}>
            <Defs>
              <LinearGradient id="ruE" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#EAF4FF" />
                <Stop offset="0.45" stopColor={color.purple} />
                <Stop offset="1" stopColor={color.blue} />
              </LinearGradient>
            </Defs>
            <Polygon points={hexPoints(140, 156, 2)} fill="#0A0A1C" stroke="url(#ruE)" strokeWidth={3} />
            <Polygon points={hexPoints(140, 156, 14)} fill="none" stroke={color.accent} strokeOpacity={0.3} strokeWidth={1} />
          </Svg>
          <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 4, color: color.muted }}>{t.skills.rank}</Text>
          <Text style={{ fontFamily: font.num, fontSize: 70, lineHeight: 72, color: "#FFFFFF" }}>{data.letter}</Text>
        </Animated.View>

        <Animated.Text style={{ marginTop: 24, fontFamily: font.displayHeavy, fontSize: 34, letterSpacing: 6, color: "#FFFFFF", opacity: at(0.32, 0.46) }}>
          {data.restored ? t.skills.restored : t.skills.rankUp}
        </Animated.Text>
        <Animated.Text style={{ marginTop: 6, fontFamily: font.body, fontSize: 14, color: color.muted, opacity: at(0.4, 0.54) }}>
          {fill(t.skills.rankUpSub, { name: data.name, rank: data.letter })}
        </Animated.Text>

        {data.xp ? (
          <Animated.View style={{ width: "100%", maxWidth: 360, marginTop: 24, opacity: at(0.5, 0.66) }}>
            <Frame kind="premium" contentStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 15, color: color.text }}>{t.skills.rankUpXp}</Text>
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.skills.rankUpXpSub}</Text>
                </View>
                <Text style={{ fontFamily: font.num, fontSize: 22, color: color.accent }}>+{data.xp} {t.status.exp}</Text>
              </View>
            </Frame>
          </Animated.View>
        ) : null}

        <Animated.View style={{ width: "100%", maxWidth: 360, marginTop: 18, opacity: at(0.7, 0.86) }}>
          <SysButton label={t.skills.continue} onPress={onClose} />
        </Animated.View>
        <Label style={{ position: "absolute", top: 60 }} tone={color.hi}>{t.status.system}</Label>
      </View>
    </Modal>
  );
}
