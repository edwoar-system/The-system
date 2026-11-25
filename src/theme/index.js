import { createContext, useContext } from "react";
import { themes, DEFAULT_THEME } from "./themes";

const ThemeContext = createContext(themes[DEFAULT_THEME]);

export function ThemeProvider({ name = DEFAULT_THEME, children }) {
  return <ThemeContext.Provider value={themes[name] ?? themes[DEFAULT_THEME]}>{children}</ThemeContext.Provider>;
}

// A skin from the shop: the System theme with some colours swapped (frames, buttons, glow).
const skinCache = {};
export function SkinProvider({ colors, id, children }) {
  const base = themes[DEFAULT_THEME];
  const value = id && colors ? (skinCache[id] ??= { ...base, color: { ...base.color, ...colors } }) : base;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export { themes };
