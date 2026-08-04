import { StyleSheet } from "react-native";
import { useMemo } from "react";
import { useAppTheme } from "../../theme/AppTheme";

export const flowColors = {
  blue: "#064CF7",
  navy: "#071A48",
  muted: "#56658E",
  border: "#E7ECF5",
  page: "#F8FAFE",
  white: "#FFFFFF",
  green: "#23833E",
  paleGreen: "#DDF4E1",
  red: "#F04438",
} as const;

export function useFlowTheme() {
  const { theme } = useAppTheme();
  return useMemo(() => {
    const colors = {
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
      chip: theme.dark ? "#17243A" : "#EEF2F8",
      neutralImage: theme.dark ? "#26364F" : "#DCE5F3",
      status: theme.dark ? "#1A2941" : "#EEF1F7",
      shadow: theme.dark ? "#000000" : "#18305B",
      notice: theme.dark ? "#13294F" : "#F2F6FF",
      overlay: theme.dark ? "#020617AA" : "#071A4866",
    } as const;
    const styles = StyleSheet.create({
      safe: { flex: 1, backgroundColor: colors.page },
      scroll: { paddingHorizontal: 14, paddingBottom: 26, gap: 14 },
      title: {
        color: colors.text,
        fontSize: 22,
        lineHeight: 28,
        fontWeight: "800",
      },
      header: {
        minHeight: 58,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      },
      iconButton: {
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 24,
      },
      card: {
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 14,
        overflow: "hidden",
      },
      shadow: {
        shadowColor: colors.shadow,
        shadowOpacity: theme.dark ? 0.18 : 0.07,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: theme.dark ? 0 : 2,
      },
      sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 4,
      },
      sectionTitle: {
        color: colors.text,
        fontSize: 15,
        lineHeight: 20,
        fontWeight: "800",
      },
      viewAll: {
        color: colors.blue,
        fontSize: 13,
        fontWeight: "700",
        paddingVertical: 10,
      },
      label: {
        color: colors.secondaryText,
        fontSize: 10,
        lineHeight: 14,
        fontWeight: "600",
      },
      value: {
        color: colors.text,
        fontSize: 14,
        lineHeight: 19,
        fontWeight: "700",
      },
      meta: { color: colors.secondaryText, fontSize: 11, lineHeight: 16 },
      primary: {
        minHeight: 54,
        borderRadius: 9,
        backgroundColor: colors.blue,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
      },
      primaryText: { color: flowColors.white, fontSize: 15, fontWeight: "800" },
      pressed: { opacity: 0.68 },
    });
    return { theme, colors, styles };
  }, [theme]);
}

export const flowStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: flowColors.page },
  scroll: { paddingHorizontal: 14, paddingBottom: 26, gap: 14 },
  title: {
    color: flowColors.navy,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  card: {
    backgroundColor: flowColors.white,
    borderColor: flowColors.border,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  shadow: {
    shadowColor: "#18305B",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: {
    color: flowColors.navy,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  viewAll: {
    color: flowColors.blue,
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 10,
  },
  label: {
    color: flowColors.muted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
  },
  value: {
    color: flowColors.navy,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  meta: { color: flowColors.muted, fontSize: 11, lineHeight: 16 },
  primary: {
    minHeight: 54,
    borderRadius: 9,
    backgroundColor: flowColors.blue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  primaryText: { color: flowColors.white, fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.68 },
});
