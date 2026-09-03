import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import type { CarResult } from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { carFilterGroups, type CarFilterGroup } from "../../../../../src/lib/cars/carFilterPresentation";
import { doesCarMatchFilterOption, filterCarResults, type SelectedCarFilters } from "../../../../../src/lib/cars/carResults";
import { FlightResultsSheetShell } from "./FlightResultsSheetShell";
import { Button, ui } from "./SearchUi";
import { carFilterCopy, carFilterGroupLabel, carFilterOptionLabel } from "./carFilterCopy";

type Props = { visible: boolean; groupId?: string | null; results: CarResult[]; filters: SelectedCarFilters; onChange: (filters: SelectedCarFilters) => void; onClose: () => void };

export function visibleCarFilterGroups(results: CarResult[]): CarFilterGroup[] {
  return carFilterGroups.map((group) => ({ ...group, options: group.options.map((option) => ({ ...option, count: results.filter((car) => doesCarMatchFilterOption(car, option.id)).length })).filter((option) => option.count > 0) })).filter((group) => group.options.length > 0);
}

export const activeCarFilterCount = (filters: SelectedCarFilters) => Object.values(filters).reduce((total, options) => total + options.length, 0);

export function CarFilterSheet({ visible, groupId, results, filters, onChange, onClose }: Props) {
  const { theme } = useAppTheme();
  const { locale, direction } = useMobileLocalization();
  const copy = useMemo(() => carFilterCopy(locale), [locale]);
  const groups = useMemo(() => visibleCarFilterGroups(results), [results]);
  const selectedGroup = groupId ? groups.find((group) => group.id === groupId) : undefined;
  const shownGroups = selectedGroup ? [selectedGroup] : groups;
  const full = !groupId;
  const active = activeCarFilterCount(filters);
  const matching = useMemo(() => filterCarResults(results, filters).length, [filters, results]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ totalPrice: true });
  const clear = () => onChange({});
  const toggle = (group: string, option: string) => { const selected = filters[group] ?? []; const next = selected.includes(option) ? selected.filter((value) => value !== option) : [...selected, option]; onChange({ ...filters, [group]: next }); };
  const title = selectedGroup ? carFilterGroupLabel(copy, selectedGroup) : copy.filters;
  return <FlightResultsSheetShell visible={visible} fullScreen={full} title={title} subtitle={full ? (active ? `${active} ${copy.applied}` : copy.allCars) : undefined} closeLabel={copy.close} onClose={onClose} headerAction={full && active ? <Pressable accessibilityRole="button" onPress={clear} style={styles.clear}><Text style={styles.clearText}>{copy.clearAll}</Text></Pressable> : undefined} footer={<View style={styles.footer}>{full && active ? <Pressable accessibilityRole="button" onPress={clear} style={styles.footerClear}><Text style={styles.clearText}>{copy.clearAll}</Text></Pressable> : null}<View style={styles.primary}><Button label={`${copy.show} ${matching} ${matching === 1 ? copy.car : copy.cars}`} onPress={onClose} /></View></View>}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {shownGroups.map((group) => { const open = selectedGroup ? true : expanded[group.id] === true; const selectedCount = filters[group.id]?.length ?? 0; return <View key={group.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => !selectedGroup && setExpanded((value) => ({ ...value, [group.id]: !open }))} style={[styles.sectionHeader, direction === "rtl" && styles.rtlRow]}><Text style={[styles.sectionTitle, { color: theme.textPrimary, textAlign: direction === "rtl" ? "right" : "left", writingDirection: direction }]}>{carFilterGroupLabel(copy, group)}</Text><View style={[styles.sectionMeta, direction === "rtl" && styles.rtlRow]}>{selectedCount ? <Text style={styles.countBadge}>{selectedCount}</Text> : null}{!selectedGroup ? <ChevronDown size={19} color={theme.icon} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} /> : null}</View></Pressable>
        {open ? <View style={[styles.options, { borderTopColor: theme.border }]}>{group.options.map((option) => { const selected = filters[group.id]?.includes(option.id) ?? false; return <Pressable key={option.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={`${carFilterOptionLabel(copy, option)}, ${option.count}`} onPress={() => toggle(group.id, option.id)} style={[styles.row, direction === "rtl" && styles.rtlRow]}><View style={[styles.box, { borderColor: selected ? ui.blue : theme.border, backgroundColor: selected ? ui.blue : "transparent" }]}>{selected ? <Check size={14} strokeWidth={3} color="white" /> : null}</View><Text style={[styles.rowLabel, { color: theme.textPrimary, textAlign: direction === "rtl" ? "right" : "left", writingDirection: direction }]}>{carFilterOptionLabel(copy, option)}</Text><Text style={[styles.optionCount, { color: theme.textSecondary, textAlign: direction === "rtl" ? "left" : "right" }]}>{option.count}</Text></Pressable>; })}</View> : null}
      </View>; })}
    </ScrollView>
  </FlightResultsSheetShell>;
}

const styles = StyleSheet.create({ scroll: { flexShrink: 1 }, content: { paddingHorizontal: 16, paddingVertical: 16, gap: 10 }, card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: "hidden" }, sectionHeader: { minHeight: 56, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 }, rtlRow: { flexDirection: "row-reverse" }, sectionTitle: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold }, sectionMeta: { flexDirection: "row", alignItems: "center", gap: 8 }, countBadge: { minWidth: 22, borderRadius: 11, paddingHorizontal: 7, paddingVertical: 2, textAlign: "center", color: "#235A9F", backgroundColor: "#E2EAF3", fontSize: 11, fontWeight: "700" }, options: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 6 }, row: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 11 }, box: { width: 21, height: 21, borderWidth: 1.5, borderRadius: 4, alignItems: "center", justifyContent: "center" }, rowLabel: { flex: 1, fontSize: 14, lineHeight: 19, fontFamily: appFonts.medium }, optionCount: { minWidth: 26, textAlign: "right", fontSize: 12, fontFamily: appFonts.medium }, clear: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }, clearText: { color: ui.blue, fontSize: 13, fontWeight: "700", fontFamily: appFonts.bold }, footer: { flexDirection: "row", alignItems: "center", gap: 12 }, footerClear: { minWidth: 82, minHeight: 50, alignItems: "center", justifyContent: "center" }, primary: { flex: 1 } });
