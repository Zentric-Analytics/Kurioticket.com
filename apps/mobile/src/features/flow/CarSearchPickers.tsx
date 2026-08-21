import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlowIcon } from "./FlowIcon";
import { PrimaryButton } from "./FlowPrimitives";
import { useFlowTheme } from "./flowStyles";
import { localIsoDate } from "./localDateModel";
import { formatTime, timeOptions } from "./carSearchModel";
import { DateRangeSheet } from "./DateRangeSheet";

export function CarRentalDatesSheet({ visible, pickupDate, returnDate, title = "Rental dates", onDone, onCancel }: { visible: boolean; pickupDate: string; returnDate: string; title?: string; onDone: (pickupDate: string, returnDate: string) => void; onCancel: () => void }) {
  return <DateRangeSheet visible={visible} title={title} startLabel="Pick-up date" endLabel="Return date" startDate={pickupDate} endDate={returnDate} minimumStartDate={localIsoDate(new Date())} onDone={onDone} onCancel={onCancel}/>;
}

export function CarTimeRangeSheet({ visible, pickupTime, returnTime, onDone, onCancel }: { visible: boolean; pickupTime: string; returnTime: string; onDone: (pickupTime: string, returnTime: string) => void; onCancel: () => void }) {
  const ft=useFlowTheme(); const [draftPickup,setDraftPickup]=useState(""); const [draftReturn,setDraftReturn]=useState("");
  useEffect(()=>{if(visible){setDraftPickup(pickupTime);setDraftReturn(returnTime);}},[visible,pickupTime,returnTime]);
  if(!visible)return null;
  return <Modal transparent animationType="slide" visible onRequestClose={onCancel}><View style={styles.modalRoot}><Pressable style={[StyleSheet.absoluteFill,{backgroundColor:ft.colors.overlay}]} accessibilityRole="button" accessibilityLabel="Cancel time changes" onPress={onCancel}/><SafeAreaView edges={["bottom"]} style={styles.safeLayer} pointerEvents="box-none"><View accessibilityViewIsModal style={[styles.sheet,styles.timeSheet,{backgroundColor:ft.colors.surface}]}><Text accessibilityRole="header" style={ft.styles.title}>Pick-up / Return time</Text><View style={styles.timeColumns}><TimeColumn label="Pick-up time" selected={draftPickup} onSelect={setDraftPickup}/><TimeColumn label="Return time" selected={draftReturn} onSelect={setDraftReturn}/></View><PrimaryButton label="Done" icon="check" disabled={!draftPickup||!draftReturn} onPress={()=>onDone(draftPickup,draftReturn)}/><Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}><Text style={[styles.link,{color:ft.colors.selectedBorder}]}>Cancel</Text></Pressable></View></SafeAreaView></View></Modal>;
}

function TimeColumn({label,selected,onSelect}:{label:string;selected:string;onSelect:(time:string)=>void}) { const ft=useFlowTheme(); return <View style={styles.timeColumn}><Text style={[ft.styles.label,styles.timeLabel]}>{label}</Text><ScrollView accessibilityLabel={`${label} options`} nestedScrollEnabled>{timeOptions.map(time=>{const chosen=time===selected;return <Pressable key={time} accessibilityRole="button" accessibilityState={{selected:chosen}} accessibilityLabel={`${formatTime(time)}${chosen?", selected":""}`} onPress={()=>onSelect(time)} style={[styles.timeChoice,{borderBottomColor:ft.colors.border},chosen&&{backgroundColor:ft.colors.selected}]}><Text style={[ft.styles.value,chosen&&{color:ft.colors.selectedPrimaryText}]}>{formatTime(time)}</Text>{chosen?<FlowIcon name="check" size={17} color={ft.colors.selectedBorder}/>:null}</Pressable>;})}</ScrollView></View>; }

const styles=StyleSheet.create({modalRoot:{flex:1,justifyContent:"flex-end"},safeLayer:{flex:1,justifyContent:"flex-end"},sheet:{borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,gap:10,maxHeight:"94%"},rangeHeader:{flexDirection:"row",gap:12},rangeValue:{flex:1,minWidth:0,padding:10},monthRow:{minHeight:48,flexDirection:"row",alignItems:"center",gap:4},month:{flex:1,textAlign:"center",fontSize:18,fontWeight:"800"},monthControl:{width:44,height:44,borderRadius:22,borderWidth:1,alignItems:"center",justifyContent:"center"},controlText:{fontSize:25},week:{flexDirection:"row"},weekday:{width:"14.285%",textAlign:"center",fontSize:11},grid:{flexDirection:"row",flexWrap:"wrap"},day:{width:"14.285%",minHeight:44,alignItems:"center",justifyContent:"center",borderRadius:8},dayText:{fontSize:13},selectedText:{fontWeight:"800"},disabled:{opacity:.35},cancel:{minHeight:44,alignItems:"center",justifyContent:"center"},link:{fontWeight:"800"},timeSheet:{height:"82%"},timeColumns:{flex:1,flexDirection:"row",gap:10,minHeight:0},timeColumn:{flex:1,minWidth:0},timeLabel:{fontSize:12,paddingVertical:8},timeChoice:{minHeight:50,borderBottomWidth:1,paddingHorizontal:8,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:4}});
