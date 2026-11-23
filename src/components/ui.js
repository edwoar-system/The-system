import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTheme } from "../theme";

export function Button({ label, onPress, kind = "primary", disabled, testID, style }) {
  const { color, font, radius } = useTheme();
  const primary = kind === "primary";
  const text = kind === "text";
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
          backgroundColor: primary ? color.silver : "transparent",
          borderWidth: kind === "secondary" ? 1 : 0,
          borderColor: color.line,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: font.bodyBold,
          fontSize: text ? 15 : 16,
          color: primary ? color.onSilver : text ? color.muted : color.text,
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
          backgroundColor: color.surface,
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
