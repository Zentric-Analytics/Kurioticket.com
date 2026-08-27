import { useEffect, useMemo, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PickerSheetHeader, PrimaryButton } from "./FlowPrimitives";
import { useFlowTheme } from "./flowStyles";
import { localDateFromIso, localIsoDate } from "./localDateModel";
import { activeDateRangePart, selectDateRange } from "./dateRangeModel";
import { SEARCH_PICKER_BACKDROP_COLOR, useSearchPickerMotion } from "./searchPickerPresentation";

type Props = {
  visible: boolean; title: string; startLabel: string; endLabel: string;
  startDate: string; endDate: string; minimumStartDate: string;
  endMustBeAfterStart?: boolean;
  onDone: (startDate: string, endDate: string) => void; onCancel: () => void;
};

const FLIGHT_DATE_LOCALE = "en-US";

export function DateRangeSheet({ visible, title, startLabel, endLabel, startDate, endDate, minimumStartDate, endMustBeAfterStart = false, onDone, onCancel }: Props) {
  const ft = useFlowTheme();
  const motion = useSearchPickerMotion(visible);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);
  const anchor = localDateFromIso(startDate) ?? localDateFromIso(minimumStartDate)!;
  useEffect(() => { if (visible) { setDraftStart(startDate); setDraftEnd(endDate); setMonthOffset(0); } }, [visible, startDate, endDate]);
  const month = useMemo(() => new Date(anchor.getFullYear(), anchor.getMonth() + monthOffset, 1, 12), [startDate, minimumStartDate, monthOffset]);
  if (!motion.rendered) return null;
  const leading = month.getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: leading + count }, (_, index) => index < leading ? undefined : new Date(month.getFullYear(), month.getMonth(), index - leading + 1, 12));
  const choose = (selected: string) => { const next = selectDateRange(draftStart, draftEnd, selected, endMustBeAfterStart); setDraftStart(next.startDate); setDraftEnd(next.endDate); };
  const minimumMonth = new Date(localDateFromIso(minimumStartDate)!.getFullYear(), localDateFromIso(minimumStartDate)!.getMonth(), 1, 12);
  const canGoBack = month.getTime() > minimumMonth.getTime();
  const valid = Boolean(draftStart && draftEnd && (endMustBeAfterStart ? draftEnd > draftStart : draftEnd >= draftStart));
  const activePart = activeDateRangePart(draftStart, draftEnd);
  return <Modal transparent animationType="none" visible onRequestClose={onCancel}>
    <View style={styles.modalRoot}><Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, styles.scrim, motion.backdropStyle]}/>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={`Cancel ${title.toLowerCase()} changes`} onPress={onCancel}/>
      <SafeAreaView edges={["bottom"]} style={styles.safeLayer} pointerEvents="box-none"><Animated.View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: ft.colors.surface }, motion.sheetStyle]}>
        <PickerSheetHeader title={title} onClose={onCancel}/>
        <View style={styles.rangeHeader}><RangeValue label={startLabel} value={draftStart} active={activePart === "start"} align="left"/><RangeValue label={endLabel} value={draftEnd} active={activePart === "end"} align="right"/></View>
        <View style={styles.monthRow}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" accessibilityState={{ disabled: !canGoBack }} disabled={!canGoBack} onPress={() => setMonthOffset(value => value - 1)} style={[styles.monthControl, { borderColor: ft.colors.border }, !canGoBack && styles.disabled]}><Text style={[styles.controlText, { color: ft.colors.text }]}>‹</Text></Pressable><Text accessibilityRole="header" style={[styles.month, { color: ft.colors.text }]}>{month.toLocaleDateString(FLIGHT_DATE_LOCALE, { month: "long", year: "numeric" })}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonthOffset(value => value + 1)} style={[styles.monthControl, { borderColor: ft.colors.border }]}><Text style={[styles.controlText, { color: ft.colors.text }]}>›</Text></Pressable></View>
        <View style={styles.week}>{["S","M","T","W","T","F","S"].map((day,index) => <Text key={`${day}-${index}`} style={[styles.weekday, { color: ft.colors.secondaryText }]}>{day}</Text>)}</View>
        <View style={styles.grid}>{cells.map((date,index) => { if (!date) return <View key={`blank-${index}`} style={styles.day}/>; const iso=localIsoDate(date); const disabled=iso<minimumStartDate; const start=iso===draftStart; const end=iso===draftEnd; const inRange=Boolean(draftStart&&draftEnd&&iso>draftStart&&iso<draftEnd); const selected=start||end; const isToday=iso===localIsoDate(new Date()); return <Pressable key={iso} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString(FLIGHT_DATE_LOCALE,{dateStyle:"full"})} accessibilityState={{disabled,selected}} disabled={disabled} onPress={() => choose(iso)} style={[styles.day,inRange&&{backgroundColor:ft.colors.selected},selected&&{backgroundColor:ft.colors.selectedBorder},isToday&&!selected&&{borderColor:ft.colors.selectedBorder,borderWidth:1},disabled&&styles.disabled]}><Text style={[styles.dayText,{color:selected?ft.colors.surface:ft.colors.text},selected&&styles.selectedText]}>{date.getDate()}</Text></Pressable>; })}</View>
        <PrimaryButton label="Done" icon={null} disabled={!valid} onPress={() => onDone(draftStart,draftEnd)}/>
      </Animated.View></SafeAreaView>
    </View>
  </Modal>;
}

