import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CompactSearchField, PickerSheetHeader, PrimaryButton, UnavailableNotice } from "./FlowPrimitives";
import { FlowIcon } from "./FlowIcon";
import { flowColors, useFlowTheme } from "./flowStyles";
import { localDateFromIso } from "./localDateModel";
import { adjustDropoff, CAR_AGE, carSearchParams, initializeCarForm, initializeCarsPageForm, initializeHomeCarForm, rentalTimesSummary, type CarForm, type CarFormErrors, validateCarForm } from "./carSearchModel";
import { CarRentalDatesSheet, CarTimeRangeSheet } from "./CarSearchPickers";
import type { RouteValue } from "./hotelSearchModel";
import { searchCarLocationSuggestions, type CarLocationSuggestion } from "@/lib/cars/carLocationSuggestions";

type Props = { params: Record<string, RouteValue>; embedded?: boolean; showSubmit?: boolean; submitLabel?: string; requireManualDetails?: boolean; startWithEmptyRentalDates?: boolean };
const displayDate = (iso: string) => localDateFromIso(iso)?.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) ?? iso;
export const rentalDatesSummary = (pickupDate: string, returnDate: string) => `${pickupDate ? displayDate(pickupDate) : "Pickup date"} — ${returnDate ? displayDate(returnDate) : "Return date"}`;
type CarLocationPickerMode = "pickup" | "return" | undefined;

