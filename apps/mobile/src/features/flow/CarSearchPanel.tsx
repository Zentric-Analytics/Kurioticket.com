import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Field, PrimaryButton, UnavailableNotice } from "./FlowPrimitives";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles, useFlowTheme } from "./flowStyles";
import { localDateFromIso } from "./localDateModel";
import { adjustDropoff, boundedAge, CAR_AGE, carSearchParams, initializeCarForm, initializeCarsPageForm, rentalTimesSummary, type CarForm, type CarFormErrors, validateCarForm } from "./carSearchModel";
import { CarRentalDatesSheet, CarTimeRangeSheet } from "./CarSearchPickers";
import type { RouteValue } from "./hotelSearchModel";

type Props = { params: Record<string, RouteValue>; embedded?: boolean; showSubmit?: boolean; submitLabel?: string; requireManualDetails?: boolean };
const displayDate = (iso: string) => localDateFromIso(iso)?.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) ?? iso;
export const rentalDatesSummary = (pickupDate: string, returnDate: string) => `${pickupDate ? displayDate(pickupDate) : "Select pick-up date"} — ${returnDate ? displayDate(returnDate) : "Select return date"}`;

export function CarSearchPanel({ params, embedded = false, showSubmit = true, submitLabel = "Search cars", requireManualDetails = false }: Props) {
  const ft = useFlowTheme();
  const initialize = requireManualDetails ? initializeCarsPageForm : initializeCarForm;
  const initial = useRef<ReturnType<typeof initialize> | undefined>(undefined);
  if (!initial.current) initial.current = initialize(params);
  const [form, setForm] = useState<CarForm>(initial.current.form);
  const [errors, setErrors] = useState<CarFormErrors>({});
  const [notice, setNotice] = useState(initial.current.notice);
  const [datesOpen, setDatesOpen] = useState(false);
  const [timesOpen, setTimesOpen] = useState(false);
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
  const commitDates = (pickupDate: string, dropoffDate: string) => { const next={...form,pickupDate,dropoffDate}; const adjusted=next.pickupTime&&next.dropoffTime?adjustDropoff(next):{form:next,adjusted:false}; setForm(adjusted.form); if(adjusted.adjusted)setNotice("Return was adjusted to remain later than pick-up."); clear("pickupDate","dropoffDate","dropoffTime"); setDatesOpen(false); };
  const commitTimes = (pickupTime: string, dropoffTime: string) => { const next={...form,pickupTime,dropoffTime}; const adjusted=next.pickupDate&&next.dropoffDate?adjustDropoff(next):{form:next,adjusted:false}; setForm(adjusted.form); if(adjusted.adjusted)setNotice("Return was adjusted to remain later than pick-up."); clear("pickupTime","dropoffTime"); setTimesOpen(false); };
  return <View style={[!embedded && ft.styles.card, !embedded && ft.styles.shadow]}>
    <LocationInput inputRef={pickupRef} label="Pick-up location" value={form.pickupLocation} error={errors.pickupLocation} onChange={(pickupLocation) => { setForm({ ...form, pickupLocation }); if (pickupLocation.trim()) clear("pickupLocation"); }}/>
    <Pressable accessibilityRole="checkbox" accessibilityLabel="Return to a different location" accessibilityState={{ checked: form.separateDropoff }} onPress={() => setForm({ ...form, separateDropoff: !form.separateDropoff })} style={styles.checkboxRow}><View style={[styles.checkbox, form.separateDropoff && styles.checked]}>{form.separateDropoff ? <FlowIcon name="check" color="white" size={15}/> : null}</View><Text style={ft.styles.meta}>Return to a different location</Text></Pressable>
    {form.separateDropoff ? <LocationInput label="Drop-off location" value={form.dropoffLocation} error={errors.dropoffLocation} onChange={(dropoffLocation) => { setForm({ ...form, dropoffLocation }); if (dropoffLocation.trim()) clear("dropoffLocation"); }}/> : null}
    <FieldError errors={[errors.pickupDate,errors.dropoffDate]}><Field label="Rental dates" value={rentalDatesSummary(form.pickupDate,form.dropoffDate)} icon="calendar" onPress={() => setDatesOpen(true)}/></FieldError>
    <FieldError errors={[errors.pickupTime,errors.dropoffTime]}><Field label="Pick-up / Return time" value={rentalTimesSummary(form.pickupTime,form.dropoffTime)} icon="clock" onPress={() => setTimesOpen(true)}/></FieldError>
    <Field label="Driver age" value={form.driverAge === undefined ? "Select driver age" : `${form.driverAge} years old`} icon="person" trailing={<FlowIcon name="chevron" color={ft.colors.icon} size={18}/>} onPress={() => setAgeOpen(true)}/>{errors.driverAge ? <Text accessibilityRole="alert" style={styles.error}>{errors.driverAge}</Text> : null}
    {notice ? <UnavailableNotice text={notice}/> : null}{showSubmit ? <View style={styles.pad}><PrimaryButton label={submitLabel} onPress={submit}/></View> : null}
    <CarRentalDatesSheet visible={datesOpen} pickupDate={form.pickupDate} returnDate={form.dropoffDate} onDone={commitDates} onCancel={() => setDatesOpen(false)}/>
    <CarTimeRangeSheet visible={timesOpen} pickupTime={form.pickupTime} returnTime={form.dropoffTime} onDone={commitTimes} onCancel={() => setTimesOpen(false)}/>
    <AgeSheet visible={ageOpen} age={form.driverAge} onConfirm={(driverAge) => { setForm({ ...form, driverAge }); clear("driverAge"); setAgeOpen(false); }} onClose={() => setAgeOpen(false)}/>
  </View>;
}
function LocationInput({ inputRef, label, value, error, onChange }: { inputRef?: React.RefObject<TextInput | null>; label: string; value: string; error?: string; onChange: (value: string) => void }) { const ft = useFlowTheme(); return <View style={styles.inputField}><View style={styles.locationFieldRow}><FlowIcon name="location" size={22} color={ft.colors.icon}/><View style={styles.locationFieldContent}><Text style={ft.styles.label}>{label}</Text><TextInput ref={inputRef} accessibilityLabel={label} value={value} onChangeText={onChange} placeholder="Enter city or airport" placeholderTextColor={ft.colors.placeholder} style={[styles.input, { color: ft.colors.text }]} returnKeyType="done"/></View></View>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View>; }
function FieldError({ children, errors }: { children: React.ReactNode; errors: (string | undefined)[] }) { return <View>{children}{errors.filter(Boolean).map((error)=><Text key={error} accessibilityRole="alert" style={styles.error}>{error}</Text>)}</View>; }
function AgeSheet({ visible, age, onConfirm, onClose }: { visible: boolean; age?: number; onConfirm: (age: number) => void; onClose: () => void }) { const ft = useFlowTheme(); const [draft, setDraft] = useState(age === undefined ? "" : String(age)); useEffect(() => { if (visible) setDraft(age === undefined ? "" : String(age)); }, [visible, age]); const parsed = /^\d+$/.test(draft) ? Number(draft) : NaN; const valid = Number.isInteger(parsed) && parsed >= CAR_AGE.min && parsed <= CAR_AGE.max; const change = (delta: number) => setDraft(String(boundedAge(valid ? parsed : CAR_AGE.min, delta))); return <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable accessibilityViewIsModal style={styles.sheet}><Text accessibilityRole="header" style={flowStyles.title}>Driver age</Text><View style={styles.ageRow}><Pressable accessibilityRole="button" accessibilityLabel="Decrease driver age" accessibilityState={{ disabled: valid && parsed <= CAR_AGE.min }} disabled={valid && parsed <= CAR_AGE.min} onPress={() => change(-1)} style={styles.ageButton}><Text style={styles.ageSymbol}>−</Text></Pressable><TextInput accessibilityLabel="Driver age" keyboardType="number-pad" value={draft} onChangeText={setDraft} maxLength={2} style={styles.ageInput}/><Pressable accessibilityRole="button" accessibilityLabel="Increase driver age" accessibilityState={{ disabled: valid && parsed >= CAR_AGE.max }} disabled={valid && parsed >= CAR_AGE.max} onPress={() => change(1)} style={styles.ageButton}><Text style={styles.ageSymbol}>+</Text></Pressable></View>{!valid ? <Text accessibilityRole="alert" style={styles.error}>Enter a whole number from 18 to 70.</Text> : null}<PrimaryButton label="Done" icon="check" onPress={() => { if (valid) onConfirm(parsed); }}/><Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}><Text style={styles.link}>Cancel</Text></Pressable></Pressable></Pressable></Modal>; }
const styles = StyleSheet.create({ inputField:{minHeight:76,padding:12,borderBottomColor:flowColors.border,borderBottomWidth:1},locationFieldRow:{flexDirection:"row",alignItems:"center",gap:10},locationFieldContent:{flex:1},input:{minHeight:44,color:flowColors.navy,fontSize:14},checkboxRow:{minHeight:52,flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:12},checkbox:{width:24,height:24,borderRadius:5,borderWidth:1,borderColor:flowColors.border,alignItems:"center",justifyContent:"center"},checked:{backgroundColor:flowColors.blue,borderColor:flowColors.blue},pad:{padding:8},error:{color:"#A21D25",fontSize:12,lineHeight:18,paddingHorizontal:12,paddingVertical:5},overlay:{flex:1,backgroundColor:"#071A4866",justifyContent:"flex-end"},sheet:{maxHeight:"72%",backgroundColor:"white",borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,gap:12},cancel:{minHeight:44,alignItems:"center",justifyContent:"center"},link:{color:flowColors.blue,fontWeight:"800"},ageRow:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:14},ageButton:{width:48,height:48,borderRadius:24,borderWidth:1,borderColor:flowColors.border,alignItems:"center",justifyContent:"center"},ageSymbol:{fontSize:26,color:flowColors.navy},ageInput:{width:90,minHeight:52,textAlign:"center",fontSize:22,fontWeight:"800",color:flowColors.navy,borderWidth:1,borderColor:flowColors.border,borderRadius:9} });