function RangeValue({label,value,active,align}:{label:string;value:string;active:boolean;align:"left"|"right"}) { const ft=useFlowTheme(); const isRight=align==="right"; const displayValue=value ? localDateFromIso(value)?.toLocaleDateString(FLIGHT_DATE_LOCALE,{weekday:"short",month:"short",day:"numeric"}) : "Select"; return <View style={styles.rangeValue} accessible accessibilityState={{selected:active}} accessibilityLabel={`${label}, ${displayValue}${active ? ", currently selecting" : ""}`}><Text style={[ft.styles.label,isRight?styles.rangeTextRight:styles.rangeTextLeft]}>{label}</Text><View style={[styles.valueIndicator,isRight?styles.valueIndicatorRight:styles.valueIndicatorLeft,{borderBottomColor:active?ft.colors.selectedBorder:"transparent"}]}><Text style={[ft.styles.value,isRight?styles.rangeTextRight:styles.rangeTextLeft]}>{displayValue}</Text></View></View>; }

const styles=StyleSheet.create({modalRoot:{flex:1,justifyContent:"flex-end"},scrim:{backgroundColor:SEARCH_PICKER_BACKDROP_COLOR},safeLayer:{flex:1,justifyContent:"flex-end"},sheet:{borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,gap:10,maxHeight:"94%"},rangeHeader:{flexDirection:"row",gap:12},rangeValue:{flex:1,minWidth:0,padding:10},rangeTextLeft:{textAlign:"left"},rangeTextRight:{textAlign:"right"},valueIndicator:{borderBottomWidth:1,paddingBottom:2},valueIndicatorLeft:{alignSelf:"flex-start"},valueIndicatorRight:{alignSelf:"flex-end"},monthRow:{minHeight:48,flexDirection:"row",alignItems:"center",gap:4},month:{flex:1,textAlign:"center",fontSize:18,fontWeight:"800"},monthControl:{width:44,height:44,borderRadius:22,borderWidth:1,alignItems:"center",justifyContent:"center"},controlText:{fontSize:25},week:{flexDirection:"row"},weekday:{width:"14.285%",textAlign:"center",fontSize:11},grid:{flexDirection:"row",flexWrap:"wrap"},day:{width:"14.285%",minHeight:44,alignItems:"center",justifyContent:"center",borderRadius:8},dayText:{fontSize:13},selectedText:{fontWeight:"800"},disabled:{opacity:.35}});
