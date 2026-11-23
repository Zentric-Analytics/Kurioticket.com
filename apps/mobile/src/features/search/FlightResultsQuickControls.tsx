import { useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react-native";
import { useFlightResultsTheme } from "./FlightResultsPresentationContext";
import { flightQuickFilterColors } from "./flightResultsPresentation";
import { appFonts } from "../../theme/typography";
import type { FlightQuickFilterGroup, FlightSort } from "./flightFilters";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { flightResultsUiCopy } from "./flightResultsSummary";
import { isFlightQuickControlTap, type FlightQuickControlTouch } from "./flightQuickControlActivation";

/** Keep Android's non-responder touch observation for both sibling actions.
 * Horizontal drags belong to the ScrollView and must never open or clear a group. */
function RailAction({ label, selected, expanded, onPress, children, clear = false }: {
  label: string;
  selected?: boolean;
  expanded?: boolean;
  onPress: () => void;
  children: (pressed: boolean) => ReactNode;
  clear?: boolean;
}) {
  const [androidPressed, setAndroidPressed] = useState(false);
  const touchStart = useRef<FlightQuickControlTouch | null>(null);
  const touchRejected = useRef(false);
  if (Platform.OS === "android") {
    const touch = ({ nativeEvent }: GestureResponderEvent): FlightQuickControlTouch => ({
      pageX: nativeEvent.pageX,
      pageY: nativeEvent.pageY,
      timestamp: nativeEvent.timestamp,
    });
    return (
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded, selected }}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={({ nativeEvent }) => { if (nativeEvent.actionName === "activate") onPress(); }}
        onTouchStart={(event) => {
          touchStart.current = touch(event);
          touchRejected.current = false;
          setAndroidPressed(true);
        }}
        onTouchMove={(event) => {
          if (touchStart.current && !isFlightQuickControlTap(touchStart.current, touch(event))) {
            touchRejected.current = true;
            setAndroidPressed(false);
          }
        }}
        onTouchCancel={() => {
          touchStart.current = null;
          touchRejected.current = false;
          setAndroidPressed(false);
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          const rejected = touchRejected.current;
          touchStart.current = null;
          touchRejected.current = false;
          setAndroidPressed(false);
          if (start && !rejected && isFlightQuickControlTap(start, touch(event))) onPress();
        }}
        style={[styles.touchTarget, clear && styles.clearTarget]}
      >
        {children(androidPressed)}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded, selected }}
      onPress={onPress}
      style={[styles.touchTarget, clear && styles.clearTarget]}
    >
      {({ pressed }) => children(pressed)}
    </Pressable>
  );
}
function Control({ label, active, count, expanded, filterIcon, onPress, onClear }: {
  label: string; active: boolean; count?: number; expanded: boolean; filterIcon?: boolean; onPress: () => void; onClear?: () => void;
}) {
  const { theme } = useFlightResultsTheme();
  const { locale } = useMobileLocalization();
  const copy = flightResultsUiCopy(locale);
  const selectedVisual = active && Boolean(onClear);
  const colors = flightQuickFilterColors(theme, selectedVisual);
  const accessibilityLabel = `${label}${active ? `, ${copy.selected}` : ""}${count ? `, ${count} ${copy.active}` : ""}`;
  return <View style={styles.controlGroup}>
    <View pointerEvents="none" style={[styles.capsuleSurface, { backgroundColor: colors.surface, borderColor: colors.border }]} />
    <RailAction label={accessibilityLabel} selected={active} expanded={expanded} onPress={onPress}>{pressed => <View style={[styles.capsule, pressed && styles.pressed]}>
      {filterIcon ? <SlidersHorizontal accessible={false} size={16} strokeWidth={2.2} color={colors.foreground} /> : null}
      <Text numberOfLines={1} style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      {count ? <View style={[styles.count, { backgroundColor: colors.count }]}><Text style={[styles.countText, { color: colors.foreground }]}>{count}</Text></View> : null}
      {!filterIcon ? <ChevronDown accessible={false} size={13} strokeWidth={1.9} color={colors.chevron} style={expanded ? styles.chevronExpanded : undefined} /> : null}
    </View>}</RailAction>
    {selectedVisual && onClear ? <RailAction clear label={`${copy.clearFilters}: ${label}`} onPress={onClear}>{pressed => <View style={[styles.clearIcon, pressed && styles.pressed]}><X accessible={false} size={14} strokeWidth={2} color={colors.foreground} /></View>}</RailAction> : null}
  </View>;
}
export function FlightResultsQuickControls({ sort, activeFilterCount, airlineCount, airportCount, stopsCount, openSheetKind, openSheet, clearGroup }: {
  sort: FlightSort; activeFilterCount: number; airlineCount: number; airportCount: number; stopsCount: number;
  openSheetKind: "sort" | "all" | "airlines" | "stops" | "airports" | null;
  openSheet: (sheet: "sort" | "all" | "airlines" | "stops" | "airports") => void;
  clearGroup: (group: FlightQuickFilterGroup) => void;
}) {
  const { locale } = useMobileLocalization();
  const copy = flightResultsUiCopy(locale);
  const sortLabels = { best: copy.best, price: copy.cheapest, duration: copy.fastest };
  const safeSort = sort === "price" || sort === "duration" ? sort : "best";
  return <ScrollView horizontal style={styles.rail} contentContainerStyle={styles.content} showsHorizontalScrollIndicator={false} alwaysBounceHorizontal={false}>
    <Control label={copy.filters} active={activeFilterCount > 0} count={activeFilterCount || undefined} expanded={openSheetKind === "all"} filterIcon onPress={() => openSheet("all")} />
    <Control label={sortLabels[safeSort]} active={safeSort !== "best"} expanded={openSheetKind === "sort"} onPress={() => openSheet("sort")} />
    <Control label={copy.airlines} active={airlineCount > 0} count={airlineCount || undefined} expanded={openSheetKind === "airlines"} onPress={() => openSheet("airlines")} onClear={() => clearGroup("airlines")} />
    <Control label={copy.stops} active={stopsCount > 0} count={stopsCount || undefined} expanded={openSheetKind === "stops"} onPress={() => openSheet("stops")} onClear={() => clearGroup("stops")} />
    <Control label={copy.airports} active={airportCount > 0} count={airportCount || undefined} expanded={openSheetKind === "airports"} onPress={() => openSheet("airports")} onClear={() => clearGroup("airports")} />
  </ScrollView>;
}
const styles = StyleSheet.create({
  rail: { height: 44, flexGrow: 0 },
  content: { paddingLeft: 12, paddingRight: 12, gap: 6, alignItems: "center", flexWrap: "nowrap" },
  controlGroup: { height: 44, flexDirection: "row", alignItems: "center" },
  capsuleSurface: { position: "absolute", top: 4, bottom: 4, left: 0, right: 0, borderWidth: 1, borderRadius: 9 },
  touchTarget: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  capsule: { height: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 10 },
  clearTarget: { width: 44 },
  clearIcon: { alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.72 },
  label: { fontSize: 13, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold },
  count: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  countText: { fontSize: 11, lineHeight: 14, fontWeight: "600", fontFamily: appFonts.semibold },
  chevronExpanded: { transform: [{ rotate: "180deg" }] },
});
