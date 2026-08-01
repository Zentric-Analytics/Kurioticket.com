import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Field, PrimaryButton, UnavailableNotice } from "./FlowPrimitives";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";
import { addCalendarDays, changeGuests, changeRooms, countLabel, firstParam, hotelSearchParams, initializeHotelForm, localDateFromIso, localIsoDate, type HotelForm, type RouteValue, validateHotelForm } from "./hotelSearchModel";

export type HotelSearchHandle = { useDestination: (destination: string) => void };
type Props = { params: Record<string, RouteValue> };
const displayDate = (iso: string) => localDateFromIso(iso)?.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) ?? iso;

export const HotelSearchPanel = forwardRef<HotelSearchHandle, Props>(function HotelSearchPanel({ params }, ref) {
  const initial = useRef<ReturnType<typeof initializeHotelForm> | undefined>(undefined);
  if (!initial.current) initial.current = initializeHotelForm(params);
  const [form, setForm] = useState<HotelForm>(initial.current.form);
  const [errors, setErrors] = useState<ReturnType<typeof validateHotelForm>>({});
  const [notice, setNotice] = useState(initial.current.notice);
  const [calendar, setCalendar] = useState<"checkIn" | "checkOut" | undefined>();
  const [countsOpen, setCountsOpen] = useState(false);
  const destinationRef = useRef<TextInput>(null);
  const explicitDestination = firstParam(params.destination);
  const previousExplicitDestination = useRef(explicitDestination);
  useEffect(() => {
    if (explicitDestination && explicitDestination !== previousExplicitDestination.current) {
      setForm((current) => ({ ...current, destination: explicitDestination }));
      setErrors((current) => ({ ...current, destination: undefined }));
    }
    previousExplicitDestination.current = explicitDestination;
  }, [explicitDestination]);
  const update = (next: HotelForm) => setForm(next);
  const useDestination = (destination: string) => { setForm((current) => ({ ...current, destination })); setErrors((current) => ({ ...current, destination: undefined })); setNotice(`${destination} selected. Review your details, then search.`); destinationRef.current?.focus(); };
  useImperativeHandle(ref, () => ({ useDestination }), []);
  const submit = () => {
    const nextErrors = validateHotelForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setNotice("Please correct the highlighted search details."); if (nextErrors.destination) destinationRef.current?.focus(); return; }
    router.push({ pathname: "/hotel-results", params: hotelSearchParams(form) });
  };
  const chooseDate = (iso: string) => {
    if (calendar === "checkIn") {
      const adjusted = iso >= form.checkOut;
      update({ ...form, checkIn: iso, checkOut: adjusted ? addCalendarDays(iso, 1) : form.checkOut });
      setErrors((value) => ({ ...value, checkIn: undefined, checkOut: undefined }));
      if (adjusted) setNotice("Check-out moved to the next day because check-in changed.");
    } else update({ ...form, checkOut: iso });
    setCalendar(undefined);
  };
  return <View style={[flowStyles.card, flowStyles.shadow]}>
    <View style={styles.inputField}><Text style={flowStyles.label}>Destination</Text><View style={styles.inputRow}><TextInput ref={destinationRef} accessibilityLabel="Hotel destination" value={form.destination} onChangeText={(destination) => { update({ ...form, destination }); if (destination.trim()) setErrors((value) => ({ ...value, destination: undefined })); }} placeholder="Enter city or hotel" placeholderTextColor={flowColors.muted} style={styles.input} returnKeyType="done"/><FlowIcon name="location" size={20}/></View>{errors.destination ? <Text accessibilityRole="alert" style={styles.error}>{errors.destination}</Text> : null}</View>
    <View style={styles.dateRow}><View style={styles.half}><Field label="Check-in" value={displayDate(form.checkIn)} onPress={() => setCalendar("checkIn")}/>{errors.checkIn ? <Text accessibilityRole="alert" style={styles.error}>{errors.checkIn}</Text> : null}</View><View style={styles.half}><Field label="Check-out" value={displayDate(form.checkOut)} onPress={() => setCalendar("checkOut")}/>{errors.checkOut ? <Text accessibilityRole="alert" style={styles.error}>{errors.checkOut}</Text> : null}</View></View>
    <Field label="Guests and rooms" value={`${countLabel(form.rooms, "room")} · ${countLabel(form.guests, "guest")}`} trailing={<FlowIcon name="chevron" size={18}/>} onPress={() => setCountsOpen(true)}/>
    {errors.guests || errors.rooms ? <Text accessibilityRole="alert" style={styles.error}>{errors.guests || errors.rooms}</Text> : null}
    {notice ? <UnavailableNotice text={notice}/> : null}
    <View style={styles.pad}><PrimaryButton label="Search hotels" onPress={submit}/></View>
    <CalendarModal kind={calendar} selected={calendar ? form[calendar] : form.checkIn} minimum={calendar === "checkOut" ? addCalendarDays(form.checkIn, 1) : localIsoDate(new Date())} onChoose={chooseDate} onClose={() => setCalendar(undefined)}/>
    <CountModal visible={countsOpen} form={form} onChange={(next) => { update(next); setErrors((value) => ({ ...value, guests: undefined, rooms: undefined })); }} onClose={() => setCountsOpen(false)}/>
  </View>;
});

