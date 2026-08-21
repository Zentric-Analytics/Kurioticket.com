import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFlowTheme } from "./flowStyles";
import { localDateFromIso, localIsoDate } from "./localDateModel";

type LocalCalendarModalProps = { visible: boolean; title: string; selected: string; minimum: string; onChoose: (iso: string) => void; onClose: () => void; dismissOnBackdropPress?: boolean };

export function LocalCalendarModal({ visible, title, selected, minimum, onChoose, onClose, dismissOnBackdropPress = false }: LocalCalendarModalProps) {
  const ft = useFlowTheme();
  const selectedDate = localDateFromIso(selected) ?? new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  useEffect(() => { if (visible) setMonthOffset(0); }, [visible, selected]);
  const month = useMemo(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth() + monthOffset, 1, 12), [selected, monthOffset]);
  if (!visible) return null;
  const leading = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: leading + days }, (_, index) => index < leading ? undefined : new Date(month.getFullYear(), month.getMonth(), index - leading + 1, 12));
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.overlay}>
    {dismissOnBackdropPress ? <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: ft.colors.overlay }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close calendar"/> : <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: ft.colors.overlay }]}/>}<View accessibilityViewIsModal style={[styles.modal, { backgroundColor: ft.colors.surface }]}>
    <Text accessibilityRole="header" style={ft.styles.title}>{title}</Text>
    <View style={styles.monthRow}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonthOffset((v) => v - 1)} style={[styles.control, { borderColor: ft.colors.border }]}><Text style={[styles.controlText, { color: ft.colors.icon }]}>‹</Text></Pressable><Text accessibilityRole="header" style={[styles.month, { color: ft.colors.text }]}>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonthOffset((v) => v + 1)} style={[styles.control, { borderColor: ft.colors.border }]}><Text style={[styles.controlText, { color: ft.colors.icon }]}>›</Text></Pressable></View>
    <View style={styles.week}>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => <Text key={day} style={[styles.weekday, { color: ft.colors.secondaryText }]}>{day}</Text>)}</View>
    <View style={styles.grid}>{cells.map((date, index) => { if (!date) return <View key={`blank-${index}`} style={styles.day}/>; const iso = localIsoDate(date); const disabled = iso < minimum; const chosen = iso === selected; return <Pressable key={iso} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString(undefined, { dateStyle: "full" })} accessibilityState={{ disabled, selected: chosen }} disabled={disabled} onPress={() => onChoose(iso)} style={[styles.day, chosen && styles.selectedDay, chosen && { backgroundColor: ft.colors.blue, borderColor: ft.colors.selectedBorder }, disabled && styles.disabled]}><Text style={[styles.dayText, { color: ft.colors.text }, chosen && styles.selectedText]}>{date.getDate()}{chosen ? " ✓" : ""}</Text></Pressable>; })}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="Close calendar without changing date" onPress={onClose} style={styles.close}><Text style={[styles.closeText, { color: ft.colors.selectedBorder }]}>Cancel</Text></Pressable>
  </View></SafeAreaView></Modal>;
}

const styles = StyleSheet.create({ overlay:{flex:1,justifyContent:"flex-end"},modal:{borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,gap:10,maxHeight:"92%"},monthRow:{minHeight:48,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:4},month:{flex:1,textAlign:"center",fontSize:18,fontWeight:"800"},control:{width:44,height:44,borderRadius:22,borderWidth:1,alignItems:"center",justifyContent:"center"},controlText:{fontSize:25},week:{flexDirection:"row"},weekday:{width:"14.285%",textAlign:"center",fontSize:11},grid:{flexDirection:"row",flexWrap:"wrap"},day:{width:"14.285%",minHeight:44,alignItems:"center",justifyContent:"center",borderRadius:8},dayText:{fontSize:13},selectedDay:{borderWidth:2},selectedText:{color:"white",fontWeight:"800"},disabled:{opacity:.35},close:{minHeight:48,alignItems:"center",justifyContent:"center"},closeText:{fontWeight:"800"} });
