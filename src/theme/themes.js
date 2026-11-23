// Every visual choice lives in a theme. Screens only read tokens, so new themes can be added later.
export const themes = {
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
    space: (n) => n * 8,
  },
};

export const DEFAULT_THEME = "minimal";
