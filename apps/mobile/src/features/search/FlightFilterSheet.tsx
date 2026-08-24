import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../theme/AppTheme";
import { Button, ui } from "./SearchUi";
import { FlowIcon } from "../flow/FlowIcon";
import { emptyFlightFilters, type FlightFilterOptions, type FlightFilters, type NumericRange } from "./flightFilters";

export type FlightFilterSectionName = "all" | "stops" | "airlines";
const stopLabels = { nonstop: "Nonstop", one: "1 stop", twoPlus: "2+ stops" } as const;
const timeLabels = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night" } as const;
const minutes = (value: number) => `${Math.floor(value / 60)}h ${value % 60}m`;

export function FlightFilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useAppTheme();
  return <View style={styles.section}><Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>{children}</View>;
}

export function FlightFilterSheet({ visible, section, filters, options, currency, onChange, onClose }: {
  visible: boolean;
  section: FlightFilterSectionName;
  filters: FlightFilters;
  options: FlightFilterOptions;
  currency: string;
  onChange: (filters: FlightFilters) => void;
  onClose: () => void;
}) {
  const { theme } = useAppTheme();
  const inset = useSafeAreaInsets();
  const [draft, setDraft] = useState(filters);
  const [airlineQuery, setAirlineQuery] = useState("");
  useEffect(() => { if (visible) { setDraft(filters); setAirlineQuery(""); } }, [visible, filters]);
  const airlines = useMemo(() => options.airlines.filter((name) => name.toLowerCase().includes(airlineQuery.trim().toLowerCase())), [airlineQuery, options.airlines]);
  const toggle = <K extends "stops" | "airlines" | "times" | "fromAirports" | "toAirports">(key: K, value: FlightFilters[K][number]) =>
    setDraft((current) => ({ ...current, [key]: current[key].includes(value as never) ? current[key].filter((item) => item !== value) : [...current[key], value] } as FlightFilters));
  const chips = (key: "stops" | "airlines" | "times" | "fromAirports" | "toAirports", values: readonly string[], labels?: Record<string, string>) => (
    <View style={styles.chips}>{values.map((value) => { const selected = draft[key].includes(value as never); return <Pressable key={value} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => toggle(key, value as never)} style={[styles.chip, { borderColor: selected ? ui.blue : theme.border, backgroundColor: selected ? (theme.dark ? "#142B55" : "#EEF4FF") : theme.surface }]}><Text style={[styles.chipText, { color: selected ? ui.blue : theme.textPrimary }]}>{labels?.[value] ?? value}</Text></Pressable>; })}</View>
  );
  const range = (key: "price" | "duration", available: NumericRange, format: (value: number) => string) => {
    const selected = draft[key] ?? available;
    const field = (edge: "min" | "max") => <TextInput accessibilityLabel={`${key} ${edge}`} value={String(selected[edge])} keyboardType="number-pad" onChangeText={(text) => { const parsed = Number(text); if (Number.isFinite(parsed)) setDraft((current) => ({ ...current, [key]: { ...selected, [edge]: parsed } })); }} style={[styles.rangeInput, { color: theme.textPrimary, borderColor: theme.border }]} />;
    return <><View style={styles.rangeLabels}><Text style={{ color: theme.textSecondary }}>{format(selected.min)}</Text><Text style={{ color: theme.textSecondary }}>{format(selected.max)}</Text></View><View style={styles.rangeInputs}>{field("min")}<View style={[styles.rangeLine, { backgroundColor: theme.border }]} />{field("max")}</View></>;
  };
  const full = section === "all";
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
    <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}><View accessibilityLabel="Flight filters" style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: Math.max(inset.bottom, 12) }]}>
      <View style={styles.header}><Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>Filters</Text><View style={styles.headerActions}><Pressable accessibilityRole="button" accessibilityLabel="Clear all flight filters" hitSlop={10} onPress={() => setDraft(emptyFlightFilters())}><Text style={styles.clear}>Clear all</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={styles.close}><FlowIcon name="close" color={theme.icon} /></Pressable></View></View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {full && options.price ? <FlightFilterSection title="Price">{range("price", options.price, (value) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value))}</FlightFilterSection> : null}
        {full && (options.takeoffTimes.length || options.landingTimes.length) ? <FlightFilterSection title="Times"><View style={[styles.segment, { borderColor: theme.border }]}>{(["takeoff", "landing"] as const).map((field) => <Pressable key={field} onPress={() => setDraft((current) => ({ ...current, timeField: field, times: [] }))} style={[styles.segmentChoice, draft.timeField === field && styles.segmentSelected]}><Text style={{ color: draft.timeField === field ? "white" : theme.textPrimary, fontWeight: "700" }}>{field === "takeoff" ? "Takeoff" : "Landing"}</Text></Pressable>)}</View>{chips("times", draft.timeField === "takeoff" ? options.takeoffTimes : options.landingTimes, timeLabels)}</FlightFilterSection> : null}
        {full && options.duration ? <FlightFilterSection title="Duration">{range("duration", options.duration, minutes)}</FlightFilterSection> : null}
        {(full || section === "stops") && options.stops.length ? <FlightFilterSection title="Stops">{chips("stops", options.stops, stopLabels)}</FlightFilterSection> : null}
        {(full || section === "airlines") && options.airlines.length ? <FlightFilterSection title="Airlines">{options.airlines.length > 6 ? <TextInput accessibilityLabel="Search airlines" placeholder="Search airlines" placeholderTextColor={theme.textSecondary} value={airlineQuery} onChangeText={setAirlineQuery} style={[styles.search, { color: theme.textPrimary, borderColor: theme.border }]} /> : null}{chips("airlines", airlines)}</FlightFilterSection> : null}
        {full && options.showAirports ? <FlightFilterSection title="Airports">{options.fromAirports.length > 1 ? <><Text style={[styles.subhead, { color: theme.textSecondary }]}>From</Text>{chips("fromAirports", options.fromAirports)}</> : null}{options.toAirports.length > 1 ? <><Text style={[styles.subhead, { color: theme.textSecondary }]}>To</Text>{chips("toAirports", options.toAirports)}</> : null}</FlightFilterSection> : null}
        {full && (options.baggage || options.refundable) ? <FlightFilterSection title="Amenities">{options.baggage ? <Toggle label="Baggage included" selected={draft.baggageIncluded} onPress={() => setDraft((x) => ({ ...x, baggageIncluded: !x.baggageIncluded }))} /> : null}{options.refundable ? <Toggle label="Flexible / refundable" selected={draft.refundable} onPress={() => setDraft((x) => ({ ...x, refundable: !x.refundable }))} /> : null}</FlightFilterSection> : null}
      </ScrollView>
      <View style={[styles.footer, { borderColor: theme.border, backgroundColor: theme.surface }]}><Button label="Show flights" flightResults onPress={() => { onChange(draft); onClose(); }} /></View>
    </View></KeyboardAvoidingView>
  </Modal>;
}

