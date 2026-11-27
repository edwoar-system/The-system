// A time you can set three ways: tap − / + (5 minutes), hold them to run fast, or tap the time and type it
// ("1510", "15:10", "9"). Value is in hours (15.1667 = 15:10); hours past 24 mean after midnight.
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTheme } from "../theme";
import { t } from "../i18n";

const STEP = 5 / 60;
const roundMin = (h) => Math.round(h * 60) / 60;
export const fmtTime = (h) => {
  const m = Math.round(h * 60);
  const hh = Math.floor(m / 60) % 24;
  return `${String(hh).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
// "1510", "15:10", "15.10", "9", "930" → hours, or null. Times before `min` are read as after midnight.
export function parseTime(text, min = 0, max = 30) {
  const s = String(text ?? "").trim().replace(/[.,h ]/g, ":");
  let hh;
  let mm;
  if (s.includes(":")) [hh, mm] = s.split(":").map((x) => Number(x || 0));
  else if (/^\d{1,2}$/.test(s)) [hh, mm] = [Number(s), 0];
  else if (/^\d{3,4}$/.test(s)) [hh, mm] = [Number(s.slice(0, -2)), Number(s.slice(-2))];
  else return null;
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh > 23 || mm > 59) return null;
  const h = hh + mm / 60;
  return h < min && h + 24 <= max ? h + 24 : h;
}

export default function TimeInput({ label, value, onChange, min = 0, max = 30, compact = false }) {
  const { color, font } = useTheme();
  const [typing, setTyping] = useState(null);
  const timer = useRef(null);
  const live = useRef(value);
  useEffect(() => { live.current = value; }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const clamp = (h) => Math.min(max, Math.max(min, roundMin(h)));
  const bump = (d) => {
    const next = clamp(Math.round((live.current + d) / STEP) * STEP);
    live.current = next;
    onChange(next);
  };
  // Hold: after a moment it repeats, and after a while it moves 15 minutes at a time.
  const start = (sign) => {
    bump(sign * STEP);
    let n = 0;
    const tick = () => {
      n += 1;
      bump(sign * (n > 12 ? 3 : 1) * STEP);
      timer.current = setTimeout(tick, n > 4 ? 70 : 140);
    };
    timer.current = setTimeout(tick, 380);
  };
  const stop = () => clearTimeout(timer.current);
  const commit = () => {
    const h = parseTime(typing, min, max);
    setTyping(null);
    if (h != null) onChange(clamp(h));
  };

  const size = compact ? 40 : 44;
  const btn = (sign, s) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${s}`} accessibilityHint={t.time.holdHint}
      onPressIn={() => start(sign)} onPressOut={stop}
      style={({ pressed }) => ({ width: size, height: size, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: pressed ? "rgba(159,203,255,0.14)" : "transparent" })}>
      <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.text }}>{s}</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: compact ? 1 : undefined, flexDirection: "row", alignItems: "center", gap: 4 }}>
      {btn(-1, "−")}
      {typing != null ? (
        <TextInput value={typing} onChangeText={setTyping} onSubmitEditing={commit} onBlur={commit} autoFocus selectTextOnFocus
          keyboardType="numbers-and-punctuation" returnKeyType="done" maxLength={5} accessibilityLabel={label}
          style={{ flex: 1, minWidth: 62, height: size, textAlign: "center", fontFamily: font.num, fontSize: 18, color: "#FFFFFF", borderWidth: 1, borderColor: color.accent, backgroundColor: "rgba(5,10,24,0.8)" }} />
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${fmtTime(value)}`} accessibilityHint={t.time.typeHint} onPress={() => setTyping(fmtTime(value))}
          style={{ flex: 1, minWidth: 62, height: size, alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "rgba(159,203,255,0.3)" }}>
          <Text style={{ fontFamily: font.num, fontSize: 18, color: "#FFFFFF" }}>{fmtTime(value)}</Text>
        </Pressable>
      )}
      {btn(1, "+")}
    </View>
  );
}
