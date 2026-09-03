import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { Button, ui } from "./SearchUi";
import { FlightResultsSheetShell } from "./FlightResultsSheetShell";
import type { FlightSort } from "./flightFilters";

const options: { value: FlightSort; label: string; description: string }[] = [
  { value: "best", label: "Best", description: "Best balance of price and journey time" },
  { value: "price", label: "Cheapest", description: "Lowest total price" },
  { value: "duration", label: "Fastest", description: "Shortest total journey" },
];

export function FlightSortSheet({ visible, sort, onApply, onClose }: { visible: boolean; sort: FlightSort; onApply: (sort: FlightSort) => void; onClose: () => void }) {
  const { theme } = useAppTheme();
  const [draft, setDraft] = useState(sort);
  useEffect(() => { if (visible) setDraft(sort); }, [sort, visible]);
  return (
    <FlightResultsSheetShell visible={visible} title="Sort flights" closeLabel="Close sort options" onClose={onClose} footer={<Button label="Apply sort" flightResults onPress={() => onApply(draft)} />}>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((option) => {
          const selected = draft === option.value;
          return (
            <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setDraft(option.value)} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
              <View style={[styles.radio, { borderColor: selected ? ui.blue : theme.border }]}>{selected ? <View style={styles.dot} /> : null}</View>
              <View style={styles.copy}>
                <Text style={[styles.label, { color: selected ? ui.blue : theme.textPrimary }]}>{option.label}</Text>
                <Text style={[styles.description, { color: theme.textSecondary }]}>{option.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </FlightResultsSheetShell>
  );
}

const styles = StyleSheet.create({
  options: { paddingHorizontal: 20, paddingBottom: 10 },
  option: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  pressed: { opacity: 0.65 },
  radio: { width: 21, height: 21, borderWidth: 1.5, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: ui.blue },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts.bold },
  description: { marginTop: 1, fontSize: 11.5, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium },
});
