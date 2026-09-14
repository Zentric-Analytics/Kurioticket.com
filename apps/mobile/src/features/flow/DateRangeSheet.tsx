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
  backAccessibilityLabel?: string;
  locale?: string; doneLabel?: string; selectLabel?: string; previousMonthLabel?: string; nextMonthLabel?: string; chooseTitle?: string; cancelChangesLabel?: string; currentlySelectingLabel?: string;
  onDone: (startDate: string, endDate: string) => void; onCancel: () => void;
  onDismiss?: () => void;
};

const DEFAULT_DATE_LOCALE = "en-US";

export function DateRangeSheet({ visible, title, startLabel, endLabel, startDate, endDate, minimumStartDate, endMustBeAfterStart = false, presentation = "sheet", backAccessibilityLabel, locale = DEFAULT_DATE_LOCALE, doneLabel = "Done", selectLabel = "Select", previousMonthLabel = "Previous month", nextMonthLabel = "Next month", chooseTitle, cancelChangesLabel, currentlySelectingLabel = "currently selecting", onDone, onCancel, onDismiss }: Props) {
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
    if (Platform.OS !== "ios" && !visible && !motion.rendered && sheetWasPresented.current && !dismissNotified.current) {
      dismissNotified.current = true;
      sheetWasPresented.current = false;
      onDismiss?.();
    }
  }, [motion.rendered, onDismiss, presentation, visible]);
  const handleNativeDismiss = () => {
    if (Platform.OS !== "ios" || visible || motion.rendered || !sheetWasPresented.current || dismissNotified.current) return;
    dismissNotified.current = true;
    sheetWasPresented.current = false;
    onDismiss?.();
  };
  const month = useMemo(() => new Date(anchor.getFullYear(), anchor.getMonth() + monthOffset, 1, 12), [startDate, minimumStartDate, monthOffset]);
  const leading = month.getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: leading + count }, (_, index) => index < leading ? undefined : new Date(month.getFullYear(), month.getMonth(), index - leading + 1, 12));
  const weekdays=useMemo(()=>Array.from({length:7},(_,index)=>new Intl.DateTimeFormat(locale,{weekday:"narrow"}).format(new Date(2024,0,7+index))),[locale]);
  const choose = (selected: string) => { const next = selectDateRange(draftStart, draftEnd, selected, endMustBeAfterStart); setDraftStart(next.startDate); setDraftEnd(next.endDate); };
  const minimumMonth = new Date(localDateFromIso(minimumStartDate)!.getFullYear(), localDateFromIso(minimumStartDate)!.getMonth(), 1, 12);
  const canGoBack = month.getTime() > minimumMonth.getTime();
  const valid = Boolean(draftStart && draftEnd && (endMustBeAfterStart ? draftEnd > draftStart : draftEnd >= draftStart));
  const activePart = activeDateRangePart(draftStart, draftEnd);
  const content = <>
    <View style={styles.rangeHeader}><RangeValue label={startLabel} value={draftStart} active={activePart === "start"} align="left" locale={locale} selectLabel={selectLabel} currentlySelectingLabel={currentlySelectingLabel}/><RangeValue label={endLabel} value={draftEnd} active={activePart === "end"} align="right" locale={locale} selectLabel={selectLabel} currentlySelectingLabel={currentlySelectingLabel}/></View>
    <View style={styles.monthRow}><Pressable accessibilityRole="button" accessibilityLabel={previousMonthLabel} accessibilityState={{ disabled: !canGoBack }} disabled={!canGoBack} onPress={() => setMonthOffset(value => value - 1)} style={[styles.monthControl, { borderColor: ft.colors.border }, !canGoBack && styles.disabled]}><Text style={[styles.controlText, { color: ft.colors.text }]}>‹</Text></Pressable><Text accessibilityRole="header" style={[styles.month, { color: ft.colors.text }]}>{month.toLocaleDateString(locale, { month: "long", year: "numeric" })}</Text><Pressable accessibilityRole="button" accessibilityLabel={nextMonthLabel} onPress={() => setMonthOffset(value => value + 1)} style={[styles.monthControl, { borderColor: ft.colors.border }]}><Text style={[styles.controlText, { color: ft.colors.text }]}>›</Text></Pressable></View>
    <View style={styles.week}>{weekdays.map((day,index) => <Text key={`${day}-${index}`} style={[styles.weekday, { color: ft.colors.secondaryText }]}>{day}</Text>)}</View>
    <View style={styles.grid}>{cells.map((date,index) => { if (!date) return <View key={`blank-${index}`} style={styles.day}/>; const iso=localIsoDate(date); const disabled=iso<minimumStartDate; const start=iso===draftStart; const end=iso===draftEnd; const inRange=Boolean(draftStart&&draftEnd&&iso>draftStart&&iso<draftEnd); const selected=start||end; const isToday=iso===localIsoDate(new Date()); return <Pressable key={iso} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString(locale,{dateStyle:"full"})} accessibilityState={{disabled,selected}} disabled={disabled} onPress={() => choose(iso)} style={[styles.day,inRange&&{backgroundColor:ft.colors.selected},selected&&{backgroundColor:ft.colors.selectedBorder},isToday&&!selected&&{borderColor:ft.colors.selectedBorder,borderWidth:1},disabled&&styles.disabled]}><Text style={[styles.dayText,{color:selected?ft.colors.surface:ft.colors.text},selected&&styles.selectedText]}>{date.getDate()}</Text></Pressable>; })}</View>
  </>;
  if (presentation === "embedded") {
    if (!visible) return null;
    return <View style={styles.embeddedSheet}><PickerSheetHeader title={title} onClose={onCancel}/>{content}<PrimaryButton label={doneLabel} icon={null} disabled={!valid} onPress={() => onDone(draftStart,draftEnd)}/></View>;
  }
  if (presentation === "resultsEditFullScreen") return <HotelResultsEditPickerShell visible={visible} title={chooseTitle ?? title} onBack={onCancel} backAccessibilityLabel={backAccessibilityLabel} footer={<PrimaryButton label={doneLabel} icon={null} disabled={!valid} onPress={() => onDone(draftStart,draftEnd)}/>}><View style={styles.fullScreenContent}>{content}</View></HotelResultsEditPickerShell>;
  return <Modal transparent animationType="none" visible={motion.rendered} onRequestClose={onCancel} onDismiss={handleNativeDismiss}>
    <View pointerEvents={motion.pointerEvents} style={styles.modalRoot}><Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, styles.scrim, motion.backdropStyle]}/>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={cancelChangesLabel ?? `Cancel ${title.toLowerCase()} changes`} onPress={onCancel}/>
      <View style={styles.safeLayer} pointerEvents="box-none"><Animated.View accessibilityViewIsModal onLayout={motion.onSheetLayout} style={[styles.sheet, { backgroundColor: ft.colors.surface, paddingBottom: 16 + motion.bottomSafeAreaInset }, motion.sheetStyle]}><PickerSheetHeader title={title} onClose={onCancel}/>{content}<PrimaryButton label={doneLabel} icon={null} disabled={!valid} onPress={() => onDone(draftStart,draftEnd)}/></Animated.View></View>
    </View>
  </Modal>;
}