export function CarSearchPanel({ params, embedded = false, showSubmit = true, submitLabel = "Search cars", requireManualDetails = false, startWithEmptyRentalDates = false }: Props) {
  const ft = useFlowTheme();
  const initialize = requireManualDetails ? initializeCarsPageForm : startWithEmptyRentalDates ? initializeHomeCarForm : initializeCarForm;
  const initial = useRef<ReturnType<typeof initialize> | undefined>(undefined);
  if (!initial.current) initial.current = initialize(params);
  const [form, setForm] = useState<CarForm>(initial.current.form);
  const [errors, setErrors] = useState<CarFormErrors>({});
  const [notice, setNotice] = useState(initial.current.notice);
  const [datesOpen, setDatesOpen] = useState(false);
  const [timesOpen, setTimesOpen] = useState(false);
  const [ageOpen, setAgeOpen] = useState(false);
  const [locationPicker, setLocationPicker] = useState<CarLocationPickerMode>();
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
    if (Object.keys(nextErrors).length) { setNotice("Please correct the highlighted search details."); if (nextErrors.pickupLocation) setLocationPicker("pickup"); else if (nextErrors.dropoffLocation) setLocationPicker("return"); return; }
    router.push({ pathname: "/car-results", params: carSearchParams(form) });
  };
  const commitDates = (pickupDate: string, dropoffDate: string) => { const next={...form,pickupDate,dropoffDate}; const adjusted=next.pickupTime&&next.dropoffTime?adjustDropoff(next):{form:next,adjusted:false}; setForm(adjusted.form); if(adjusted.adjusted)setNotice("Return was adjusted to remain later than pick-up."); clear("pickupDate","dropoffDate","dropoffTime"); setDatesOpen(false); };
  const commitTimes = (pickupTime: string, dropoffTime: string) => { const next={...form,pickupTime,dropoffTime}; const adjusted=next.pickupDate&&next.dropoffDate?adjustDropoff(next):{form:next,adjusted:false}; setForm(adjusted.form); if(adjusted.adjusted)setNotice("Return was adjusted to remain later than pick-up."); clear("pickupTime","dropoffTime"); setTimesOpen(false); };
  return <View style={[!embedded && ft.styles.card, !embedded && ft.styles.shadow]}>
    <FieldError errors={[errors.pickupLocation]}><CompactSearchField label="Pick-up location" value={form.pickupLocation || "Enter city or airport"} muted={!form.pickupLocation} icon="location" onPress={() => setLocationPicker("pickup")}/></FieldError>
    {form.separateDropoff ? <FieldError errors={[errors.dropoffLocation]}><CompactSearchField label="Drop-off location" value={form.dropoffLocation || "Enter city or airport"} muted={!form.dropoffLocation} icon="location" onPress={() => setLocationPicker("return")}/></FieldError> : null}
    <FieldError errors={[errors.pickupDate,errors.dropoffDate]}><CompactSearchField label="Rental dates" value={rentalDatesSummary(form.pickupDate,form.dropoffDate)} muted={!form.pickupDate || !form.dropoffDate} icon="calendar" valueNumberOfLines={0} onPress={() => setDatesOpen(true)}/></FieldError>
    <FieldError errors={[errors.pickupTime,errors.dropoffTime]}><CompactSearchField label="Pick-up / Return time" value={rentalTimesSummary(form.pickupTime,form.dropoffTime)} muted={!form.pickupTime || !form.dropoffTime} icon="clock" valueNumberOfLines={0} onPress={() => setTimesOpen(true)}/></FieldError>
    <CompactSearchField label="Driver age" value={form.driverAge === undefined ? "Select driver age" : `${form.driverAge} years old`} muted={form.driverAge === undefined} icon="person" onPress={() => setAgeOpen(true)}/>{errors.driverAge ? <Text accessibilityRole="alert" style={styles.error}>{errors.driverAge}</Text> : null}
    {notice ? <UnavailableNotice text={notice}/> : null}{showSubmit ? <View style={styles.pad}><PrimaryButton label={submitLabel} icon={null} onPress={submit}/></View> : null}
    <Pressable accessibilityRole="checkbox" accessibilityLabel="Return to a different location" accessibilityState={{ checked: form.separateDropoff }} onPress={() => setForm({ ...form, separateDropoff: !form.separateDropoff })} style={styles.checkboxRow}><View style={[styles.checkbox, form.separateDropoff && styles.checked]}>{form.separateDropoff ? <FlowIcon name="check" color="white" size={15}/> : null}</View><Text style={ft.styles.meta}>Return to a different location</Text></Pressable>
    <CarRentalDatesSheet visible={datesOpen} pickupDate={form.pickupDate} returnDate={form.dropoffDate} onDone={commitDates} onCancel={() => setDatesOpen(false)}/>
    <CarTimeRangeSheet visible={timesOpen} pickupTime={form.pickupTime} returnTime={form.dropoffTime} onDone={commitTimes} onCancel={() => setTimesOpen(false)}/>
    <AgeSheet visible={ageOpen} age={form.driverAge} onConfirm={(driverAge) => { setForm({ ...form, driverAge }); clear("driverAge"); setAgeOpen(false); }} onClose={() => setAgeOpen(false)}/>
    <CarLocationSheet mode={locationPicker} selectedValue={locationPicker === "return" ? form.dropoffLocation : form.pickupLocation} onChoose={(value) => { if (locationPicker === "return") { setForm({ ...form, dropoffLocation: value }); clear("dropoffLocation"); } else { setForm({ ...form, pickupLocation: value }); clear("pickupLocation"); } setLocationPicker(undefined); }} onClose={() => setLocationPicker(undefined)}/>
  </View>;
}
export function CarLocationSheet({ mode, selectedValue, onChoose, onClose }: { mode: CarLocationPickerMode; selectedValue: string; onChoose: (value: string) => void; onClose: () => void }) {
  const ft = useFlowTheme();
  const [query,setQuery] = useState("");
  const [suggestions,setSuggestions] = useState<CarLocationSuggestion[]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState(false);
  useEffect(() => { if (mode) setQuery(""); },[mode]);
  useEffect(() => {
    if (!mode) return;
    let current = true; setLoading(true); setError(false);
    searchCarLocationSuggestions(query,{limit:8}).then((items) => { if (current) setSuggestions(items); }).catch(() => { if (current) { setSuggestions([]); setError(true); } }).finally(() => { if (current) setLoading(false); });
    return () => { current=false; };
  },[mode,query]);
  const renderLocation = ({item}:{item:CarLocationSuggestion}) => { const selected=item.value===selectedValue; const detail=item.airportCode ? `${item.secondaryText} · ${item.airportCode}` : item.secondaryText; return <Pressable accessibilityRole="button" accessibilityLabel={`${item.primaryText}, ${detail}`} accessibilityState={{selected}} onPress={() => onChoose(item.value)} style={[styles.locationChoice,{borderBottomColor:ft.colors.border},selected&&{backgroundColor:ft.colors.selected,borderLeftColor:ft.colors.selectedBorder}]}><View style={[styles.resultIcon,{backgroundColor:ft.colors.input}]}><FlowIcon name={item.kind === "airport" ? "flight" : item.kind === "city" ? "city" : "location"} size={21} color={ft.colors.icon}/></View><View style={styles.resultCopy}><Text numberOfLines={1} style={[ft.styles.value,selected&&{color:ft.colors.selectedPrimaryText}]}>{item.primaryText}</Text><Text numberOfLines={1} style={[ft.styles.meta,selected&&{color:ft.colors.selectedSecondaryText}]}>{detail}</Text></View></Pressable>; };
  return <Modal transparent animationType="slide" visible={Boolean(mode)} onRequestClose={onClose}><KeyboardAvoidingView style={styles.keyboardViewport} behavior={Platform.OS === "ios" ? "padding" : "height"}><SafeAreaView edges={["top","bottom"]} style={styles.locationOverlay}><Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close car location picker" onPress={onClose}/><View accessibilityViewIsModal style={[styles.locationSheet,{backgroundColor:ft.colors.surface}]}><Text accessibilityRole="header" style={ft.styles.title}>{mode === "return" ? "Choose return location" : "Choose pick-up location"}</Text><View style={[styles.searchRow,{backgroundColor:ft.colors.input,borderColor:ft.colors.border}]}><FlowIcon name="search" size={20} color={ft.colors.icon}/><TextInput accessibilityLabel="Search car locations" placeholder="Airport, city, or address" placeholderTextColor={ft.colors.placeholder} value={query} onChangeText={setQuery} returnKeyType="search" style={[styles.searchInput,{color:ft.colors.text}]}/>{query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear car location search" onPress={() => setQuery("")}><Text style={[styles.link,{color:ft.colors.selectedBorder}]}>Clear</Text></Pressable> : null}</View>{loading ? <Text style={[styles.locationStatus,{color:ft.colors.secondaryText}]}>Finding locations…</Text> : error ? <Text accessibilityRole="alert" style={[styles.locationStatus,{color:ft.colors.secondaryText}]}>Couldn’t load locations. Please try again.</Text> : <FlatList keyboardShouldPersistTaps="handled" data={suggestions} keyExtractor={(item) => item.id} renderItem={renderLocation} contentContainerStyle={styles.locationList} ListEmptyComponent={<Text style={[styles.locationStatus,{color:ft.colors.secondaryText}]}>No matching locations.</Text>}/>}<Pressable accessibilityRole="button" accessibilityLabel="Cancel car location picker" onPress={onClose} style={styles.cancel}><Text style={[styles.link,{color:ft.colors.selectedBorder}]}>Cancel</Text></Pressable></View></SafeAreaView></KeyboardAvoidingView></Modal>;
}
function FieldError({ children, errors }: { children: React.ReactNode; errors: (string | undefined)[] }) { return <View>{children}{errors.filter(Boolean).map((error)=><Text key={error} accessibilityRole="alert" style={styles.error}>{error}</Text>)}</View>; }
const DRIVER_AGES = Array.from({ length: CAR_AGE.max - CAR_AGE.min + 1 }, (_, index) => CAR_AGE.min + index);
const AGE_ROW_HEIGHT = 56;

