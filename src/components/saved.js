// Autosave feedback for Settings: every change saves itself, and a "Saved" stamp (with a vibration
// and a short sound) confirms it once it is really stored. If it fails, the stamp says so.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";
import { savedFeel } from "../lib/haptics";
import { hexPoints, nativeDriver } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const SavedCtx = createContext((p) => p);
export const useTrack = () => useContext(SavedCtx);

export function useSavedStamp() {
  const [stamp, setStamp] = useState(null); // { ok, n }
  const n = useRef(0);
  const track = useCallback((p) => Promise.resolve(p).then(
    (v) => { savedFeel(); n.current += 1; setStamp({ ok: true, n: n.current }); return v; },
    (e) => { n.current += 1; setStamp({ ok: false, n: n.current }); throw e; },
  ), []);
  return { stamp, track, Provider: SavedCtx.Provider };
}

export function SavedStamp({ stamp }) {
  const { color, font } = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!stamp) return;
    a.setValue(0);
    Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(2)), useNativeDriver: nativeDriver }),
      Animated.delay(stamp.ok ? 900 : 2200),
      Animated.timing(a, { toValue: 2, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: nativeDriver }),
    ]).start();
  }, [stamp, a]);
  if (!stamp) return null;
  const tone = stamp.ok ? color.frame : "#F6B45A";
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 22, alignItems: "center" }}>
      <Animated.View accessibilityLiveRegion="polite" style={{
        flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 18,
        borderWidth: 1, borderColor: tone, backgroundColor: "rgba(6,14,30,0.97)",
        opacity: a.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
        transform: [
          { scale: a.interpolate({ inputRange: [0, 1, 2], outputRange: [1.35, 1, 0.96] }) },
          { rotate: a.interpolate({ inputRange: [0, 1, 2], outputRange: ["-6deg", "-2deg", "-2deg"] }) },
        ],
      }}>
        <Svg width={22} height={24}>
          <Polygon points={hexPoints(22, 24, 1)} fill={stamp.ok ? "rgba(159,203,255,0.2)" : "rgba(246,180,90,0.15)"} stroke={tone} strokeWidth={1.4} />
          {stamp.ok ? <Path d="M6.5 12.5l3.2 3.2 6-6.4" stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            : <Path d="M11 7v6M11 16.5v.5" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />}
        </Svg>
        <Text style={{ fontFamily: font.bold, fontSize: 14, letterSpacing: 3, color: "#FFFFFF" }}>{stamp.ok ? t.saved.ok : t.saved.failed}</Text>
      </Animated.View>
    </View>
  );
}
