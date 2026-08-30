import { StyleSheet, View } from "react-native";
import { useFlowTheme } from "./flowStyles";
import type { PackageMode } from "./packageSearchModel";

export type SearchResultProductIconName = "flight" | "hotel" | "car";
export const PACKAGE_SUGGESTION_ICONS: Record<PackageMode, readonly SearchResultProductIconName[]> = {
  "hotel-flight": ["flight", "hotel"],
  "flight-car": ["flight", "car"],
  "hotel-car": ["hotel", "car"],
  "hotel-flight-car": ["flight", "hotel", "car"],
};

export function SearchResultProductIcons({ icons }: { icons: readonly SearchResultProductIconName[] }) {
  const ft = useFlowTheme();
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.slot, { backgroundColor: ft.colors.input }, icons.length === 3 && styles.threeIcons]}/>;
}

const styles = StyleSheet.create({
  slot: { width: 46, height: 46, borderRadius: 12, flexShrink: 0, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 2 },
  threeIcons: { gap: 1 },
});
