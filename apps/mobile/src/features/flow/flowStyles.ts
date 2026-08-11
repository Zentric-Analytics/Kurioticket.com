import { StyleSheet } from "react-native";
import { useMemo } from "react";
import { useAppTheme } from "../../theme/AppTheme";
import { getFlowThemeColors } from "./flowThemeColors";
export { getFlowThemeColors } from "./flowThemeColors";

export { flowColors } from "./flowThemeColors";
import { flowColors } from "./flowThemeColors";

export function useFlowTheme() {
  const { theme } = useAppTheme();
  return useMemo(() => {
    const colors = getFlowThemeColors(theme);
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
