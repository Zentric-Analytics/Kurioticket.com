export const flowColors = {
  blue: "#064CF7", navy: "#071A48", muted: "#56658E", border: "#E7ECF5",
  page: "#F8FAFE", white: "#FFFFFF", green: "#23833E", paleGreen: "#DDF4E1", red: "#F04438",
} as const;

type FlowAppTheme = {
  dark: boolean; background: string; surface: string; textPrimary: string; textSecondary: string;
  textMuted: string; textOnSurface: string; textOnImage: string; muted: string; border: string; icon: string;
};

export function getFlowThemeColors(theme: FlowAppTheme) {
  return {
    ...flowColors,
    page: theme.background,
    surface: theme.surface,
    card: theme.surface,
    input: theme.dark ? "#17243A" : flowColors.white,
    raised: theme.dark ? "#17243A" : flowColors.white,
    text: theme.textPrimary,
    textPrimary: theme.textPrimary,
    textSecondary: theme.textSecondary,
    textMuted: theme.textMuted,
    textOnSurface: theme.textOnSurface,
    textOnImage: theme.textOnImage,
    secondaryText: theme.muted,
    placeholder: theme.muted,
    icon: theme.icon,
    border: theme.border,
    selected: theme.dark ? "#19376D" : "#F2F6FF",
    selectedBorder: theme.dark ? "#6F98FF" : flowColors.blue,
    selectedPrimaryText: theme.textPrimary,
    selectedSecondaryText: theme.dark ? "#D3DCEF" : "#44547C",
    selectedLabelText: theme.dark ? "#AFC5FF" : flowColors.blue,
    chip: theme.dark ? "#17243A" : "#EEF2F8",
    neutralImage: theme.dark ? "#26364F" : "#DCE5F3",
    status: theme.dark ? "#1A2941" : "#EEF1F7",
    shadow: theme.dark ? "#000000" : "#18305B",
    notice: theme.dark ? "#13294F" : "#F2F6FF",
    overlay: theme.dark ? "#020617AA" : "#071A4866",
  } as const;
}
