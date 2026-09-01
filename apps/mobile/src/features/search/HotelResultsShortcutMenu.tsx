import type { Dispatch, SetStateAction } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Check } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { ui } from "./SearchUi";
import type { HotelFilterOptions, HotelFilters, HotelStarRating } from "./hotelFilters";
import { hotelSortOptions, type HotelSortMode } from "./hotelSort";

export type HotelResultsShortcutMenuKind = "sort" | "stars" | "amenities";
export type HotelResultsShortcutAnchor = { x: number; y: number; width: number; height: number };

type CommonProps = {
  kind: HotelResultsShortcutMenuKind;
  anchor: HotelResultsShortcutAnchor;
  onClose: () => void;
};

type Props = CommonProps & ({
  kind: "sort";
  sort: HotelSortMode;
  onSortChange: (mode: HotelSortMode) => void;
} | {
  kind: "stars" | "amenities";
  filters: HotelFilters;
  options: HotelFilterOptions;
  onChange: Dispatch<SetStateAction<HotelFilters>>;
});

const STAR_OPTIONS: readonly (HotelStarRating | null)[] = [null, 5, 4, 3, 2, 1];
const HORIZONTAL_GUTTER = 16;
const MENU_GAP = 8;
const MAX_MENU_HEIGHT = 288;

export function selectHotelShortcutStar(filters: HotelFilters, starRating: HotelStarRating | null): HotelFilters {
  return { ...filters, starRating };
}

export function toggleHotelShortcutFacility(filters: HotelFilters, value: string): HotelFilters {
  return {
    ...filters,
    facilities: filters.facilities.includes(value)
      ? filters.facilities.filter((facility) => facility !== value)
      : [...filters.facilities, value],
  };
}

export function HotelResultsShortcutMenu(props: Props) {
  const { kind, anchor, onClose } = props;
  const { theme } = useAppTheme();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desiredWidth = kind === "amenities" ? 240 : 200;
  const width = Math.min(desiredWidth, viewportWidth - HORIZONTAL_GUTTER * 2);
  const left = Math.max(HORIZONTAL_GUTTER, Math.min(anchor.x, viewportWidth - HORIZONTAL_GUTTER - width));
  const belowTop = anchor.y + anchor.height + MENU_GAP;
  const availableBelow = viewportHeight - insets.bottom - HORIZONTAL_GUTTER - belowTop;
  const optionCount = kind === "sort"
    ? hotelSortOptions.length
    : kind === "stars" ? STAR_OPTIONS.length : props.options.facilities.length;
  const estimatedHeight = Math.min(MAX_MENU_HEIGHT, optionCount * 44 + 8);
  const top = availableBelow >= Math.min(estimatedHeight, 132)
    ? belowTop
    : Math.max(insets.top + HORIZONTAL_GUTTER, anchor.y - MENU_GAP - estimatedHeight);
  const maxHeight = Math.max(88, Math.min(MAX_MENU_HEIGHT, viewportHeight - insets.bottom - HORIZONTAL_GUTTER - top));
  const dismissLabel = kind === "sort"
    ? "Close sort options"
    : kind === "stars" ? "Close star options" : "Close amenity options";

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay} onAccessibilityEscape={onClose}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dismissLabel}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityRole={kind === "sort" || kind === "stars" ? "radiogroup" : undefined}
          style={[styles.menu, { left, top, width, maxHeight, backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <ScrollView
            bounces={false}
            nestedScrollEnabled
            showsVerticalScrollIndicator={kind === "amenities"}
            contentContainerStyle={styles.menuContent}
          >
            {kind === "sort" ? hotelSortOptions.map((option) => {
              const selected = props.sort === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  onPress={() => { props.onSortChange(option.value); onClose(); }}
                  style={({ pressed }) => [styles.row, selected && styles.selectedRow, pressed && styles.pressedRow]}
                >
                  <Text numberOfLines={1} style={[styles.label, { color: selected ? ui.blue : theme.textPrimary }]}>{option.label}</Text>
                  <View style={styles.rowEnd}>
                    <View style={styles.checkSlot}>{selected ? <Check accessible={false} size={16} color={ui.blue} /> : null}</View>
                  </View>
                </Pressable>
              );
            }) : kind === "stars" ? STAR_OPTIONS.map((rating) => {
              const selected = props.filters.starRating === rating;
              const label = rating === null ? "All" : `${rating} ${rating === 1 ? "star" : "stars"}`;
              return (
                <Pressable
                  key={rating ?? "all"}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  onPress={() => { props.onChange((current) => selectHotelShortcutStar(current, rating)); onClose(); }}
                  style={({ pressed }) => [styles.row, selected && styles.selectedRow, pressed && styles.pressedRow]}
                >
                  <Text numberOfLines={1} style={[styles.label, { color: selected ? ui.blue : theme.textPrimary }]}>{label}</Text>
                  <View style={styles.rowEnd}>
                    <Text style={[styles.count, { color: theme.textSecondary }]}>{props.options.starCounts[rating ?? 0]}</Text>
                    <View style={styles.checkSlot}>{selected ? <Check accessible={false} size={16} color={ui.blue} /> : null}</View>
                  </View>
                </Pressable>
              );
            }) : props.options.facilities.map((option) => {
              const selected = props.filters.facilities.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => props.onChange((current) => toggleHotelShortcutFacility(current, option.value))}
                  style={({ pressed }) => [styles.row, selected && styles.selectedRow, pressed && styles.pressedRow]}
                >
                  <Text numberOfLines={1} style={[styles.label, { color: selected ? ui.blue : theme.textPrimary }]}>{option.label}</Text>
                  <View style={styles.rowEnd}>
                    <Text style={[styles.count, { color: theme.textSecondary }]}>{option.count}</Text>
                    <View style={styles.checkSlot}>{selected ? <Check accessible={false} size={16} color={ui.blue} /> : null}</View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  menu: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  menuContent: { flexGrow: 0 },
  row: { minHeight: 44, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderRadius: 8 },
  selectedRow: { backgroundColor: "rgba(37, 99, 235, 0.08)" },
  pressedRow: { opacity: 0.7 },
  label: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: "600", fontFamily: appFonts.semibold },
  rowEnd: { flexDirection: "row", alignItems: "center", gap: 6 },
  count: { fontSize: 12, fontWeight: "600", fontFamily: appFonts.semibold },
  checkSlot: { width: 16, height: 16, alignItems: "center", justifyContent: "center" },
});
