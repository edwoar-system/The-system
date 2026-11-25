import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, Unbounded_600SemiBold, Unbounded_700Bold } from "@expo-google-fonts/unbounded";
import {
  InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold,
} from "@expo-google-fonts/instrument-sans";
import {
  Oxanium_400Regular, Oxanium_500Medium, Oxanium_600SemiBold, Oxanium_700Bold, Oxanium_800ExtraBold,
} from "@expo-google-fonts/oxanium";
import { Rajdhani_700Bold } from "@expo-google-fonts/rajdhani";
import { ThemeProvider, themes } from "../theme";
import { DEFAULT_THEME } from "../theme/themes";
import { t } from "../i18n";

// The test website (built from the dev branch) shows a label, so you always know which one you're on.
const TEST = process.env.EXPO_PUBLIC_STAGE === "test";

export default function RootLayout() {
  const [loaded] = useFonts({
    Unbounded_600SemiBold, Unbounded_700Bold,
    InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold,
    Oxanium_400Regular, Oxanium_500Medium, Oxanium_600SemiBold, Oxanium_700Bold, Oxanium_800ExtraBold,
    Rajdhani_700Bold,
  });
  const bg = themes[DEFAULT_THEME].color.bg;
  if (!loaded) return <View style={{ flex: 1, backgroundColor: bg }} />;
  return (
    <ThemeProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }} />
      {TEST ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, alignItems: "center" }}>
          <Text style={{ marginTop: 2, paddingHorizontal: 8, paddingVertical: 2, fontFamily: "Oxanium_700Bold", fontSize: 10, letterSpacing: 2, color: "#01040A", backgroundColor: "#F6B45A" }}>{t.stage.test}</Text>
        </View>
      ) : null}
    </ThemeProvider>
  );
}
