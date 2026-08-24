import { useEffect, useMemo, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { FlightResult } from "../../api/travelApi";
import { useAppTheme } from "../../theme/AppTheme";
import { FlowIcon } from "../flow/FlowIcon";
import { AirlineLogo } from "./AirlineLogo";
import { Button, ui } from "./SearchUi";
import { activeFlightFilterCount, emptyFlightFilters, flightFacetCounts, matchingFlightCount, type FlightFilterOptions, type FlightFilters, type NumericRange } from "./flightFilters";

export type FlightFilterSectionName = "all" | "stops" | "airlines";
const stopLabels = { nonstop: "Nonstop", one: "1 stop", twoPlus: "2+ stops" } as const;
const timeLabels = {
  morning: ["Morning", "05:00 – 12:00"], afternoon: ["Afternoon", "12:00 – 17:00"],
  evening: ["Evening", "17:00 – 21:00"], night: ["Overnight", "21:00 – 05:00"],
} as const;
export const formatFlightDuration = (value: number) => `${Math.floor(value / 60)}h ${value % 60}m`;

export function FlightFilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useAppTheme();
  return <View style={styles.section}><Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title.toUpperCase()}</Text>{children}</View>;
}

type SheetProps = {
  visible: boolean; section: FlightFilterSectionName; filters: FlightFilters; options: FlightFilterOptions;
  results: readonly FlightResult[]; normalizePrice?: (result: FlightResult) => number | null; currency: string;
  onChange: (filters: FlightFilters) => void; onClose: () => void;
};

