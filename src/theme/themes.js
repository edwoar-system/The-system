// Every visual choice lives in a theme. Screens only read tokens, so new themes can be added later.
export const themes = {
  system: {
    name: "System",
    color: {
      bg: "#0A0F1C", // deep ink navy
      surface: "#0F1729",
      line: "#24365E",
      frame: "#8EC5FF", // window corners
      text: "#E6EEFF",
      muted: "#7F8DAD",
      silver: "#8EC5FF", // primary action colour (ice blue)
      onSilver: "#0A0F1C",
      accent: "#8EC5FF",
      reward: "#F5C96A", // coins and rewards
      danger: "#FF7A8A",
    },
    font: {
      display: "ChakraPetch_600SemiBold",
      displayHeavy: "ChakraPetch_700Bold",
      body: "InstrumentSans_400Regular",
      bodyMedium: "InstrumentSans_500Medium",
      bodyBold: "InstrumentSans_600SemiBold",
    },
    radius: { control: 4, card: 6 },
    decor: { frame: "corners", glow: true, buttons: "outline" },
    space: (n) => n * 8,
  },
  minimal: {
    name: "Minimal",
    color: {
      bg: "#1E2228", // graphite
      surface: "#262B33",
      line: "#343A44",
      text: "#EEF0F3",
      muted: "#9098A3",
      silver: "#D5DAE1", // primary actions, like brushed metal
      onSilver: "#1E2228",
      accent: "#8E9BFF", // progress and live state
      reward: "#EEF0F3",
      danger: "#FF8A80",
    },
    font: {
      display: "Unbounded_600SemiBold",
      displayHeavy: "Unbounded_700Bold",
      body: "InstrumentSans_400Regular",
      bodyMedium: "InstrumentSans_500Medium",
      bodyBold: "InstrumentSans_600SemiBold",
    },
    radius: { control: 14, card: 22 },
    decor: { frame: "none", glow: false, buttons: "solid" },
    space: (n) => n * 8,
  },
};

export const DEFAULT_THEME = "system";
