import { createContext, useContext } from "react";
import { themes, DEFAULT_THEME } from "./themes";

const ThemeContext = createContext(themes[DEFAULT_THEME]);

export function ThemeProvider({ name = DEFAULT_THEME, children }) {
  return <ThemeContext.Provider value={themes[name] ?? themes[DEFAULT_THEME]}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export { themes };
