import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, Unbounded_600SemiBold, Unbounded_700Bold } from "@expo-google-fonts/unbounded";
import {
  InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold,
} from "@expo-google-fonts/instrument-sans";
import { ChakraPetch_600SemiBold, ChakraPetch_700Bold } from "@expo-google-fonts/chakra-petch";
import { ThemeProvider, themes } from "../theme";
import { DEFAULT_THEME } from "../theme/themes";

export default function RootLayout() {
  const [loaded] = useFonts({
    Unbounded_600SemiBold, Unbounded_700Bold,
    InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold,
    ChakraPetch_600SemiBold, ChakraPetch_700Bold,
  });
  const bg = themes[DEFAULT_THEME].color.bg;
  if (!loaded) return <View style={{ flex: 1, backgroundColor: bg }} />;
  return (
    <ThemeProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }} />
    </ThemeProvider>
  );
}
