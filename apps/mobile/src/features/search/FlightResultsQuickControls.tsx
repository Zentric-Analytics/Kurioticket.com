import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronDown, SlidersHorizontal } from "lucide-react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import type { FlightSort } from "./flightFilters";
import {
  clearFlightResultsQuickMenuAnchor,
  setFlightResultsQuickMenuAnchor,
} from "./flightResultsQuickMenuAnchor";

const sortLabels: Record<"best" | "price" | "duration", string> = {
  best: "Best",
  price: "Cheapest",
  duration: "Fastest",
};

const webFilterBorder = "#D8E1EC";
const webFilterText = "#142033";
const webFilterAccent = "#004BB8";
const webFilterChevron = "#64748B";
const webFilterPressed = "#F8FAFC";
const webFilterCountBackground = "rgba(0,75,184,0.08)";
const webFilterSurface = "#FFFFFF";
const fullFilterAccessibilityLabel = "Filters";

type ControlProps = {
  label: string;
  active: boolean;
  count?: number;
  expanded: boolean;
  filterIcon?: boolean;
  anchored?: boolean;
  accessibilityLabelOverride?: string;
  onPress: () => void;
};

function Control({ label, active, count, expanded, filterIcon, anchored = false, accessibilityLabelOverride, onPress }: ControlProps) {
  const { theme } = useAppTheme();
  const triggerRef = useRef<View>(null);
  const light = !theme.dark;
  const accent = light ? webFilterAccent : "#8FB5FF";
  const foreground = light ? webFilterText : theme.textPrimary;
  const chevron = light ? webFilterChevron : theme.textSecondary;
  const border = light ? webFilterBorder : theme.border;
  const surface = light ? webFilterSurface : theme.surface;
  const countBackground = light ? webFilterCountBackground : "#142B55";
  const accessibilityLabel = `${accessibilityLabelOverride ?? label}${active ? ", selected" : ""}${count ? `, ${count} active` : ""}`;

  const handlePress = () => {
    if (!anchored) {
      clearFlightResultsQuickMenuAnchor();
      onPress();
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) {
      clearFlightResultsQuickMenuAnchor();
      onPress();
      return;
    }
    trigger.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        setFlightResultsQuickMenuAnchor({ x, y, width, height });
      } else {
        clearFlightResultsQuickMenuAnchor();
      }
      onPress();
    });
  };

  return (
    <Pressable
      ref={triggerRef}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded, selected: active }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.control,
        { backgroundColor: pressed && light ? webFilterPressed : surface, borderColor: border },
      ]}
    >
      {filterIcon ? (
        <SlidersHorizontal accessible={false} size={16} strokeWidth={2.2} color={accent} />
      ) : null}
      <Text numberOfLines={1} style={[styles.label, { color: foreground }]}>{label}</Text>
      {count ? (
        <View style={[styles.count, { backgroundColor: countBackground }]}> 
          <Text style={[styles.countText, { color: accent }]}>{count}</Text>
        </View>
      ) : null}
      <ChevronDown
        accessible={false}
        size={14}
        strokeWidth={1.9}
        color={chevron}
        style={expanded ? styles.chevronExpanded : undefined}
      />
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
  const { theme } = useAppTheme();
  const safeSort = sort === "price" || sort === "duration" ? sort : "best";
  const railSurface = theme.background;

  return (
    <ScrollView horizontal
      style={[styles.rail, { backgroundColor: railSurface }]}
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
        anchored
        onPress={() => openSheet("sort")}
      />
      <Control
        label="Airlines"
        active={airlineCount > 0}
        count={airlineCount || undefined}
        expanded={openSheetKind === "airlines"}
        anchored
        onPress={() => openSheet("airlines")}
      />
      <Control
        label="Stops"
        active={stopsCount > 0}
        count={stopsCount || undefined}
        expanded={openSheetKind === "stops"}
        anchored
        onPress={() => openSheet("stops")}
      />
      <Control
        label="Airports"
        active={airportCount > 0}
        count={airportCount || undefined}
        expanded={openSheetKind === "airports"}
        anchored
        onPress={() => openSheet("airports")}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { height: 48, flexGrow: 0 },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
    alignItems: "center",
    flexWrap: "nowrap",
  },
  control: {
    height: 44,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
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
