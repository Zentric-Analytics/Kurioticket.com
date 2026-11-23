import { appFonts } from "../../theme/typography";

// Hotel Details title/meta/icon colours, Hotel Results canvas, and the shared hotel action colour.
export const homeHotelColors = {
  canvas: "#F5F7FB", primary: "#020617", secondary: "#475569",
  icon: "#0F172A", action: "#004BB8", border: "#D8E1EC", surface: "#FFFFFF",
} as const;

export function resolveHomeTheme<T extends { dark: boolean }>(theme: T, enabled: boolean): T {
  if (!enabled || theme.dark) return theme;
  const c = homeHotelColors;
  return { ...theme, background: c.canvas, surface: c.surface, text: c.primary,
    textPrimary: c.primary, textOnSurface: c.primary, textSecondary: c.secondary,
    textMuted: c.secondary, muted: c.secondary, icon: c.icon, border: c.border };
}

export function homeFontWeight(weight: string | number | undefined, inherited = "400") {
  if (weight === undefined) return inherited;
  if (weight === "normal") return "400";
  if (weight === "bold") return "700";
  const value = Number(weight);
  return value >= 700 ? "700" : value >= 600 ? "600" : value >= 500 ? "500" : "400";
}
export function homeFontFamily(weight: string) {
  return weight === "700" ? appFonts.bold : weight === "600" ? appFonts.semibold
    : weight === "500" ? appFonts.medium : appFonts.regular;
}

export function homeTextColor(color: unknown, theme: { dark: boolean; textPrimary: string; textSecondary: string }) {
  if (typeof color !== "string") return undefined;
  const normalized = color.toUpperCase();
  if (normalized === "#071A48") return theme.dark ? theme.textPrimary : homeHotelColors.primary;
  if (normalized === "#56658E") return theme.dark ? theme.textSecondary : homeHotelColors.secondary;
  if (normalized === "#064CF7" || normalized === "#004BB8") return theme.dark ? "#8FB5FF" : homeHotelColors.action;
  // Retain image overlays, white button labels, validation and other semantic colours.
  return undefined;
}
