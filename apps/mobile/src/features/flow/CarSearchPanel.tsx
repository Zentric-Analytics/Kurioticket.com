import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Field, PrimaryButton, UnavailableNotice } from "./FlowPrimitives";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles, useFlowTheme } from "./flowStyles";
import { LocalCalendarModal } from "./LocalCalendarModal";
import { localDateFromIso, localIsoDate } from "./localDateModel";
import { adjustDropoff, boundedAge, CAR_AGE, carSearchParams, formatTime, initializeCarForm, initializeCarsPageForm, selectCarsPickupDate, selectCarsPickupTime, timeOptions, type CarForm, type CarFormErrors, validateCarForm } from "./carSearchModel";
import type { RouteValue } from "./hotelSearchModel";

type Props = { params: Record<string, RouteValue>; embedded?: boolean; showSubmit?: boolean; submitLabel?: string; requireManualDetails?: boolean };
const displayDate = (iso: string) => localDateFromIso(iso)?.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) ?? iso;

export function CarSearchPanel({ params, embedded = false, showSubmit = true, submitLabel = "Search cars", requireManualDetails = false }: Props) {
  const ft = useFlowTheme();
  const initialize = requireManualDetails ? initializeCarsPageForm : initializeCarForm;
  const initial = useRef<ReturnType<typeof initialize> | undefined>(undefined);
  if (!initial.current) initial.current = initialize(params);
  const [form, setForm] = useState<CarForm>(initial.current.form);
  const [errors, setErrors] = useState<CarFormErrors>({});
  const [notice, setNotice] = useState(initial.current.notice);
  const [calendar, setCalendar] = useState<"pickupDate" | "dropoffDate">();
  const [timeSheet, setTimeSheet] = useState<"pickupTime" | "dropoffTime">();
  const [ageOpen, setAgeOpen] = useState(false);
  const pickupRef = useRef<TextInput>(null);
  const routeIntent = JSON.stringify(params);
  const previousIntent = useRef(routeIntent);
  useEffect(() => {
    if (routeIntent !== previousIntent.current && Object.values(params).some(Boolean)) {
      const next = initialize(params); setForm(next.form); setErrors({}); setNotice(next.notice);
    }
    previousIntent.current = routeIntent;
  }, [routeIntent]);
  const clear = (...keys: (keyof CarFormErrors)[]) => setErrors((current) => { const next = { ...current }; keys.forEach((key) => delete next[key]); return next; });
  const submit = () => {
    const nextErrors = validateCarForm(form); setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setNotice("Please correct the highlighted search details."); if (nextErrors.pickupLocation) pickupRef.current?.focus(); return; }
    router.push({ pathname: "/car-results", params: carSearchParams(form) });
  };
  const chooseDate = (iso: string) => {
    if (calendar === "pickupDate") {
      if (requireManualDetails) { setForm(selectCarsPickupDate(form, iso)); clear("pickupDate", "dropoffDate", "dropoffTime"); setCalendar(undefined); return; }
      const duration = Math.max(1, Math.round(((localDateFromIso(form.dropoffDate)?.getTime() ?? 0) - (localDateFromIso(form.pickupDate)?.getTime() ?? 0)) / 86400000));
      const candidate = { ...form, pickupDate: iso, dropoffDate: form.dropoffDate < iso ? (() => { const date = localDateFromIso(iso)!; date.setDate(date.getDate() + duration); return localIsoDate(date); })() : form.dropoffDate };
      const adjusted = adjustDropoff(candidate); setForm(adjusted.form); if (candidate.dropoffDate !== form.dropoffDate || adjusted.adjusted) setNotice("Drop-off was adjusted to remain later than pick-up.");
    } else setForm({ ...form, dropoffDate: iso });
    clear("pickupDate", "dropoffDate", "dropoffTime"); setCalendar(undefined);
  };
  const chooseTime = (value: string) => {
    if (requireManualDetails && timeSheet === "pickupTime") { setForm(selectCarsPickupTime(form, value)); clear("pickupTime", "dropoffTime"); setTimeSheet(undefined); return; }
    const next = { ...form, [timeSheet!]: value };
    const adjusted = timeSheet === "pickupTime" ? adjustDropoff(next) : { form: next, adjusted: false };
    setForm(adjusted.form); if (adjusted.adjusted) setNotice("Drop-off was adjusted to remain later than pick-up."); clear("pickupTime", "dropoffTime"); setTimeSheet(undefined);
  };
  return <View style={[!embedded && ft.styles.card, !embedded && ft.styles.shadow]}>
    <LocationInput inputRef={pickupRef} label="Pick-up location" value={form.pickupLocation} error={errors.pickupLocation} onChange={(pickupLocation) => { setForm({ ...form, pickupLocation }); if (pickupLocation.trim()) clear("pickupLocation"); }}/>
    <Pressable accessibilityRole="checkbox" accessibilityLabel="Return to a different location" accessibilityState={{ checked: form.separateDropoff }} onPress={() => setForm({ ...form, separateDropoff: !form.separateDropoff })} style={styles.checkboxRow}><View style={[styles.checkbox, form.separateDropoff && styles.checked]}>{form.separateDropoff ? <FlowIcon name="check" color="white" size={15}/> : null}</View><Text style={ft.styles.meta}>Return to a different location</Text></Pressable>
    {form.separateDropoff ? <LocationInput label="Drop-off location" value={form.dropoffLocation} error={errors.dropoffLocation} onChange={(dropoffLocation) => { setForm({ ...form, dropoffLocation }); if (dropoffLocation.trim()) clear("dropoffLocation"); }}/> : null}
    <View style={styles.row}><FieldError error={errors.pickupDate} style={styles.half}><Field label="Pick-up date" value={form.pickupDate ? displayDate(form.pickupDate) : "Select pick-up date"} onPress={() => setCalendar("pickupDate")}/></FieldError><FieldError error={errors.pickupTime} style={styles.half}><Field label="Pick-up time" value={form.pickupTime ? formatTime(form.pickupTime) : "Select pick-up time"} onPress={() => setTimeSheet("pickupTime")}/></FieldError></View>
    <View style={styles.row}><FieldError error={errors.dropoffDate} style={styles.half}><Field label="Drop-off date" value={form.dropoffDate ? displayDate(form.dropoffDate) : "Select drop-off date"} onPress={() => setCalendar("dropoffDate")}/></FieldError><FieldError error={errors.dropoffTime} style={styles.half}><Field label="Drop-off time" value={form.dropoffTime ? formatTime(form.dropoffTime) : "Select drop-off time"} onPress={() => setTimeSheet("dropoffTime")}/></FieldError></View>
    <Field label="Driver age" value={form.driverAge === undefined ? "Select driver age" : `${form.driverAge} years old`} trailing={<FlowIcon name="chevron" size={18}/>} onPress={() => setAgeOpen(true)}/>{errors.driverAge ? <Text accessibilityRole="alert" style={styles.error}>{errors.driverAge}</Text> : null}
    {notice ? <UnavailableNotice text={notice}/> : null}{showSubmit ? <View style={styles.pad}><PrimaryButton label={submitLabel} onPress={submit}/></View> : null}
    <LocalCalendarModal visible={Boolean(calendar)} title={calendar === "dropoffDate" ? "Choose drop-off date" : "Choose pick-up date"} selected={calendar ? form[calendar] : form.pickupDate} minimum={calendar === "dropoffDate" ? form.pickupDate : localIsoDate(new Date())} onChoose={chooseDate} onClose={() => setCalendar(undefined)}/>
    <TimeSheet kind={timeSheet} selected={timeSheet ? form[timeSheet] : form.pickupTime} onChoose={chooseTime} onClose={() => setTimeSheet(undefined)}/>
    <AgeSheet visible={ageOpen} age={form.driverAge} onConfirm={(driverAge) => { setForm({ ...form, driverAge }); clear("driverAge"); setAgeOpen(false); }} onClose={() => setAgeOpen(false)}/>
  </View>;
}
function LocationInput({ inputRef, label, value, error, onChange }: { inputRef?: React.RefObject<TextInput | null>; label: string; value: string; error?: string; onChange: (value: string) => void }) { const ft = useFlowTheme(); return <View style={styles.inputField}><Text style={ft.styles.label}>{label}</Text><View style={styles.inputRow}><TextInput ref={inputRef} accessibilityLabel={label} value={value} onChangeText={onChange} placeholder="Enter city or airport" placeholderTextColor={ft.colors.placeholder} style={[styles.input, { color: ft.colors.text }]} returnKeyType="done"/><FlowIcon name="location" size={20}/></View>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View>; }
function FieldError({ children, error, style }: { children: React.ReactNode; error?: string; style?: object }) { return <View style={style}>{children}{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View>; }
function TimeSheet({ kind, selected, onChoose, onClose }: { kind?: "pickupTime" | "dropoffTime"; selected: string; onChoose: (value: string) => void; onClose: () => void }) { const ft = useFlowTheme(); return <Modal transparent animationType="slide" visible={Boolean(kind)} onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable accessibilityViewIsModal style={styles.sheet}><Text accessibilityRole="header" style={flowStyles.title}>{kind === "dropoffTime" ? "Choose drop-off time" : "Choose pick-up time"}</Text><ScrollView>{timeOptions.map((time) => <Pressable key={time} accessibilityRole="button" accessibilityState={{ selected: time === selected }} accessibilityLabel={`${formatTime(time)}${time === selected ? ", selected" : ""}`} onPress={() => onChoose(time)} style={[styles.choice, time === selected && styles.selectedChoice]}><Text style={ft.styles.value}>{formatTime(time)}{time === selected ? " ✓" : ""}</Text></Pressable>)}</ScrollView><Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}><Text style={styles.link}>Cancel</Text></Pressable></Pressable></Pressable></Modal>; }
function AgeSheet({ visible, age, onConfirm, onClose }: { visible: boolean; age?: number; onConfirm: (age: number) => void; onClose: () => void }) { const ft = useFlowTheme(); const [draft, setDraft] = useState(age === undefined ? "" : String(age)); useEffect(() => { if (visible) setDraft(age === undefined ? "" : String(age)); }, [visible, age]); const parsed = /^\d+$/.test(draft) ? Number(draft) : NaN; const valid = Number.isInteger(parsed) && parsed >= CAR_AGE.min && parsed <= CAR_AGE.max; const change = (delta: number) => setDraft(String(boundedAge(valid ? parsed : CAR_AGE.min, delta))); return <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable accessibilityViewIsModal style={styles.sheet}><Text accessibilityRole="header" style={flowStyles.title}>Driver age</Text><View style={styles.ageRow}><Pressable accessibilityRole="button" accessibilityLabel="Decrease driver age" accessibilityState={{ disabled: valid && parsed <= CAR_AGE.min }} disabled={valid && parsed <= CAR_AGE.min} onPress={() => change(-1)} style={styles.ageButton}><Text style={styles.ageSymbol}>−</Text></Pressable><TextInput accessibilityLabel="Driver age" keyboardType="number-pad" value={draft} onChangeText={setDraft} maxLength={2} style={styles.ageInput}/><Pressable accessibilityRole="button" accessibilityLabel="Increase driver age" accessibilityState={{ disabled: valid && parsed >= CAR_AGE.max }} disabled={valid && parsed >= CAR_AGE.max} onPress={() => change(1)} style={styles.ageButton}><Text style={styles.ageSymbol}>+</Text></Pressable></View>{!valid ? <Text accessibilityRole="alert" style={styles.error}>Enter a whole number from 18 to 70.</Text> : null}<PrimaryButton label="Done" icon="check" onPress={() => { if (valid) onConfirm(parsed); }}/><Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}><Text style={styles.link}>Cancel</Text></Pressable></Pressable></Pressable></Modal>; }
const styles = StyleSheet.create({ inputField:{minHeight:76,padding:12,borderBottomColor:flowColors.border,borderBottomWidth:1},inputRow:{flexDirection:"row",alignItems:"center"},input:{flex:1,minHeight:44,color:flowColors.navy,fontSize:14},checkboxRow:{minHeight:52,flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:12},checkbox:{width:24,height:24,borderRadius:5,borderWidth:1,borderColor:flowColors.border,alignItems:"center",justifyContent:"center"},checked:{backgroundColor:flowColors.blue,borderColor:flowColors.blue},row:{flexDirection:"row",flexWrap:"wrap"},half:{flexGrow:1,flexBasis:150},pad:{padding:8},error:{color:"#A21D25",fontSize:12,lineHeight:18,paddingHorizontal:12,paddingVertical:5},overlay:{flex:1,backgroundColor:"#071A4866",justifyContent:"flex-end"},sheet:{maxHeight:"72%",backgroundColor:"white",borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,gap:12},choice:{minHeight:52,justifyContent:"center",paddingHorizontal:12,borderBottomColor:flowColors.border,borderBottomWidth:1},selectedChoice:{backgroundColor:"#F2F6FF",borderLeftColor:flowColors.blue,borderLeftWidth:4},cancel:{minHeight:44,alignItems:"center",justifyContent:"center"},link:{color:flowColors.blue,fontWeight:"800"},ageRow:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:14},ageButton:{width:48,height:48,borderRadius:24,borderWidth:1,borderColor:flowColors.border,alignItems:"center",justifyContent:"center"},ageSymbol:{fontSize:26,color:flowColors.navy},ageInput:{width:90,minHeight:52,textAlign:"center",fontSize:22,fontWeight:"800",color:flowColors.navy,borderWidth:1,borderColor:flowColors.border,borderRadius:9} });