export function FlightFilterSheet({ visible, section, filters, options, results, normalizePrice, currency, onChange, onClose }: SheetProps) {
  const { theme } = useAppTheme();
  const inset = useSafeAreaInsets();
  const [draft, setDraft] = useState(filters);
  const [airlineQuery, setAirlineQuery] = useState("");
  useEffect(() => { if (visible) { setDraft(filters); setAirlineQuery(""); } }, [visible, filters]);
  const airlines = useMemo(() => options.airlines.filter((name) => name.toLowerCase().includes(airlineQuery.trim().toLowerCase())), [airlineQuery, options.airlines]);
  const previewCount = useMemo(() => matchingFlightCount(results, draft, normalizePrice), [draft, normalizePrice, results]);
  const facetCounts = useMemo(() => flightFacetCounts(results, draft, normalizePrice), [draft, normalizePrice, results]);
  const logoByAirline = useMemo(() => results.reduce((logos, result) => {
    if (result.airlineLogo && !logos.has(result.airlineName)) logos.set(result.airlineName, result.airlineLogo);
    return logos;
  }, new Map<string, string>()), [results]);
  const hasDraftFilters = activeFlightFilterCount(draft, options) > 0;
  const toggle = <K extends "stops" | "airlines" | "times" | "fromAirports" | "toAirports">(key: K, value: FlightFilters[K][number]) =>
    setDraft((current) => ({ ...current, [key]: current[key].includes(value as never) ? current[key].filter((item) => item !== value) : [...current[key], value] } as FlightFilters));
  const full = section === "all";
  const currencyFormatter = useMemo(() => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }), [currency]);

  const optionRows = (key: "stops" | "fromAirports" | "toAirports", values: readonly string[], labels?: Record<string, string>) =>
    values.map((value) => <FilterOptionRow key={value} label={labels?.[value] ?? value} selected={draft[key].includes(value as never)} count={facetCounts[key][value] ?? 0} onPress={() => toggle(key, value as never)} />);
  const range = (key: "price" | "duration", available: NumericRange, format: (value: number) => string) => {
    const selected = draft[key] ?? available;
    const field = (edge: "min" | "max") => <TextInput accessibilityLabel={`${key} ${edge}`} value={String(selected[edge])} keyboardType="number-pad" selectTextOnFocus onChangeText={(text) => {
      const parsed = Number(text); if (Number.isFinite(parsed)) setDraft((current) => ({ ...current, [key]: { ...selected, [edge]: parsed } }));
    }} style={[styles.rangeInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }]} />;
    return <><View style={styles.rangeLabels}><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.rangeValue, { color: theme.textPrimary }]}>{format(selected.min)}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.rangeValue, styles.rangeValueRight, { color: theme.textPrimary }]}>{format(selected.max)}</Text></View><View style={styles.rangeInputs}>{field("min")}<View style={[styles.rangeLine, { backgroundColor: ui.blue }]} />{field("max")}</View></>;
  };
  const cta = `Show ${previewCount} ${previewCount === 1 ? "flight" : "flights"}`;

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
    <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View accessibilityLabel="Flight filters" style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: Math.max(inset.bottom, 12) }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}><Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>Filters</Text><View style={styles.headerActions}><Pressable accessibilityRole="button" accessibilityLabel="Clear all flight filters" accessibilityState={{ disabled: !hasDraftFilters }} disabled={!hasDraftFilters} hitSlop={10} onPress={() => setDraft(emptyFlightFilters())}><Text style={[styles.clear, !hasDraftFilters && { color: theme.textSecondary, opacity: 0.55 }]}>Clear all</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={() => { Keyboard.dismiss(); onClose(); }} style={styles.close}><FlowIcon name="close" color={theme.icon} /></Pressable></View></View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {full && options.price ? <FlightFilterSection title="Price">{range("price", options.price, (value) => currencyFormatter.format(value))}</FlightFilterSection> : null}
          {full && (options.takeoffTimes.length || options.landingTimes.length) ? <FlightFilterSection title="Times"><View accessibilityRole="tablist" style={[styles.segment, { backgroundColor: theme.background }]}>{(["takeoff", "landing"] as const).map((field) => { const selected = draft.timeField === field; return <Pressable key={field} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setDraft((current) => ({ ...current, timeField: field, times: [] }))} style={[styles.segmentChoice, selected && { backgroundColor: theme.surface }]}><Text style={[styles.segmentText, { color: selected ? theme.textPrimary : theme.textSecondary }]}>{field === "takeoff" ? "Departure" : "Arrival"}</Text></Pressable>; })}</View><View>{(draft.timeField === "takeoff" ? options.takeoffTimes : options.landingTimes).map((value) => <FilterOptionRow key={value} label={timeLabels[value][0]} detail={timeLabels[value][1]} selected={draft.times.includes(value)} onPress={() => toggle("times", value)} />)}</View></FlightFilterSection> : null}
          {full && options.duration ? <FlightFilterSection title="Duration"><Text style={[styles.durationLead, { color: theme.textPrimary }]}>Up to {formatFlightDuration((draft.duration ?? options.duration).max)}</Text>{range("duration", options.duration, formatFlightDuration)}</FlightFilterSection> : null}
          {(full || section === "stops") && options.stops.length ? <FlightFilterSection title="Stops"><View>{optionRows("stops", options.stops, stopLabels)}</View></FlightFilterSection> : null}
          {(full || section === "airlines") && options.airlines.length ? <FlightFilterSection title="Airlines"><TextInput accessibilityLabel="Search airlines" placeholder="Search airlines…" placeholderTextColor={theme.textSecondary} value={airlineQuery} returnKeyType="search" onChangeText={setAirlineQuery} style={[styles.search, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }]} /><View>{airlines.map((name) => <FilterOptionRow key={name} label={name} selected={draft.airlines.includes(name)} count={facetCounts.airlines[name] ?? 0} logo={<AirlineLogo airlineName={name} logoUrl={logoByAirline.get(name)} />} onPress={() => toggle("airlines", name)} />)}</View></FlightFilterSection> : null}
          {full && options.showAirports ? <FlightFilterSection title="Airports">{options.fromAirports.length > 1 ? <><Text style={[styles.subhead, { color: theme.textPrimary }]}>From</Text><View>{optionRows("fromAirports", options.fromAirports)}</View></> : null}{options.toAirports.length > 1 ? <><Text style={[styles.subhead, { color: theme.textPrimary }]}>To</Text><View>{optionRows("toAirports", options.toAirports)}</View></> : null}</FlightFilterSection> : null}
          {full && (options.baggage || options.refundable) ? <FlightFilterSection title="Amenities">{options.baggage ? <FilterOptionRow label="Baggage included" selected={draft.baggageIncluded} onPress={() => setDraft((x) => ({ ...x, baggageIncluded: !x.baggageIncluded }))} /> : null}{options.refundable ? <FilterOptionRow label="Flexible / refundable" selected={draft.refundable} onPress={() => setDraft((x) => ({ ...x, refundable: !x.refundable }))} /> : null}</FlightFilterSection> : null}
        </ScrollView>
        <View style={[styles.footer, { borderColor: theme.border, backgroundColor: theme.surface }]}><Button label={cta} flightResults onPress={() => { Keyboard.dismiss(); onChange(draft); onClose(); }} /></View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

