/** Light-mode roles already used by mobile-web Flight Results. */
export const flightResultsColors = {
  canvas: "#F5F7FB", action: "#004BB8", primary: "#142033", headerSecondary: "#536B92",
  secondary: "#64748B", border: "#D8E1EC", filterCanvas: "#F2F4F8", surface: "#FFFFFF",
  alertSurface: "#EEF6FF", alertBorder: "#CFE0F8", count: "#F1F5F9", pressed: "#F8FAFC",
  dateAccent: "#075EE8", dateSelectedSurface: "rgba(239, 246, 255, 0.6)", journeyLabel: "#0057E7",
} as const;
export function resolveFlightResultsTheme<T extends { dark: boolean }>(theme: T, enabled: boolean): T {
  if (!enabled || theme.dark) return theme;
  const c = flightResultsColors;
  return { ...theme, background: c.canvas, surface: c.surface, text: c.primary, textPrimary: c.primary,
    textSecondary: c.secondary, textMuted: c.secondary, textOnSurface: c.primary, muted: c.secondary, icon: c.primary,
    border: c.border, priceAlertSurface: c.alertSurface, priceAlertBorder: c.alertBorder, priceAlertAccent: c.action,
    switchTrackActive: c.action };
}
export function resolveFlightResultsUi<T extends { blue: string; navy: string; muted: string; border: string; pale: string }>(base: T, enabled: boolean, dark: boolean): T {
  if (!enabled || dark) return base;
  return { ...base, blue: flightResultsColors.action, navy: flightResultsColors.primary, muted: flightResultsColors.secondary, border: flightResultsColors.border, pale: flightResultsColors.canvas };
}
export function flightQuickFilterColors(theme: { dark: boolean; surface: string; border: string; textPrimary: string; textSecondary: string; background: string }, selected: boolean) {
  const c = flightResultsColors;
  if (theme.dark) return { surface: selected ? theme.background : theme.surface, foreground: theme.textPrimary, border: selected ? theme.textPrimary : theme.border, chevron: theme.textSecondary, count: theme.background };
  return selected ? { surface: c.primary, foreground: c.surface, border: c.primary, chevron: c.surface, count: c.primary }
    : { surface: c.surface, foreground: c.primary, border: c.border, chevron: c.secondary, count: c.count };
}
