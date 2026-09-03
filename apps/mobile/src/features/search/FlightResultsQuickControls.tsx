import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronDown, SlidersHorizontal } from "lucide-react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { ui } from "./SearchUi";
import type { FlightSort } from "./flightFilters";

const sortLabels: Record<"best" | "price" | "duration", string> = { best: "Best", price: "Cheapest", duration: "Fastest" };

function Control({ label, active, count, expanded, filterIcon, onPress }: { label: string; active: boolean; count?: number; expanded: boolean; filterIcon?: boolean; onPress: () => void }) {
  const { theme } = useAppTheme();
  const accent = theme.dark ? "#8FB5FF" : ui.blue;
  const foreground = active ? accent : theme.textPrimary;
  const accessibilityLabel = `${label}${active ? ", selected" : ""}${count ? `, ${count} active` : ""}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded, selected: active }}
      hitSlop={{ top: 3, bottom: 3, left: 2, right: 2 }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.control,
        { backgroundColor: theme.dark ? theme.surface : ui.pale, borderColor: theme.border },
        active && { backgroundColor: theme.dark ? "#142B55" : "#EEF4FF", borderColor: accent },
        pressed && styles.pressed,
      ]}
    >
      {filterIcon ? <SlidersHorizontal accessible={false} size={16} strokeWidth={2} color={foreground} /> : null}
      <Text numberOfLines={1} style={[styles.label, { color: foreground }, active && styles.activeLabel]}>{label}</Text>
      {count ? <View style={[styles.count, { backgroundColor: accent }]}><Text style={styles.countText}>{count}</Text></View> : null}
      <ChevronDown accessible={false} size={15} strokeWidth={1.9} color={foreground} />
    </Pressable>
  );
}

export function FlightResultsQuickControls({ sort, activeFilterCount, airlineCount, airportCount, stopsActive, openSheetKind, openSheet }: { sort: FlightSort; activeFilterCount: number; airlineCount: number; airportCount: number; stopsActive: boolean; openSheetKind: "sort" | "all" | "airlines" | "stops" | "airports" | null; openSheet: (sheet: "sort" | "all" | "airlines" | "stops" | "airports") => void }) {
  const safeSort = sort === "price" || sort === "duration" ? sort : "best";
  return (
    <ScrollView horizontal style={styles.rail} contentContainerStyle={styles.content} showsHorizontalScrollIndicator={false} alwaysBounceHorizontal={false}>
      <Control label="Filters" active={activeFilterCount > 0} count={activeFilterCount || undefined} expanded={openSheetKind === "all"} filterIcon onPress={() => openSheet("all")} />
      <Control label={sortLabels[safeSort]} active={safeSort !== "best"} expanded={openSheetKind === "sort"} onPress={() => openSheet("sort")} />
      <Control label="Airlines" active={airlineCount > 0} count={airlineCount || undefined} expanded={openSheetKind === "airlines"} onPress={() => openSheet("airlines")} />
      <Control label="Stops" active={stopsActive} count={stopsActive ? 1 : undefined} expanded={openSheetKind === "stops"} onPress={() => openSheet("stops")} />
      <Control label="Airports" active={airportCount > 0} count={airportCount || undefined} expanded={openSheetKind === "airports"} onPress={() => openSheet("airports")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { height: 44, flexGrow: 0 },
  content: { paddingHorizontal: 14, paddingVertical: 3, gap: 8, alignItems: "center", flexWrap: "nowrap" },
  control: { height: 38, minHeight: 38, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  label: { fontSize: 11.5, lineHeight: 15, fontWeight: "600", fontFamily: appFonts.semibold },
  activeLabel: { fontWeight: "700", fontFamily: appFonts.bold },
  count: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  countText: { color: "white", fontSize: 10, lineHeight: 13, fontWeight: "800", fontFamily: appFonts.extraBold },
});
