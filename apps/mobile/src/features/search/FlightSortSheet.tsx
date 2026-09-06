import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { ui } from "./SearchUi";
import { FlightResultsSheetShell } from "./FlightResultsSheetShell";
import type { FlightSort } from "./flightFilters";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { flightResultsUiCopy } from "./flightResultsSummary";

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
  const { locale } = useMobileLocalization();
  const copy = flightResultsUiCopy(locale);
  const options: { value: FlightSort; label: string; description: string }[] = [
    { value: "best", label: copy.best, description: copy.bestHelp },
    { value: "price", label: copy.cheapest, description: copy.cheapestHelp },
    { value: "duration", label: copy.fastest, description: copy.fastestHelp },
  ];
  const [draft, setDraft] = useState<FlightSort>(sort);
  useEffect(() => { if (visible) setDraft(sort); }, [sort, visible]);
  return (
    <FlightResultsSheetShell
      visible={visible}
      title={copy.sortFlights}
      subtitle={copy.sortHelp}
      insetFlightQuickSheet
      closeLabel={copy.closeSort}
      onClose={onClose}
      footer={<View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => setDraft("best")} style={[styles.reset, { borderColor: theme.border }]}><Text style={[styles.buttonText, { color: theme.textPrimary }]}>{copy.reset}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => onApply(draft)} style={styles.apply}><Text style={[styles.buttonText, styles.applyText]}>{copy.apply}</Text></Pressable></View>}
    >
      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((option) => {
          const selected = draft === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setDraft(option.value)}
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
  options: { padding: 16 },
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
  actions: { flexDirection: "row", gap: 10 }, reset: { minWidth: 116, height: 49, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" }, apply: { flex: 1, height: 49, borderRadius: 12, backgroundColor: ui.blue, alignItems: "center", justifyContent: "center" }, buttonText: { fontSize: 15, fontFamily: appFonts.bold, fontWeight: "700" }, applyText: { color: "white" },
});