function CalendarModal({ kind, selected, minimum, onChoose, onClose }: { kind?: "checkIn" | "checkOut"; selected: string; minimum: string; onChoose: (iso: string) => void; onClose: () => void }) {
  const selectedDate = localDateFromIso(selected) ?? new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const month = useMemo(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth() + monthOffset, 1, 12), [kind, monthOffset]);
  if (!kind) return null;
  const leading = month.getDay(); const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: leading + days }, (_, index) => index < leading ? undefined : new Date(month.getFullYear(), month.getMonth(), index - leading + 1, 12));
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.overlay}><View accessibilityViewIsModal style={styles.modal}><View style={styles.monthRow}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonthOffset((v) => v - 1)} style={styles.control}><Text style={styles.controlText}>‹</Text></Pressable><Text accessibilityRole="header" style={flowStyles.title}>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonthOffset((v) => v + 1)} style={styles.control}><Text style={styles.controlText}>›</Text></Pressable></View><View style={styles.week}>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}</View><View style={styles.grid}>{cells.map((date, index) => { if (!date) return <View key={`blank-${index}`} style={styles.day}/>; const iso = localIsoDate(date); const disabled = iso < minimum; const chosen = iso === selected; return <Pressable key={iso} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString(undefined, { dateStyle: "full" })} accessibilityState={{ disabled, selected: chosen }} disabled={disabled} onPress={() => onChoose(iso)} style={[styles.day, chosen && styles.selectedDay, disabled && styles.disabledDay]}><Text style={[styles.dayText, chosen && styles.selectedText]}>{date.getDate()}{chosen ? " ✓" : ""}</Text></Pressable>; })}</View><Pressable accessibilityRole="button" accessibilityLabel="Close calendar without changing date" onPress={onClose} style={styles.close}><Text style={styles.closeText}>Cancel</Text></Pressable></View></SafeAreaView></Modal>;
}
function CountModal({ visible, form, onChange, onClose }: { visible: boolean; form: HotelForm; onChange: (form: HotelForm) => void; onClose: () => void }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable accessibilityViewIsModal style={styles.modal}><Text accessibilityRole="header" style={flowStyles.title}>Guests and rooms</Text><Counter label="Guests" value={form.guests} minusDisabled={form.guests <= 1} plusDisabled={form.guests >= 20} onMinus={() => onChange(changeGuests(form, -1))} onPlus={() => onChange(changeGuests(form, 1))}/><Counter label="Rooms" value={form.rooms} minusDisabled={form.rooms <= 1} plusDisabled={form.rooms >= 9 || form.rooms >= form.guests} onMinus={() => onChange(changeRooms(form, -1))} onPlus={() => onChange(changeRooms(form, 1))}/><PrimaryButton label="Done" icon="check" onPress={onClose}/></Pressable></Pressable></Modal>;
}
function Counter({ label, value, minusDisabled, plusDisabled, onMinus, onPlus }: { label: string; value: number; minusDisabled: boolean; plusDisabled: boolean; onMinus: () => void; onPlus: () => void }) { return <View style={styles.counter}><Text style={flowStyles.value}>{label}</Text><View style={styles.counterActions}><Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label.toLowerCase()}`} accessibilityState={{ disabled: minusDisabled }} disabled={minusDisabled} onPress={onMinus} style={[styles.control, minusDisabled && styles.disabledDay]}><Text style={styles.controlText}>−</Text></Pressable><Text accessibilityLabel={`${value} ${label.toLowerCase()}`} style={styles.count}>{value}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label.toLowerCase()}`} accessibilityState={{ disabled: plusDisabled }} disabled={plusDisabled} onPress={onPlus} style={[styles.control, plusDisabled && styles.disabledDay]}><Text style={styles.controlText}>+</Text></Pressable></View></View>; }
const styles = StyleSheet.create({ inputField:{minHeight:76,padding:12,borderBottomColor:flowColors.border,borderBottomWidth:1},inputRow:{flexDirection:"row",alignItems:"center"},input:{flex:1,minHeight:44,color:flowColors.navy,fontSize:14},dateRow:{flexDirection:"row",flexWrap:"wrap"},half:{flexGrow:1,flexBasis:150},pad:{padding:8},error:{color:"#A21D25",fontSize:12,lineHeight:18,paddingHorizontal:12,paddingVertical:5},overlay:{flex:1,backgroundColor:"#071A4866",justifyContent:"flex-end"},modal:{backgroundColor:"white",borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,gap:12,maxHeight:"92%"},monthRow:{minHeight:48,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:4},control:{width:44,height:44,borderRadius:22,borderWidth:1,borderColor:flowColors.border,alignItems:"center",justifyContent:"center"},controlText:{fontSize:25,color:flowColors.navy},week:{flexDirection:"row"},weekday:{width:"14.285%",textAlign:"center",color:flowColors.muted,fontSize:11},grid:{flexDirection:"row",flexWrap:"wrap"},day:{width:"14.285%",minHeight:44,alignItems:"center",justifyContent:"center",borderRadius:8},dayText:{color:flowColors.navy,fontSize:13},selectedDay:{backgroundColor:flowColors.blue,borderWidth:2,borderColor:flowColors.navy},selectedText:{color:"white",fontWeight:"800"},disabledDay:{opacity:.35},close:{minHeight:48,alignItems:"center",justifyContent:"center"},closeText:{color:flowColors.blue,fontWeight:"800"},counter:{minHeight:68,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomColor:flowColors.border,borderBottomWidth:1},counterActions:{flexDirection:"row",alignItems:"center",gap:12},count:{minWidth:28,textAlign:"center",fontSize:18,fontWeight:"800",color:flowColors.navy} });
