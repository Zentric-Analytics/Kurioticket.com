import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CarResult } from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { carFilterGroups, type CarFilterGroup } from "../../../../../src/lib/cars/carFilterPresentation";
import { doesCarMatchFilterOption, filterCarResults, type SelectedCarFilters } from "../../../../../src/lib/cars/carResults";
import { FLIGHT_FILTER_LIGHT_CANVAS, FLIGHT_FILTER_LIGHT_OUTLINE } from "./FlightResultsSheetShell";
import { ui } from "./SearchUi";
import { carFilterCopy, carFilterGroupLabel, carFilterOptionLabel } from "./carFilterCopy";
import { NATIVE_FILTER_SELECTION_FEEDBACK_MS } from "./filterResultsTransition";

type Props = { visible: boolean; results: CarResult[]; filters: SelectedCarFilters; onChange: (filters: SelectedCarFilters) => void; onClose: () => void };

export function visibleCarFilterGroups(results: CarResult[]): CarFilterGroup[] {
  return carFilterGroups.map((group) => ({ ...group, options: group.options.map((option) => ({ ...option, count: results.filter((car) => doesCarMatchFilterOption(car, option.id)).length })).filter((option) => option.count > 0) })).filter((group) => group.options.length > 0);
}
export const activeCarFilterCount = (filters: SelectedCarFilters) => Object.values(filters).reduce((total, options) => total + options.length, 0);

export function CarFilterSheet({ visible, results, filters, onChange, onClose }: Props) {
  const { theme } = useAppTheme();
  const inset = useSafeAreaInsets();
  const { locale, direction } = useMobileLocalization();
  const copy = useMemo(() => carFilterCopy(locale), [locale]);
  const groups = useMemo(() => visibleCarFilterGroups(results), [results]);
  const active = activeCarFilterCount(filters);
  const matching = useMemo(() => filterCarResults(results, filters).length, [filters, results]);
  const filterCanvas = theme.dark ? theme.background : FLIGHT_FILTER_LIGHT_CANVAS;
  const filterOutline = theme.dark ? theme.border : FLIGHT_FILTER_LIGHT_OUTLINE;
  const [filterUpdating, setFilterUpdating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const markUpdating = () => { if (timer.current) clearTimeout(timer.current); setFilterUpdating(true); timer.current = setTimeout(() => setFilterUpdating(false), NATIVE_FILTER_SELECTION_FEEDBACK_MS); };
  useEffect(() => { if (!visible) setFilterUpdating(false); return () => { if (timer.current) clearTimeout(timer.current); }; }, [visible]);
  const toggle = (group: string, option: string) => { const selected = filters[group] ?? []; markUpdating(); onChange({ ...filters, [group]: selected.includes(option) ? selected.filter(value => value !== option) : [...selected, option] }); };
  const viewLabel = active ? `${copy.show} ${matching} ${matching === 1 ? copy.car : copy.cars}` : `${copy.show} ${results.length} ${results.length === 1 ? copy.car : copy.cars}`;
  const viewAction = <Pressable accessibilityRole="button" onPress={onClose} style={[styles.view, active > 0 && styles.flex]}>{filterUpdating ? <View style={styles.updating}><ActivityIndicator size="small" color="white"/><Text style={styles.viewText}>{copy.updatingFilters}</Text></View> : <Text style={styles.viewText}>{viewLabel}</Text>}</Pressable>;
  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} accessibilityViewIsModal>
    <View style={[styles.screen, { backgroundColor: filterCanvas, paddingTop: inset.top }]}>
      <View style={styles.header}><View style={styles.headerCopy}><Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{copy.filters}</Text>{active > 0 ? <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{active} {copy.applied}</Text> : null}</View><Pressable accessibilityRole="button" accessibilityLabel={copy.close} onPress={onClose} style={styles.close}><X size={22} color={theme.icon}/></Pressable></View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {groups.map(group => <View key={group.id} style={styles.section}><View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: theme.textPrimary, textAlign: direction === "rtl" ? "right" : "left", writingDirection: direction }]}>{carFilterGroupLabel(copy, group)}</Text></View><View>{group.options.map(option => { const selected = filters[group.id]?.includes(option.id) ?? false; return <Pressable key={option.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={`${carFilterOptionLabel(copy, option)}, ${option.count}`} onPress={() => toggle(group.id, option.id)} style={({ pressed }) => [styles.row, direction === "rtl" && styles.rtlRow, pressed && styles.pressed]}><View style={[styles.box, { borderColor: selected ? ui.blue : filterOutline, backgroundColor: selected ? ui.blue : "transparent" }]}>{selected ? <Check size={14} strokeWidth={3} color="white"/> : null}</View><Text style={[styles.rowLabel, { color: theme.textPrimary, textAlign: direction === "rtl" ? "right" : "left", writingDirection: direction }]}>{carFilterOptionLabel(copy, option)}</Text><Text style={[styles.count, { color: theme.textSecondary }]}>{option.count}</Text></Pressable>;})}</View></View>)}
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: filterCanvas, borderTopColor: theme.border, paddingBottom: Math.max(inset.bottom, 12) }]}>{active > 0 ? <View style={styles.footerActions}><Pressable accessibilityRole="button" accessibilityLabel="Reset car filters" onPress={() => { markUpdating(); onChange({}); }} style={[styles.reset, { borderColor: filterOutline }]}><Text style={[styles.resetText, { color: theme.textPrimary }]}>Reset</Text></Pressable>{viewAction}</View> : viewAction}</View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({screen:{flex:1},header:{minHeight:76,paddingLeft:20,paddingRight:10,flexDirection:"row",alignItems:"center"},headerCopy:{flex:1,minWidth:0},title:{fontSize:18,lineHeight:23,fontWeight:"700",fontFamily:appFonts.bold},subtitle:{fontSize:12,lineHeight:16,fontWeight:"500",fontFamily:appFonts.medium},close:{width:44,height:44,alignItems:"center",justifyContent:"center"},scroll:{flex:1},content:{paddingHorizontal:24,paddingTop:16,paddingBottom:32,gap:24},section:{gap:5},sectionHeader:{minHeight:28,justifyContent:"center"},sectionTitle:{fontSize:15,fontWeight:"800"},row:{minHeight:46,flexDirection:"row",alignItems:"center",gap:10},rtlRow:{flexDirection:"row-reverse"},pressed:{opacity:.7},box:{width:20,height:20,flexShrink:0,borderWidth:1.5,borderRadius:4,alignItems:"center",justifyContent:"center"},rowLabel:{flex:1,minWidth:0,fontSize:13,fontWeight:"500"},count:{flexShrink:0,maxWidth:"42%",marginLeft:2,textAlign:"right",fontSize:12,lineHeight:16,fontVariant:["tabular-nums"]},footer:{borderTopWidth:StyleSheet.hairlineWidth,paddingHorizontal:16,paddingTop:12},footerActions:{flexDirection:"row",alignItems:"center",gap:14},reset:{minWidth:116,height:49,borderWidth:1,borderRadius:12,alignItems:"center",justifyContent:"center"},resetText:{fontSize:15,fontWeight:"700",fontFamily:appFonts.bold},view:{width:"100%",minHeight:50,borderRadius:10,backgroundColor:ui.blue,alignItems:"center",justifyContent:"center"},flex:{width:"auto",flex:1},updating:{flexDirection:"row",alignItems:"center",gap:8},viewText:{color:"white",fontSize:16,lineHeight:22,fontWeight:"700",fontFamily:appFonts.bold}});