function FilterOptionRow({ label, detail, count, selected, logo, onPress }: { label: string; detail?: string; count?: number; selected: boolean; logo?: React.ReactNode; onPress: () => void }) {
  const { theme } = useAppTheme();
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={count == null ? label : `${label}, ${count} flights`} accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.optionRow, selected && { backgroundColor: theme.dark ? "#142B55" : "#EEF4FF" }, pressed && { opacity: 0.72 }]}><View style={[styles.box, { borderColor: selected ? ui.blue : theme.border, backgroundColor: selected ? ui.blue : "transparent" }]}>{selected ? <Text style={styles.check}>✓</Text> : null}</View>{logo}<View style={styles.optionCopy}><Text numberOfLines={1} style={[styles.optionLabel, { color: theme.textPrimary }]}>{label}</Text>{detail ? <Text style={[styles.optionDetail, { color: theme.textSecondary }]}>{detail}</Text> : null}</View>{count != null ? <Text style={[styles.count, { color: theme.textSecondary }]}>{count}</Text> : null}</Pressable>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,24,48,.42)" }, sheet: { maxHeight: "94%", borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" },
  header: { minHeight: 54, paddingLeft: 20, paddingRight: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth }, title: { fontSize: 20, fontWeight: "800" }, headerActions: { flexDirection: "row", alignItems: "center", gap: 8 }, clear: { color: ui.blue, fontSize: 13, fontWeight: "700" }, close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scroll: { flexShrink: 1 }, content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 26, gap: 26 }, section: { gap: 10 }, sectionTitle: { fontSize: 11, lineHeight: 14, letterSpacing: 0.8, fontWeight: "800" }, subhead: { fontSize: 13, fontWeight: "800", marginTop: 2 },
  rangeLabels: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, rangeValue: { flex: 1, fontSize: 16, fontWeight: "800" }, rangeValueRight: { textAlign: "right" }, rangeInputs: { flexDirection: "row", alignItems: "center", gap: 10 }, rangeInput: { width: 80, height: 36, borderWidth: 1, borderRadius: 8, textAlign: "center", fontSize: 12 }, rangeLine: { flex: 1, height: 3, borderRadius: 2 }, durationLead: { fontSize: 16, fontWeight: "800" },
  segment: { flexDirection: "row", borderRadius: 9, padding: 3 }, segmentChoice: { flex: 1, minHeight: 38, borderRadius: 7, alignItems: "center", justifyContent: "center" }, segmentText: { fontSize: 13, fontWeight: "800" },
  optionRow: { minHeight: 48, borderRadius: 9, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, gap: 10 }, box: { width: 20, height: 20, borderWidth: 1.5, borderRadius: 5, alignItems: "center", justifyContent: "center" }, check: { color: "white", fontSize: 13, lineHeight: 15, fontWeight: "900" }, optionCopy: { flex: 1, minWidth: 0 }, optionLabel: { fontSize: 14, fontWeight: "600" }, optionDetail: { fontSize: 11, marginTop: 2 }, count: { minWidth: 28, textAlign: "right", fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
  search: { height: 42, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, fontSize: 14 }, footer: { paddingHorizontal: 18, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
