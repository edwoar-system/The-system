// Every visual choice lives in a theme. Screens only read tokens, so new themes can be added later.
export const themes = {
  system: {
    name: "System",
    // Design v0.1 (24 Nov): black and blue base, purple only for progress (level, EXP, rank),
    // gold for coins and titles, red only for the penalty and breaking a seal.
    color: {
      bg: "#01040A",
      surface: "#08101F",
      line: "rgba(159,203,255,0.16)",
      frame: "#CFE4FF",
      text: "#E8F0FF",
      hi: "#EAF4FF",
      muted: "#93A6C8",
      silver: "#9FCBFF",
      onSilver: "#01040A",
      accent: "#9FCBFF",
      blue: "#6FA8EE",
      glow: "#0F2D66",
      purple: "#A87EFF",
      reward: "#EBC86E",
      gold: "#F0C45C",
      danger: "#FF3B4F",
      dangerSoft: "#FF5A6B",
      panelTop: "#0D1A33",
      panelBottom: "#050A18",
      btnTop: "#16294A",
      btnBottom: "#070D1C",
      spark: "#CFE4FF",
    },
    font: {
      display: "Oxanium_600SemiBold",
      displayHeavy: "Oxanium_800ExtraBold",
      bold: "Oxanium_700Bold",
      body: "Oxanium_400Regular",
      bodyMedium: "Oxanium_500Medium",
      bodyBold: "Oxanium_600SemiBold",
      num: "Rajdhani_700Bold",
    },
    radius: { control: 0, card: 0 },
    decor: { frame: "corners", glow: true, buttons: "outline" },
    shape: "chamfer",
    backdrop: "glow",
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
      bold: "InstrumentSans_600SemiBold",
      num: "Unbounded_600SemiBold",
    },
    radius: { control: 14, card: 22 },
    decor: { frame: "none", glow: false, buttons: "solid" },
    space: (n) => n * 8,
  },
};

export const DEFAULT_THEME = "system";
