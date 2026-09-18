import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { PickerSheetHeader, PrimaryButton } from "./FlowPrimitives";
import { useFlowTheme } from "./flowStyles";
import { localDateFromIso, localIsoDate } from "./localDateModel";
import { activeDateRangePart, selectDateRange } from "./dateRangeModel";
import { SEARCH_PICKER_BACKDROP_COLOR, useSearchPickerMotion } from "./searchPickerPresentation";
import { HotelResultsEditPickerShell } from "./HotelResultsEditPickerShell";

type Props = {
  visible: boolean; title: string; startLabel: string; endLabel: string;
  startDate: string; endDate: string; minimumStartDate: string;
  endMustBeAfterStart?: boolean;
  presentation?: "sheet" | "resultsEditFullScreen" | "embedded";
  appearance?: DateRangeSheetAppearance;
  backAccessibilityLabel?: string;
  onDone: (startDate: string, endDate: string) => void; onCancel: () => void;
  onDismiss?: () => void;
};

export type DateRangeSheetAppearance = "default" | "carsResultsEdit";

const FLIGHT_DATE_LOCALE = "en-US";

export function DateRangeSheet({ visible, title, startLabel, endLabel, startDate, endDate, minimumStartDate, endMustBeAfterStart = false, presentation = "sheet", appearance = "default", backAccessibilityLabel, onDone, onCancel, onDismiss }: Props) {
  const ft = useFlowTheme();
  const sheetVisible = presentation === "sheet" ? visible : false;
  const motion = useSearchPickerMotion(sheetVisible);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [monthOffset, setMonthOffset] = useState(0);
  const sheetWasPresented = useRef(false);
  const dismissNotified = useRef(false);
  const anchor = localDateFromIso(startDate) ?? localDateFromIso(minimumStartDate)!;
  useLayoutEffect(() => { if (visible) { setDraftStart(startDate); setDraftEnd(endDate); setMonthOffset(0); } }, [visible, startDate, endDate]);
  useEffect(() => {
    if (presentation !== "sheet") return;
    if (visible && motion.rendered) {
      sheetWasPresented.current = true;
      dismissNotified.current = false;
      return;
    }
    if (
      Platform.OS !== "ios"
      && !visible
      && !motion.rendered
      && sheetWasPresented.current
      && !dismissNotified.current
    ) {
      dismissNotified.current = true;
      sheetWasPresented.current = false;
      onDismiss?.();
    }
  }, [motion.rendered, onDismiss, presentation, visible]);
  const handleNativeDismiss = () => {
    if (
      Platform.OS !== "ios"
      || visible
      || motion.rendered
      || !sheetWasPresented.current
      || dismissNotified.current
    ) return;
    dismissNotified.current = true;
    sheetWasPresented.current = false;
    onDismiss?.();
  };
  const month = useMemo(() => new Date(anchor.getFullYear(), anchor.getMonth() + monthOffset, 1, 12), [startDate, minimumStartDate, monthOffset]);
  const leading = month.getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: leading + count }, (_, index) => index < leading ? undefined : new Date(month.getFullYear(), month.getMonth(), index - leading + 1, 12));
  const choose = (selected: string) => { const next = selectDateRange(draftStart, draftEnd, selected, endMustBeAfterStart); setDraftStart(next.startDate); setDraftEnd(next.endDate); };
  const minimumMonth = new Date(localDateFromIso(minimumStartDate)!.getFullYear(), localDateFromIso(minimumStartDate)!.getMonth(), 1, 12);
  const canGoBack = month.getTime() > minimumMonth.getTime();
  const valid = Boolean(draftStart && draftEnd && (endMustBeAfterStart ? draftEnd > draftStart : draftEnd >= draftStart));
  const activePart = activeDateRangePart(draftStart, draftEnd);
  const isCarsResultsEdit = appearance === "carsResultsEdit";
  const content = <>
    <View style={styles.rangeHeader}><RangeValue label={startLabel} value={draftStart} active={activePart === "start"} align="left" appearance={appearance}/><RangeValue label={endLabel} value={draftEnd} active={activePart === "end"} align="right" appearance={appearance}/></View>
    <View style={styles.monthRow}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" accessibilityState={{ disabled: !canGoBack }} disabled={!canGoBack} onPress={() => setMonthOffset(value => value - 1)} style={[styles.monthControl, { borderColor: ft.colors.border }, !canGoBack && styles.disabled]}><Text style={[styles.controlText, { color: ft.colors.text }]}>‹</Text></Pressable><Text accessibilityRole="header" style={[styles.month, isCarsResultsEdit && styles.resultsEditMonth, { color: ft.colors.text }]}>{month.toLocaleDateString(FLIGHT_DATE_LOCALE, { month: "long", year: "numeric" })}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonthOffset(value => value + 1)} style={[styles.monthControl, { borderColor: ft.colors.border }]}><Text style={[styles.controlText, { color: ft.colors.text }]}>›</Text></Pressable></View>
    <View style={styles.week}>{["S","M","T","W","T","F","S"].map((day,index) => <Text key={`${day}-${index}`} style={[styles.weekday, isCarsResultsEdit && styles.resultsEditWeekday, { color: ft.colors.secondaryText }]}>{day}</Text>)}</View>
    <View style={styles.grid}>{cells.map((date,index) => { if (!date) return <View key={`blank-${index}`} style={styles.day}/>; const iso=localIsoDate(date); const disabled=iso<minimumStartDate; const start=iso===draftStart; const end=iso===draftEnd; const inRange=Boolean(draftStart&&draftEnd&&iso>draftStart&&iso<draftEnd); const selected=start||end; const isToday=iso===localIsoDate(new Date()); return <Pressable key={iso} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString(FLIGHT_DATE_LOCALE,{dateStyle:"full"})} accessibilityState={{disabled,selected}} disabled={disabled} onPress={() => choose(iso)} style={[styles.day,inRange&&{backgroundColor:ft.colors.selected},!isCarsResultsEdit&&selected&&{backgroundColor:ft.colors.selectedBorder},!isCarsResultsEdit&&isToday&&!selected&&{borderColor:ft.colors.selectedBorder,borderWidth:1},disabled&&styles.disabled]}>{isCarsResultsEdit?<View style={[styles.resultsEditDayVisual,selected&&{backgroundColor:ft.colors.selectedBorder},isToday&&!selected&&{borderColor:ft.colors.selectedBorder,borderWidth:1}]}><Text style={[styles.resultsEditDayText,{color:selected?ft.colors.surface:ft.colors.text},selected&&styles.resultsEditSelectedText]}>{date.getDate()}</Text></View>:<Text style={[styles.dayText,{color:selected?ft.colors.surface:ft.colors.text},selected&&styles.selectedText]}>{date.getDate()}</Text>}</Pressable>; })}</View>
  </>;
  if (presentation === "embedded") {
    if (!visible) return null;
    return <View style={styles.embeddedSheet}>
      <PickerSheetHeader title={title} onClose={onCancel}/>
      {content}
      <PrimaryButton label="Done" icon={null} disabled={!valid} onPress={() => onDone(draftStart,draftEnd)}/>
    </View>;
  }
  if (presentation === "resultsEditFullScreen") return <HotelResultsEditPickerShell visible={visible} title={`Choose ${title.toLowerCase()}`} onBack={onCancel} backAccessibilityLabel={backAccessibilityLabel} footer={<PrimaryButton label="Done" icon={null} disabled={!valid} onPress={() => onDone(draftStart,draftEnd)}/>}>
    <View style={styles.fullScreenContent}>{content}</View>
  </HotelResultsEditPickerShell>;
  return <Modal transparent animationType="none" visible={motion.rendered} onRequestClose={onCancel} onDismiss={handleNativeDismiss}>
    <View pointerEvents={motion.pointerEvents} style={styles.modalRoot}><Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, styles.scrim, motion.backdropStyle]}/>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={`Cancel ${title.toLowerCase()} changes`} onPress={onCancel}/>
      <View style={styles.safeLayer} pointerEvents="box-none"><Animated.View accessibilityViewIsModal onLayout={motion.onSheetLayout} style={[styles.sheet, { backgroundColor: ft.colors.surface, paddingBottom: 16 + motion.bottomSafeAreaInset }, motion.sheetStyle]}>
        <PickerSheetHeader title={title} onClose={onCancel}/>
        {content}
        <PrimaryButton label="Done" icon={null} disabled={!valid} onPress={() => onDone(draftStart,draftEnd)}/>
      </Animated.View></View>
    </View>
  </Modal>;
}

