import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronDown, SlidersHorizontal } from "lucide-react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import type { FlightSort } from "./flightFilters";

const sortLabels: Record<"best" | "price" | "duration", string> = {
  best: "Best",
  price: "Cheapest",
  duration: "Fastest",
};

const webFilterBorder = "#D8E1EC";
const webFilterText = "#142033";
const webFilterChevron = "#64748B";
const webFilterPressed = "#F8FAFC";
const webFilterCountBackground = "#F1F5F9";
const webFilterSurface = "#FFFFFF";
const fullFilterAccessibilityLabel = "Filters";

type ControlProps = {
  label: string;
  active: boolean;
  count?: number;
  expanded: boolean;
  filterIcon?: boolean;
  accessibilityLabelOverride?: string;
  onPress: () => void;
};

function Control({ label, active, count, expanded, filterIcon, accessibilityLabelOverride, onPress }: ControlProps) {
  const { theme } = useAppTheme();
  const light = !theme.dark;
  const foreground = light ? webFilterText : theme.textPrimary;
  const chevron = light ? webFilterChevron : theme.textSecondary;
  const border = light ? webFilterBorder : theme.border;
  const surface = light ? webFilterSurface : theme.surface;
  const countBackground = light ? webFilterCountBackground : theme.background;
  const accessibilityLabel = `${accessibilityLabelOverride ?? label}${active ? ", selected" : ""}${count ? `, ${count} active` : ""}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded, selected: active }}
      onPress={onPress}
      style={styles.touchTarget}
    >
      {({ pressed }) => <View style={[
        styles.capsule,
        { backgroundColor: pressed && light ? webFilterPressed : surface, borderColor: border },
      ]}>
        {filterIcon ? <SlidersHorizontal accessible={false} size={16} strokeWidth={2.2} color={foreground} /> : null}
        <Text numberOfLines={1} style={[styles.label, { color: foreground }]}>{label}</Text>
        {count ? <View style={[styles.count, { backgroundColor: countBackground }]}><Text style={[styles.countText, { color: foreground }]}>{count}</Text></View> : null}
        {!filterIcon ? <ChevronDown accessible={false} size={13} strokeWidth={1.9} color={chevron} style={expanded ? styles.chevronExpanded : undefined} /> : null}
      </View>}
    </Pressable>
  );
}

export function FlightResultsQuickControls({
  sort,
  activeFilterCount,
  airlineCount,
  airportCount,
  stopsCount,
  openSheetKind,
  openSheet,
}: {
  sort: FlightSort;
  activeFilterCount: number;
  airlineCount: number;
  airportCount: number;
  stopsCount: number;
  openSheetKind: "sort" | "all" | "airlines" | "stops" | "airports" | null;
  openSheet: (sheet: "sort" | "all" | "airlines" | "stops" | "airports") => void;
}) {
  const safeSort = sort === "price" || sort === "duration" ? sort : "best";

  return (
    <ScrollView horizontal
      style={styles.rail}
      contentContainerStyle={styles.content}
      showsHorizontalScrollIndicator={false}
      alwaysBounceHorizontal={false}
    >
      <Control
        label="Filter"
        accessibilityLabelOverride={fullFilterAccessibilityLabel}
        active={activeFilterCount > 0}
        count={activeFilterCount || undefined}
        expanded={openSheetKind === "all"}
        filterIcon
        onPress={() => openSheet("all")}
      />
      <Control
        label={sortLabels[safeSort]}
        active={safeSort !== "best"}
        expanded={openSheetKind === "sort"}
        onPress={() => openSheet("sort")}
      />
      <Control
        label="Airlines"
        active={airlineCount > 0}
        count={airlineCount || undefined}
        expanded={openSheetKind === "airlines"}
        onPress={() => openSheet("airlines")}
      />
      <Control
        label="Stops"
        active={stopsCount > 0}
        count={stopsCount || undefined}
        expanded={openSheetKind === "stops"}
        onPress={() => openSheet("stops")}
      />
      <Control
        label="Airports"
        active={airportCount > 0}
        count={airportCount || undefined}
        expanded={openSheetKind === "airports"}
        onPress={() => openSheet("airports")}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { height: 44, flexGrow: 0 },
  content: {
    paddingLeft: 24,
    paddingRight: 16,
    gap: 6,
    alignItems: "center",
    flexWrap: "nowrap",
  },
  touchTarget: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  capsule: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
  },
  count: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
  },
  chevronExpanded: { transform: [{ rotate: "180deg" }] },
});
