import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlowIcon } from "./FlowIcon";
import { PrimaryButton } from "./FlowPrimitives";
import { useFlowTheme } from "./flowStyles";
import { localDateFromIso, localIsoDate } from "./localDateModel";
import { formatTime, selectRentalRangeDate, timeOptions } from "./carSearchModel";

export function CarRentalDatesSheet({ visible, pickupDate, returnDate, onDone, onCancel }: { visible: boolean; pickupDate: string; returnDate: string; onDone: (pickupDate: string, returnDate: string) => void; onCancel: () => void }) {
  const ft = useFlowTheme();
  const today = localIsoDate(new Date());
  const [draftPickup, setDraftPickup] = useState("");
  const [draftReturn, setDraftReturn] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);
  const anchor = localDateFromIso(pickupDate) ?? localDateFromIso(today)!;
  useEffect(() => { if (visible) { setDraftPickup(pickupDate); setDraftReturn(returnDate); setMonthOffset(0); } }, [visible, pickupDate, returnDate]);
  const month = useMemo(() => new Date(anchor.getFullYear(), anchor.getMonth() + monthOffset, 1, 12), [pickupDate, today, monthOffset]);
  if (!visible) return null;
  const leading = month.getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: leading + count }, (_, index) => index < leading ? undefined : new Date(month.getFullYear(), month.getMonth(), index - leading + 1, 12));
  const choose = (selected: string) => { const next = selectRentalRangeDate(draftPickup, draftReturn, selected); setDraftPickup(next.pickupDate); setDraftReturn(next.returnDate); };
  const todayMonth = new Date(localDateFromIso(today)!.getFullYear(), localDateFromIso(today)!.getMonth(), 1, 12);
  const canGoBack = month.getTime() > todayMonth.getTime();
  return <Modal transparent animationType="slide" visible onRequestClose={onCancel}>
    <View style={styles.modalRoot}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: ft.colors.overlay }]} accessibilityRole="button" accessibilityLabel="Cancel rental date changes" onPress={onCancel}/>
      <SafeAreaView edges={["bottom"]} style={styles.safeLayer} pointerEvents="box-none"><View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: ft.colors.surface }]}>
        <Text accessibilityRole="header" style={ft.styles.title}>Rental dates</Text>
        <View style={styles.rangeHeader}><RangeValue label="Pick-up date" value={draftPickup} /><RangeValue label="Return date" value={draftReturn} /></View>
        <View style={styles.monthRow}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" accessibilityState={{disabled:!canGoBack}} disabled={!canGoBack} onPress={() => setMonthOffset((value) => value - 1)} style={[styles.monthControl,!canGoBack&&styles.disabled]}><Text style={[styles.controlText,{color:ft.colors.text}]}>‹</Text></Pressable><Text accessibilityRole="header" style={[styles.month,{color:ft.colors.text}]}>{month.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonthOffset((value) => value + 1)} style={[styles.monthControl,{borderColor:ft.colors.border}]}><Text style={[styles.controlText,{color:ft.colors.text}]}>›</Text></Pressable></View>
        <View style={styles.week}>{["S","M","T","W","T","F","S"].map((day,index)=><Text key={`${day}-${index}`} style={[styles.weekday,{color:ft.colors.secondaryText}]}>{day}</Text>)}</View>
        <View style={styles.grid}>{cells.map((date,index)=>{ if(!date)return <View key={`blank-${index}`} style={styles.day}/>; const iso=localIsoDate(date); const disabled=iso<today; const start=iso===draftPickup; const end=iso===draftReturn; const inRange=Boolean(draftPickup&&draftReturn&&iso>draftPickup&&iso<draftReturn); const selected=start||end; const isToday=iso===today; return <Pressable key={iso} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString(undefined,{dateStyle:"full"})} accessibilityState={{disabled,selected}} disabled={disabled} onPress={()=>choose(iso)} style={[styles.day,inRange&&{backgroundColor:ft.colors.selected},selected&&{backgroundColor:ft.colors.selectedBorder},isToday&&!selected&&{borderColor:ft.colors.selectedBorder,borderWidth:1},disabled&&styles.disabled]}><Text style={[styles.dayText,{color:selected?"white":ft.colors.text},selected&&styles.selectedText]}>{date.getDate()}</Text></Pressable>;})}</View>
        <PrimaryButton label="Done" icon="check" disabled={!draftPickup||!draftReturn} onPress={()=>onDone(draftPickup,draftReturn)}/>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}><Text style={[styles.link,{color:ft.colors.selectedBorder}]}>Cancel</Text></Pressable>
      </View></SafeAreaView>
    </View>
  </Modal>;
}