function RangeValue({label,value,active,align,locale,selectLabel,currentlySelectingLabel}:{label:string;value:string;active:boolean;align:"left"|"right";locale:string;selectLabel:string;currentlySelectingLabel:string}) { const ft=useFlowTheme(); const isRight=align==="right"; const displayValue=value ? localDateFromIso(value)?.toLocaleDateString(locale,{weekday:"short",month:"short",day:"numeric"}) : selectLabel; return <View style={styles.rangeValue} accessible accessibilityState={{selected:active}} accessibilityLabel={`${label}, ${displayValue}${active ? `, ${currentlySelectingLabel}` : ""}`}><Text style={[ft.styles.label,isRight?styles.rangeTextRight:styles.rangeTextLeft]}>{label}</Text><View style={[styles.valueIndicator,isRight?styles.valueIndicatorRight:styles.valueIndicatorLeft,{borderBottomColor:active?ft.colors.selectedBorder:"transparent"}]}><Text style={[ft.styles.value,isRight?styles.rangeTextRight:styles.rangeTextLeft]}>{displayValue}</Text></View></View>; }

const styles=StyleSheet.create({modalRoot:{flex:1,justifyContent:"flex-end"},scrim:{backgroundColor:SEARCH_PICKER_BACKDROP_COLOR},safeLayer:{flex:1,justifyContent:"flex-end"},fullScreenContent:{flex:1,paddingHorizontal:16,paddingTop:16,gap:14},embeddedSheet:{gap:10},sheet:{borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,gap:10,maxHeight:"94%"},rangeHeader:{flexDirection:"row",gap:12},rangeValue:{flex:1,minWidth:0,padding:10},rangeTextLeft:{textAlign:"left"},rangeTextRight:{textAlign:"right"},valueIndicator:{borderBottomWidth:1,paddingBottom:2},valueIndicatorLeft:{alignSelf:"flex-start"},valueIndicatorRight:{alignSelf:"flex-end"},monthRow:{minHeight:48,flexDirection:"row",alignItems:"center",gap:4},month:{flex:1,textAlign:"center",fontSize:18,fontWeight:"800"},monthControl:{width:44,height:44,borderRadius:22,borderWidth:1,alignItems:"center",justifyContent:"center"},controlText:{fontSize:25},week:{flexDirection:"row"},weekday:{width:"14.285%",textAlign:"center",fontSize:11},grid:{flexDirection:"row",flexWrap:"wrap"},day:{width:"14.285%",minHeight:44,alignItems:"center",justifyContent:"center",borderRadius:8},dayText:{fontSize:13},selectedText:{fontWeight:"800"},disabled:{opacity:.35}});