function RangeValue({label,value,active,align,appearance}:{label:string;value:string;active:boolean;align:"left"|"right";appearance:DateRangeSheetAppearance}) { const ft=useFlowTheme(); const isRight=align==="right"; const isCarsResultsEdit=appearance==="carsResultsEdit"; const displayValue=value ? localDateFromIso(value)?.toLocaleDateString(FLIGHT_DATE_LOCALE,{weekday:"short",month:"short",day:"numeric"}) : "Select"; return <View style={styles.rangeValue} accessible accessibilityState={{selected:active}} accessibilityLabel={`${label}, ${displayValue}${active ? ", currently selecting" : ""}`}><Text style={[ft.styles.label,isCarsResultsEdit&&styles.resultsEditRangeLabel,isRight?styles.rangeTextRight:styles.rangeTextLeft]}>{label}</Text><View style={[styles.valueIndicator,isRight?styles.valueIndicatorRight:styles.valueIndicatorLeft,{borderBottomColor:active?ft.colors.selectedBorder:"transparent"}]}><Text style={[ft.styles.value,isCarsResultsEdit&&styles.resultsEditRangeValue,isRight?styles.rangeTextRight:styles.rangeTextLeft]}>{displayValue}</Text></View></View>; }

const styles=StyleSheet.create({modalRoot:{flex:1,justifyContent:"flex-end"},scrim:{backgroundColor:SEARCH_PICKER_BACKDROP_COLOR},safeLayer:{flex:1,justifyContent:"flex-end"},fullScreenContent:{flex:1,paddingHorizontal:16,paddingTop:16,gap:14},embeddedSheet:{gap:10},sheet:{borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,gap:10,maxHeight:"94%"},rangeHeader:{flexDirection:"row",gap:12},rangeValue:{flex:1,minWidth:0,padding:10},rangeTextLeft:{textAlign:"left"},rangeTextRight:{textAlign:"right"},resultsEditRangeLabel:{fontSize:10,lineHeight:14,fontWeight:"600"},resultsEditRangeValue:{fontSize:13,lineHeight:18,fontWeight:"500"},valueIndicator:{borderBottomWidth:1,paddingBottom:2},valueIndicatorLeft:{alignSelf:"flex-start"},valueIndicatorRight:{alignSelf:"flex-end"},monthRow:{minHeight:48,flexDirection:"row",alignItems:"center",gap:4},month:{flex:1,textAlign:"center",fontSize:18,fontWeight:"800"},resultsEditMonth:{fontSize:16,lineHeight:20,fontWeight:"600"},monthControl:{width:44,height:44,borderRadius:22,borderWidth:1,alignItems:"center",justifyContent:"center"},controlText:{fontSize:25},week:{flexDirection:"row"},weekday:{width:"14.285%",textAlign:"center",fontSize:11},resultsEditWeekday:{fontSize:10,lineHeight:14,fontWeight:"500"},grid:{flexDirection:"row",flexWrap:"wrap"},day:{width:"14.285%",minHeight:44,alignItems:"center",justifyContent:"center",borderRadius:8},dayText:{fontSize:13},selectedText:{fontWeight:"800"},resultsEditDayVisual:{width:32,height:32,borderRadius:8,alignItems:"center",justifyContent:"center"},resultsEditDayText:{fontSize:12,lineHeight:16,fontWeight:"400"},resultsEditSelectedText:{fontWeight:"600"},disabled:{opacity:.35}});