function RangeValue({label,value}:{label:string;value:string}) { const ft=useFlowTheme(); return <View style={styles.rangeValue}><Text style={ft.styles.label}>{label}</Text><Text style={ft.styles.value}>{value ? localDateFromIso(value)?.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}) : "Select"}</Text></View>; }

export function CarTimeRangeSheet({ visible, pickupTime, returnTime, onDone, onCancel }: { visible: boolean; pickupTime: string; returnTime: string; onDone: (pickupTime: string, returnTime: string) => void; onCancel: () => void }) {
  const ft=useFlowTheme(); const [draftPickup,setDraftPickup]=useState(""); const [draftReturn,setDraftReturn]=useState("");
  useEffect(()=>{if(visible){setDraftPickup(pickupTime);setDraftReturn(returnTime);}},[visible,pickupTime,returnTime]);
  if(!visible)return null;
  return <Modal transparent animationType="slide" visible onRequestClose={onCancel}><View style={styles.modalRoot}><Pressable style={[StyleSheet.absoluteFill,{backgroundColor:ft.colors.overlay}]} accessibilityRole="button" accessibilityLabel="Cancel time changes" onPress={onCancel}/><SafeAreaView edges={["bottom"]} style={styles.safeLayer} pointerEvents="box-none"><View accessibilityViewIsModal style={[styles.sheet,styles.timeSheet,{backgroundColor:ft.colors.surface}]}><Text accessibilityRole="header" style={ft.styles.title}>Pick-up / Return time</Text><View style={styles.timeColumns}><TimeColumn label="Pick-up time" selected={draftPickup} onSelect={setDraftPickup}/><TimeColumn label="Return time" selected={draftReturn} onSelect={setDraftReturn}/></View><PrimaryButton label="Done" icon="check" disabled={!draftPickup||!draftReturn} onPress={()=>onDone(draftPickup,draftReturn)}/><Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}><Text style={[styles.link,{color:ft.colors.selectedBorder}]}>Cancel</Text></Pressable></View></SafeAreaView></View></Modal>;
}

function TimeColumn({label,selected,onSelect}:{label:string;selected:string;onSelect:(time:string)=>void}) { const ft=useFlowTheme(); return <View style={styles.timeColumn}><Text style={[ft.styles.label,styles.timeLabel]}>{label}</Text><ScrollView accessibilityLabel={`${label} options`} nestedScrollEnabled>{timeOptions.map(time=>{const chosen=time===selected;return <Pressable key={time} accessibilityRole="button" accessibilityState={{selected:chosen}} accessibilityLabel={`${formatTime(time)}${chosen?", selected":""}`} onPress={()=>onSelect(time)} style={[styles.timeChoice,{borderBottomColor:ft.colors.border},chosen&&{backgroundColor:ft.colors.selected,borderLeftColor:ft.colors.selectedBorder}]}><Text style={[ft.styles.value,chosen&&{color:ft.colors.selectedPrimaryText}]}>{formatTime(time)}</Text>{chosen?<FlowIcon name="check" size={17} color={ft.colors.selectedBorder}/>:null}</Pressable>;})}</ScrollView></View>; }

const styles=StyleSheet.create({modalRoot:{flex:1,justifyContent:"flex-end"},safeLayer:{flex:1,justifyContent:"flex-end"},sheet:{borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,gap:10,maxHeight:"94%"},rangeHeader:{flexDirection:"row",gap:12},rangeValue:{flex:1,minWidth:0,padding:10},monthRow:{minHeight:48,flexDirection:"row",alignItems:"center",gap:4},month:{flex:1,textAlign:"center",fontSize:18,fontWeight:"800"},monthControl:{width:44,height:44,borderRadius:22,borderWidth:1,alignItems:"center",justifyContent:"center"},controlText:{fontSize:25},week:{flexDirection:"row"},weekday:{width:"14.285%",textAlign:"center",fontSize:11},grid:{flexDirection:"row",flexWrap:"wrap"},day:{width:"14.285%",minHeight:44,alignItems:"center",justifyContent:"center",borderRadius:8},dayText:{fontSize:13},selectedText:{fontWeight:"800"},disabled:{opacity:.35},cancel:{minHeight:44,alignItems:"center",justifyContent:"center"},link:{fontWeight:"800"},timeSheet:{height:"82%"},timeColumns:{flex:1,flexDirection:"row",gap:10,minHeight:0},timeColumn:{flex:1,minWidth:0},timeLabel:{fontSize:12,paddingVertical:8},timeChoice:{minHeight:50,borderBottomWidth:1,borderLeftWidth:3,paddingHorizontal:8,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:4}});
