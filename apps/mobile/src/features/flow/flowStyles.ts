import { StyleSheet } from "react-native";

export const flowColors = {
  blue: "#064CF7", navy: "#071A48", muted: "#56658E", border: "#E7ECF5",
  page: "#F8FAFE", white: "#FFFFFF", green: "#23833E", paleGreen: "#DDF4E1", red: "#F04438",
} as const;

export const flowStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: flowColors.page },
  scroll: { paddingHorizontal: 14, paddingBottom: 26, gap: 14 },
  title: { color: flowColors.navy, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  header: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 24 },
  card: { backgroundColor: flowColors.white, borderColor: flowColors.border, borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  shadow: { shadowColor: "#18305B", shadowOpacity: .07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  sectionTitle: { color: flowColors.navy, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  viewAll: { color: flowColors.blue, fontSize: 13, fontWeight: "700", paddingVertical: 10 },
  label: { color: flowColors.muted, fontSize: 10, lineHeight: 14, fontWeight: "600" },
  value: { color: flowColors.navy, fontSize: 14, lineHeight: 19, fontWeight: "700" },
  meta: { color: flowColors.muted, fontSize: 11, lineHeight: 16 },
  primary: { minHeight: 54, borderRadius: 9, backgroundColor: flowColors.blue, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  primaryText: { color: flowColors.white, fontSize: 15, fontWeight: "800" },
  pressed: { opacity: .68 },
});