function Toggle({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { theme } = useAppTheme();
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={styles.toggle}><View style={[styles.box, { borderColor: selected ? ui.blue : theme.border, backgroundColor: selected ? ui.blue : "transparent" }]} /> <Text style={{ color: theme.textPrimary }}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,24,48,.42)" }, sheet: { maxHeight: "92%", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 10 },
  header: { paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { fontSize: 20, fontWeight: "800" }, headerActions: { flexDirection: "row", alignItems: "center", gap: 10 }, clear: { color: ui.blue, fontSize: 13, fontWeight: "700" }, close: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  scroll: { flexShrink: 1 }, content: { paddingHorizontal: 18, paddingBottom: 16, gap: 20 }, section: { gap: 9 }, sectionTitle: { fontSize: 15, fontWeight: "800" }, subhead: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { minHeight: 38, borderWidth: 1, borderRadius: 19, justifyContent: "center", paddingHorizontal: 13 }, chipText: { fontSize: 13, fontWeight: "600" },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: 9, overflow: "hidden" }, segmentChoice: { flex: 1, alignItems: "center", paddingVertical: 9 }, segmentSelected: { backgroundColor: ui.blue },
  rangeLabels: { flexDirection: "row", justifyContent: "space-between" }, rangeInputs: { flexDirection: "row", alignItems: "center", gap: 10 }, rangeInput: { width: 82, height: 40, borderWidth: 1, borderRadius: 8, textAlign: "center" }, rangeLine: { flex: 1, height: 2 }, search: { height: 42, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12 },
  toggle: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 10 }, box: { width: 20, height: 20, borderWidth: 1.5, borderRadius: 5 }, footer: { paddingHorizontal: 18, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
