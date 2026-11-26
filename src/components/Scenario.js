// System messages, scenario style: each line is its own dark box in [brackets] that types itself out,
// one after another, like a message from the System appearing in front of you.
import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { nativeDriver } from "./sys";
import { useTheme } from "../theme";

// Text that types itself out after `delay` ms.
export function Typed({ text, delay = 0, speed = 16, style }) {
  const [n, setN] = useState(0);
  const full = String(text ?? "");
  useEffect(() => {
    let id = null;
    const start = setTimeout(() => {
      id = setInterval(() => setN((k) => {
        if (k >= full.length) { clearInterval(id); return k; }
        return k + 2;
      }), speed);
    }, delay);
    return () => { clearTimeout(start); clearInterval(id); };
  }, [full, delay, speed]);
  return (
    <Text accessibilityLabel={full} style={style}>
      {full.slice(0, n)}
      <Text style={{ opacity: 0 }}>{full.slice(n)}</Text>
    </Text>
  );
}

// One message box. tone colours the edge mark and the brackets; strong = the headline box.
export function MsgBox({ text, tone, delay = 0, strong = false, align = "center", children, typed = true }) {
  const { color, font } = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const id = setTimeout(() => Animated.timing(a, { toValue: 1, duration: 160, useNativeDriver: nativeDriver }).start(), delay);
    return () => clearTimeout(id);
  }, [a, delay]);
  const edge = tone ?? color.frame;
  const textStyle = { fontFamily: strong ? font.bold : font.bodyMedium, fontSize: strong ? 15 : 13, lineHeight: strong ? 21 : 19, color: strong ? "#FFFFFF" : color.text, textAlign: align };
  return (
    <Animated.View style={{ opacity: a, transform: [{ scaleY: a.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
      borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", backgroundColor: "rgba(0,0,0,0.88)", paddingVertical: strong ? 10 : 8, paddingHorizontal: 14 }}>
      <View pointerEvents="none" style={{ position: "absolute", left: -1, top: -1, bottom: -1, width: 3, backgroundColor: edge }} />
      {text != null ? (
        typed ? <Typed text={text} delay={delay + 120} style={textStyle} /> : <Text style={textStyle}>{text}</Text>
      ) : null}
      {children}
    </Animated.View>
  );
}

// "[ text ]": the System's bracketed voice.
export const bracket = (s) => `[${s}]`;
