import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { C } from "../theme";

export function Window({ title, children, style }) {
  return (
    <View style={[s.win, style]}>
      {title ? <Text style={s.winTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Button({ label, onPress, kind = "primary", disabled, testID }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, kind === "ghost" && s.ghost, (pressed || disabled) && { opacity: 0.6 }]}
    >
      <Text style={[s.btnText, kind === "ghost" && { color: C.muted }]}>{label}</Text>
    </Pressable>
  );
}

export function Field(props) {
  return <TextInput placeholderTextColor={C.muted} autoCapitalize="none" style={s.input} {...props} />;
}

const s = StyleSheet.create({
  win: { backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 20, gap: 12 },
  winTitle: { color: C.accent, fontSize: 13, letterSpacing: 3, fontWeight: "600" },
  btn: { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: C.line },
  btnText: { color: "#04101f", fontWeight: "700", fontSize: 16 },
  input: {
    backgroundColor: C.bg, borderColor: C.line, borderWidth: 1, borderRadius: 10,
    color: C.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
  },
});
