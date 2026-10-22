import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readDarkMode, writeDarkMode } from "../storage/preferenceStorage";

export const lightTheme = {
  dark: false,
  background: "#FAFBFF",
  surface: "#FFFFFF",
  text: "#071A48",
  textPrimary: "#071A48",
  textSecondary: "#56658E",
  textMuted: "#56658E",
  textOnSurface: "#071A48",
  textOnImage: "#FFFFFF",
  muted: "#56658E",
  border: "#E7ECF5",
  icon: "#071A48",
  priceAlertSurface: "#EDF6FF",
  priceAlertBorder: "#C8DFF7",
  priceAlertAccent: "#1769AA",
  switchTrack: "#FFFFFF",
  switchTrackActive: "#2563EB",
} as const;

export const darkTheme = {
  dark: true,
  background: "#091224",
  surface: "#121E33",
  text: "#F4F7FF",
  textPrimary: "#F4F7FF",
  textSecondary: "#AAB5CD",
  textMuted: "#AAB5CD",
  textOnSurface: "#F4F7FF",
  textOnImage: "#FFFFFF",
  muted: "#AAB5CD",
  border: "#2B3952",
  icon: "#EAF0FF",
  priceAlertSurface: "#122A43",
  priceAlertBorder: "#294D70",
  priceAlertAccent: "#75BFFF",
  switchTrack: "#33435D",
  switchTrackActive: "#4D82F7",
} as const;

type ThemeValue = {
  theme: { [K in keyof typeof lightTheme]: K extends "dark" ? boolean : string };
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

// Override only Profile text tokens; preserve app-wide actions, surfaces and dark mode.
export function ProfileThemeProvider({ children }: { children: ReactNode }) {
  const parent = useAppTheme();
  const value = useMemo(() => parent.theme.dark ? parent : ({
    ...parent,
    theme: { ...parent.theme, text: "#1A1A1A", textPrimary: "#1A1A1A", textOnSurface: "#1A1A1A", textSecondary: "#595959", textMuted: "#595959", muted: "#595959" },
  }), [parent]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
