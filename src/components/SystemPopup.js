// System messages at the top, scenario style: a stack of [bracketed] boxes that type themselves out.
// Tap to close; they also close by themselves after a few seconds (longer when there are more lines).
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { onSystem } from "../lib/popup";
import { nativeDriver } from "./sys";
import { MsgBox, bracket } from "./Scenario";
import { useTheme } from "../theme";

export default function SystemPopup() {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const wide = useRef(new Animated.Value(0)).current; // the window opens from a line of light
  const flick = useRef(new Animated.Value(0)).current; // then its text flickers on
  const timer = useRef(null);

  useEffect(() => onSystem((m) => {
    clearTimeout(timer.current);
    setMsg(m);
    anim.setValue(0);
    wide.setValue(0);
    flick.setValue(0);
    Animated.parallel([
      Animated.spring(anim, { toValue: 1, useNativeDriver: nativeDriver, friction: 7 }),
      Animated.sequence([
        Animated.timing(wide, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
        Animated.sequence([0.8, 0.2, 1, 0.5, 1].map((v, i) => Animated.timing(flick, { toValue: v, duration: i === 4 ? 100 : 40, useNativeDriver: nativeDriver }))),
      ]),
    ]).start();
    timer.current = setTimeout(() => hide(), 3600 + (m.lines?.length ?? 0) * 700);
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  function hide() {
    clearTimeout(timer.current);
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: nativeDriver }).start(() => setMsg(null));
  }

  if (!msg) return null;
  const tone = msg.tone === "debuff" ? "#F6B45A" : color.accent;
  const pct = msg.bar ? Math.max(0, Math.min(1, msg.bar.value / msg.bar.max)) : 0;
  const lines = msg.lines ?? [];
  // Scenario style: the headline box, then one box per line, each typing itself out a moment after the last.
  return (
    <Animated.View key={msg.key} pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: insets.top + 10, alignItems: "center", zIndex: 50,
      opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }}>
      <Pressable accessibilityRole="alert" accessibilityLabel={[msg.title, ...lines].join(". ")} onPress={hide} style={{ width: "92%", maxWidth: 420, gap: 4 }}>
        <MsgBox text={bracket(msg.title)} tone={tone} strong />
        {msg.bar ? (
          <MsgBox tone={tone} delay={180}>
            <View style={{ gap: 4 }}>
              <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.12)" }}>
                <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: tone }} />
              </View>
              <Text style={{ fontFamily: font.num, fontSize: 12, color: color.muted, textAlign: "right" }}>{msg.bar.label ?? `${msg.bar.value} / ${msg.bar.max}`}</Text>
            </View>
          </MsgBox>
        ) : null}
        {lines.map((l, i) => <MsgBox key={i} text={bracket(l)} tone={tone} delay={(i + (msg.bar ? 2 : 1)) * 180} />)}
      </Pressable>
    </Animated.View>
  );
}
