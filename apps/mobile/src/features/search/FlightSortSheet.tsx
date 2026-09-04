import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { ui } from "./SearchUi";
import { FlightResultsSheetShell } from "./FlightResultsSheetShell";
import type { FlightSort } from "./flightFilters";

const options: { value: FlightSort; label: string; description: string }[] = [
  { value: "best", label: "Best", description: "Best balance of price and journey time" },
  { value: "price", label: "Cheapest", description: "Lowest total price" },
  { value: "duration", label: "Fastest", description: "Shortest total journey" },
];

export function FlightSortSheet({
  visible,
  sort,
  onApply,
  onClose,
}: {
  visible: boolean;
  sort: FlightSort;
  onApply: (sort: FlightSort) => void;
  onClose: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <FlightResultsSheetShell
      visible={visible}
      title="Sort flights"
      closeLabel="Close sort options"
      onClose={onClose}
      compactMenu={{ left: 96, width: 190 }}
    >
      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((option) => {
          const selected = sort === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onApply(option.value)}
              style={({ pressed }) => [
                styles.option,
                selected && { backgroundColor: theme.dark ? "#142B55" : "#F7FAFF" },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.copy}>
                <Text style={[styles.label, { color: selected ? (theme.dark ? "#8FB5FF" : "#004BB8") : theme.textPrimary }]}>
                  {option.label}
                </Text>
                <Text numberOfLines={1} style={[styles.description, { color: theme.textSecondary }]}>{option.description}</Text>
              </View>
              {selected ? <Check accessible={false} size={17} strokeWidth={2.2} color={theme.dark ? "#8FB5FF" : ui.blue} /> : null}
            </Pressable>
          );
        })}
      </View>
    </FlightResultsSheetShell>
  );
}

const styles = StyleSheet.create({
  options: { padding: 0 },
  option: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pressed: { opacity: 0.72 },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 14, lineHeight: 18, fontWeight: "600", fontFamily: appFonts.semibold },
  description: { marginTop: 1, fontSize: 10.5, lineHeight: 14, fontWeight: "500", fontFamily: appFonts.medium },
});
