import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readDarkMode, writeDarkMode } from "../storage/preferenceStorage";

export const lightTheme = {
  dark: false,
  background: "#FAFBFF",
  surface: "#FFFFFF",
  text: "#071A48",
  muted: "#56658E",
  border: "#E7ECF5",
  icon: "#071A48",
} as const;

export const darkTheme = {
  dark: true,
  background: "#091224",
  surface: "#121E33",
  text: "#F4F7FF",
  muted: "#AAB5CD",
  border: "#2B3952",
  icon: "#EAF0FF",
} as const;

type ThemeValue = {
  theme: typeof lightTheme | typeof darkTheme;
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => Promise<void>;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(false);
  useEffect(() => {
    let active = true;
    void readDarkMode().then((saved) => { if (active) setDarkModeState(saved); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const value = useMemo<ThemeValue>(() => ({
    theme: darkMode ? darkTheme : lightTheme,
    darkMode,
    setDarkMode: async (enabled) => {
      setDarkModeState(enabled);
      try {
        await writeDarkMode(enabled);
      } catch (error) {
        setDarkModeState(!enabled);
        throw error;
      }
    },
  }), [darkMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAppTheme must be used within AppThemeProvider");
  return value;
}