function AgeSheet({ visible, age, onConfirm, onClose }: { visible: boolean; age?: number; onConfirm: (age: number) => void; onClose: () => void }) {
  const ft = useFlowTheme();
  const listRef = useRef<FlatList<number>>(null);
  const [draftAge, setDraftAge] = useState<number | undefined>(age);
  const selectedIndex = age === undefined ? -1 : DRIVER_AGES.indexOf(age);
  useEffect(() => {
    if (!visible) return;
    setDraftAge(age);
    if (selectedIndex < 0) return;
    const frame = requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: selectedIndex, animated: false, viewPosition: 0.5 }));
    return () => cancelAnimationFrame(frame);
  }, [visible, age, selectedIndex]);
  return <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}><View style={styles.modalRoot}><Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close driver age picker" onPress={onClose}/><SafeAreaView edges={["bottom"]} style={styles.safeLayer} pointerEvents="box-none"><View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: ft.colors.surface }]}><PickerSheetHeader title="Driver age" onClose={onClose}/><FlatList ref={listRef} accessibilityRole="radiogroup" accessibilityLabel="Driver age options" data={DRIVER_AGES} keyExtractor={(item) => String(item)} getItemLayout={(_, index) => ({ length: AGE_ROW_HEIGHT, offset: AGE_ROW_HEIGHT * index, index })} onScrollToIndexFailed={({ index }) => listRef.current?.scrollToOffset({ offset: AGE_ROW_HEIGHT * index, animated: false })} style={[styles.ageList, { borderColor: ft.colors.border }]} renderItem={({ item }) => { const selected = draftAge === item; const label = `${item} years old`; return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => setDraftAge(item)} style={[styles.ageChoice, { backgroundColor: ft.colors.surface, borderBottomColor: ft.colors.border }, selected && { backgroundColor: ft.colors.selected }]}><Text numberOfLines={1} style={[styles.ageLabel, { color: ft.colors.text }, selected && { color: ft.colors.selectedPrimaryText }]}>{label}</Text><View importantForAccessibility="no-hide-descendants" style={[styles.ageIndicator, { borderColor: selected ? ft.colors.selectedBorder : ft.colors.icon }, selected && { backgroundColor: ft.colors.selectedBorder }]}>{selected ? <FlowIcon name="check" color="white" size={14}/> : null}</View></Pressable>; }}/><PrimaryButton label="Done" icon={null} disabled={draftAge === undefined} onPress={() => { if (draftAge !== undefined) onConfirm(draftAge); }}/></View></SafeAreaView></View></Modal>;
}
const styles = StyleSheet.create({ checkboxRow:{minHeight:52,flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:12},checkbox:{width:24,height:24,borderRadius:5,borderWidth:1,borderColor:flowColors.border,alignItems:"center",justifyContent:"center"},checked:{backgroundColor:flowColors.blue,borderColor:flowColors.blue},pad:{padding:8},error:{color:"#A21D25",fontSize:12,lineHeight:18,paddingHorizontal:12,paddingVertical:5},modalRoot:{flex:1,justifyContent:"flex-end"},safeLayer:{flex:1,justifyContent:"flex-end"},sheet:{height:"72%",borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,gap:12},cancel:{minHeight:44,alignItems:"center",justifyContent:"center"},link:{color:flowColors.blue,fontWeight:"800"},keyboardViewport:{flex:1},locationOverlay:{flex:1,justifyContent:"flex-end"},locationSheet:{maxHeight:"82%",minHeight:360,borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,gap:12},searchRow:{minHeight:52,borderWidth:1,borderRadius:10,paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:10},searchInput:{flex:1,minHeight:48,fontSize:15},locationList:{paddingBottom:4},locationChoice:{minHeight:68,borderBottomWidth:1,borderLeftWidth:3,borderLeftColor:"transparent",paddingVertical:10,paddingHorizontal:8,flexDirection:"row",alignItems:"center",gap:10},resultIcon:{width:40,height:40,borderRadius:20,alignItems:"center",justifyContent:"center"},resultCopy:{flex:1,gap:3},locationStatus:{paddingVertical:28,textAlign:"center"},ageList:{flex:1,borderWidth:1,borderRadius:12},ageChoice:{height:AGE_ROW_HEIGHT,borderBottomWidth:1,paddingHorizontal:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},ageLabel:{flex:1,fontSize:15,fontWeight:"600"},ageIndicator:{width:22,height:22,borderRadius:11,borderWidth:1,alignItems:"center",justifyContent:"center"} });
