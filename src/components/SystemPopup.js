// The System window that slides in at the top: "[ SYSTEM ]", a title, a line or two and maybe a bar.
// Tap it to close; it also closes by itself after a few seconds.
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { onSystem } from "../lib/popup";
import { nativeDriver } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

export default function SystemPopup() {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  useEffect(() => onSystem((m) => {
    clearTimeout(timer.current);
    setMsg(m);
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: nativeDriver, friction: 7 }).start();
    timer.current = setTimeout(() => hide(), 3800);
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  function hide() {
    clearTimeout(timer.current);
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: nativeDriver }).start(() => setMsg(null));
  }

  if (!msg) return null;
  const tone = msg.tone === "debuff" ? "#F6B45A" : color.accent;
  const pct = msg.bar ? Math.max(0, Math.min(1, msg.bar.value / msg.bar.max)) : 0;
  return (
    <Animated.View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: insets.top + 10, alignItems: "center", zIndex: 50,
      opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>
      <Pressable accessibilityRole="alert" accessibilityLabel={[msg.title, ...(msg.lines ?? [])].join(". ")} onPress={hide}
        style={{ width: "92%", maxWidth: 420, borderWidth: 1, borderColor: tone, backgroundColor: "rgba(4,10,24,0.97)", paddingVertical: 12, paddingHorizontal: 16, gap: 6,
          shadowColor: tone, shadowOpacity: 0.6, shadowRadius: 18 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 3, color: tone, textAlign: "center" }}>{t.popup.system}</Text>
        <Text style={{ fontFamily: font.bold, fontSize: 18, color: "#FFFFFF", textAlign: "center" }}>{msg.title}</Text>
        {msg.bar ? (
          <View style={{ gap: 4 }}>
            <View style={{ height: 8, backgroundColor: "rgba(159,203,255,0.12)", borderWidth: 1, borderColor: "rgba(159,203,255,0.25)" }}>
              <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: tone }} />
            </View>
            <Text style={{ fontFamily: font.num, fontSize: 12, color: color.muted, textAlign: "right" }}>{msg.bar.label ?? `${msg.bar.value} / ${msg.bar.max}`}</Text>
          </View>
        ) : null}
        {(msg.lines ?? []).map((l, i) => (
          <Text key={i} style={{ fontFamily: i === 0 ? font.bodyMedium : font.body, fontSize: 13, lineHeight: 18, color: i === 0 ? color.text : color.muted, textAlign: "center" }}>{l}</Text>
        ))}
      </Pressable>
    </Animated.View>
  );
}
