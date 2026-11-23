import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTheme } from "../theme";

// Soft glow for text in themes that use it (System). Empty object otherwise.
export function glow(theme, c) {
  if (!theme.decor.glow) return {};
  return { textShadowColor: c, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } };
}

function Corners({ c, size = 12, w = 2 }) {
  const base = { position: "absolute", width: size, height: size, borderColor: c };
  return (
    <>
      <View pointerEvents="none" style={[base, { top: -1, left: -1, borderTopWidth: w, borderLeftWidth: w }]} />
      <View pointerEvents="none" style={[base, { top: -1, right: -1, borderTopWidth: w, borderRightWidth: w }]} />
      <View pointerEvents="none" style={[base, { bottom: -1, left: -1, borderBottomWidth: w, borderLeftWidth: w }]} />
      <View pointerEvents="none" style={[base, { bottom: -1, right: -1, borderBottomWidth: w, borderRightWidth: w }]} />
    </>
  );
}

// A panel. In the System theme it becomes a framed System window with a title bar.
export function Panel({ title, children, style }) {
  const theme = useTheme();
  const { color, font, radius, decor } = theme;
  const framed = decor.frame === "corners";
  return (
    <View
      style={[
        {
          backgroundColor: color.surface,
          borderRadius: radius.card,
          borderWidth: framed ? 1 : 0,
          borderColor: color.line,
          padding: 22,
          gap: 10,
        },
        style,
      ]}
    >
      {framed ? <Corners c={color.frame} /> : null}
      {title ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {framed ? <View style={{ width: 6, height: 6, backgroundColor: color.frame }} /> : null}
          <Text style={{ fontFamily: font.display, fontSize: 15, letterSpacing: framed ? 1 : 0, color: framed ? color.frame : color.text }}>
            {title}
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Button({ label, onPress, kind = "primary", disabled, testID, style }) {
  const { color, font, radius, decor } = useTheme();
  const primary = kind === "primary";
  const text = kind === "text";
  const outline = primary && decor.buttons === "outline";
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          borderRadius: radius.control,
          paddingVertical: text ? 10 : 16,
          paddingHorizontal: 18,
          alignItems: "center",
          backgroundColor: outline
            ? pressed ? "rgba(142,197,255,0.28)" : "rgba(142,197,255,0.12)"
            : primary ? color.silver : "transparent",
          borderWidth: outline || kind === "secondary" ? 1 : 0,
          borderColor: outline ? color.silver : color.line,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: outline ? font.display : font.bodyBold,
          fontSize: text ? 15 : 16,
          letterSpacing: outline ? 0.5 : 0,
          color: outline ? color.silver : primary ? color.onSilver : text ? color.muted : color.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({ label, testID, ...props }) {
  const { color, font, radius } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.muted }}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        placeholderTextColor={color.muted}
        autoCapitalize="none"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          fontFamily: font.body,
          fontSize: 17,
          color: color.text,
          backgroundColor: color.bg,
          borderRadius: radius.control,
          borderWidth: 1,
          borderColor: focused ? color.silver : color.line,
          paddingHorizontal: 16,
          paddingVertical: 14,
          outlineStyle: "none",
        }}
        {...props}
      />
    </View>
  );
}
