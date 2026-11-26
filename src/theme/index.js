import { createContext, useContext } from "react";
import { themes, DEFAULT_THEME } from "./themes";

const ThemeContext = createContext(themes[DEFAULT_THEME]);

export function ThemeProvider({ name = DEFAULT_THEME, children }) {
  return <ThemeContext.Provider value={themes[name] ?? themes[DEFAULT_THEME]}>{children}</ThemeContext.Provider>;
}

// A skin from the shop: the System theme with its colours swapped, and for full themes its own frame
// shape and backdrop too.
const skinCache = {};
export function SkinProvider({ skin, id, children }) {
  const base = themes[DEFAULT_THEME];
  const value = id && skin ? (skinCache[id] ??= { ...base, color: { ...base.color, ...skin.color }, shape: skin.shape ?? base.shape, backdrop: skin.backdrop ?? base.backdrop }) : base;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export { themes };
