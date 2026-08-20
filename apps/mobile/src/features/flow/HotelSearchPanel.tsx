import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Field, PrimaryButton, UnavailableNotice } from "./FlowPrimitives";
import { FlowIcon } from "./FlowIcon";
import { flowColors, useFlowTheme } from "./flowStyles";
import { LocalCalendarModal } from "./LocalCalendarModal";
import { travelApi, TravelApiError, type HotelDestinationSuggestion } from "../../api/travelApi";
import { addCalendarDays, HOTEL_LIMITS, countLabel, firstParam, hotelSearchParams, initializeHotelForm, localDateFromIso, localIsoDate, type HotelForm, type RouteValue, validateHotelForm } from "./hotelSearchModel";

export type HotelSearchHandle = { useDestination: (destination: string) => void };
type Props = { params: Record<string, RouteValue>; embedded?: boolean; showSubmit?: boolean; submitLabel?: string };
const displayDate = (iso: string) => localDateFromIso(iso)?.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) ?? iso;

export const HotelSearchPanel = forwardRef<HotelSearchHandle, Props>(function HotelSearchPanel({ params, embedded = false, showSubmit = true, submitLabel = "Search hotels" }, ref) {
  const ft = useFlowTheme();
  const initial = useRef<ReturnType<typeof initializeHotelForm> | undefined>(undefined);
  if (!initial.current) {
    const initialized = initializeHotelForm(params);
    const hasDates = Boolean(firstParam(params.checkIn) && firstParam(params.checkOut));
    const hasCounts = Boolean(firstParam(params.guests) || firstParam(params.rooms));
    initial.current = {
      ...initialized,
      form: {
        ...initialized.form,
        ...(!hasDates ? { checkIn: "", checkOut: "" } : {}),
        ...(!hasCounts ? { guests: 1, rooms: 1 } : {}),
      },
    };
  }
  const [form, setForm] = useState<HotelForm>(initial.current.form);
  const [errors, setErrors] = useState<ReturnType<typeof validateHotelForm>>({});
  const [notice, setNotice] = useState(initial.current.notice);
  const [calendar, setCalendar] = useState<"checkIn" | "checkOut" | undefined>();
  const [countsOpen, setCountsOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [adultCount, setAdultCount] = useState(initial.current.form.guests);
  const [childCount, setChildCount] = useState(0);
  const [petFriendly, setPetFriendly] = useState(false);
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
    if (Object.keys(nextErrors).length) { setNotice("Please correct the highlighted search details."); if (nextErrors.destination) setDestinationOpen(true); return; }
    router.push({ pathname: "/hotel-results", params: hotelSearchParams(form) });
  };
  const chooseDate = (iso: string) => {
    if (calendar === "checkIn") {
      const adjusted = !form.checkOut || iso >= form.checkOut;
      update({ ...form, checkIn: iso, checkOut: adjusted ? "" : form.checkOut });
      setErrors((value) => ({ ...value, checkIn: undefined, checkOut: undefined }));
      setCalendar("checkOut");
    } else {
      update({ ...form, checkOut: iso });
      setErrors((value) => ({ ...value, checkOut: undefined }));
      setCalendar(undefined);
    }
  };
  const datesValue = form.checkIn && form.checkOut ? `${displayDate(form.checkIn)} — ${displayDate(form.checkOut)}` : "Check-in — Check-out";
  return <View style={[!embedded && ft.styles.card, !embedded && ft.styles.shadow]}>
    <Pressable accessibilityRole="button" onPress={() => setDestinationOpen(true)}><View style={styles.inputField}><View style={styles.locationFieldRow}><FlowIcon name="location" size={22} color={ft.colors.icon}/><View style={styles.locationFieldContent}><Text style={ft.styles.label}>Destination</Text><TextInput ref={destinationRef} accessibilityLabel="Hotel destination" value={form.destination} editable={false} pointerEvents="none" placeholder="City, area, or hotel" placeholderTextColor={ft.colors.placeholder} style={[styles.input, { color: ft.colors.text }]}/></View></View>{errors.destination ? <Text accessibilityRole="alert" style={styles.error}>{errors.destination}</Text> : null}</View></Pressable>
    <Field label="Travel dates" value={datesValue} icon="calendar" trailing={<FlowIcon name="chevron" size={18}/>} onPress={() => setCalendar("checkIn")}/>
    {errors.checkIn || errors.checkOut ? <Text accessibilityRole="alert" style={styles.error}>{errors.checkIn || errors.checkOut}</Text> : null}
    <Field label="Guests" value={`${countLabel(form.guests, "guest")}, ${countLabel(form.rooms, "room")}`} icon="person" trailing={<FlowIcon name="chevron" size={18}/>} onPress={() => setCountsOpen(true)}/>
    {errors.guests || errors.rooms ? <Text accessibilityRole="alert" style={styles.error}>{errors.guests || errors.rooms}</Text> : null}
    {notice ? <UnavailableNotice text={notice}/> : null}
    {showSubmit ? <View style={styles.pad}><PrimaryButton label={submitLabel} onPress={submit}/></View> : null}
    <LocalCalendarModal visible={Boolean(calendar)} title={calendar === "checkOut" ? "Choose check-out date" : "Choose check-in date"} selected={calendar ? form[calendar] : form.checkIn} minimum={calendar === "checkOut" && form.checkIn ? addCalendarDays(form.checkIn, 1) : localIsoDate(new Date())} onChoose={chooseDate} onClose={() => setCalendar(undefined)}/>
    <HotelDestinationSheet visible={destinationOpen} value={form.destination} onDone={(destination) => { update({ ...form, destination }); if (destination.trim()) setErrors((current) => ({ ...current, destination: undefined })); setDestinationOpen(false); destinationRef.current?.focus(); }} onCancel={() => setDestinationOpen(false)}/>
    <HotelGuestsRoomsSheet visible={countsOpen} adults={adultCount} children={childCount} rooms={form.rooms} petFriendly={petFriendly} onDone={(draft) => { setAdultCount(draft.adults); setChildCount(draft.children); setPetFriendly(draft.petFriendly); update({ ...form, guests: draft.adults + draft.children, rooms: draft.rooms }); setErrors((value) => ({ ...value, guests: undefined, rooms: undefined })); setCountsOpen(false); }} onCancel={() => setCountsOpen(false)}/>
  </View>;
});

function HotelDestinationSheet({ visible, value, onDone, onCancel }: { visible: boolean; value: string; onDone: (destination: string) => void; onCancel: () => void }) {
  const ft = useFlowTheme();
  const inputRef = useRef<TextInput>(null);
  const requestSequence = useRef(0);
  const [query, setQuery] = useState(value);
  const [draft, setDraft] = useState(value);
  const [suggestions, setSuggestions] = useState<HotelDestinationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!visible) return;
    setQuery(value); setDraft(value); setSuggestions([]); setLoading(false); setError(false);
  }, [visible, value]);

  useEffect(() => {
    if (!visible || !trimmedQuery) { setSuggestions([]); setLoading(false); setError(false); return; }
    const controller = new AbortController();
    const sequence = ++requestSequence.current;
    const timer = setTimeout(async () => {
      setLoading(true); setError(false);
      try {
        const locale = Intl.DateTimeFormat().resolvedOptions().locale;
        const response = await travelApi.searchHotelDestinations(trimmedQuery, { signal: controller.signal, limit: 8, locale });
        if (sequence !== requestSequence.current || controller.signal.aborted) return;
        const valid = Array.isArray(response.suggestions) ? response.suggestions.filter((item) => item?.id && item?.name && item?.country && item?.searchValue).slice(0, 8) : [];
        setSuggestions(valid);
      } catch (requestError) {
        if (sequence !== requestSequence.current || controller.signal.aborted || (requestError instanceof TravelApiError && requestError.code === "cancelled")) return;
        setSuggestions([]); setError(true);
      } finally {
        if (sequence === requestSequence.current && !controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [trimmedQuery, visible]);

  const clear = () => { setQuery(""); setDraft(""); setSuggestions([]); setError(false); inputRef.current?.focus(); };
  return <Modal transparent animationType="slide" visible={visible} onRequestClose={onCancel}>
    <View style={styles.modalRoot}>
      <Pressable style={[StyleSheet.absoluteFill,{backgroundColor:ft.colors.overlay}]} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Close hotel destination picker"/>
      <KeyboardAvoidingView style={styles.keyboardViewport} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <SafeAreaView edges={["top", "bottom"]} style={styles.destinationOverlay} pointerEvents="box-none">
          <View accessibilityViewIsModal style={[styles.destinationSheet,{backgroundColor:ft.colors.surface}]}>
            <View style={styles.destinationHeader}><Text accessibilityRole="header" style={ft.styles.title}>Choose destination</Text><Pressable accessibilityRole="button" accessibilityLabel="Cancel destination changes" onPress={onCancel}><Text style={[styles.link,{color:ft.colors.selectedBorder}]}>Cancel</Text></Pressable></View>
            <View style={[styles.destinationSearch,{backgroundColor:ft.colors.input,borderColor:ft.colors.border}]}><FlowIcon name="location" size={20} color={ft.colors.icon}/><TextInput ref={inputRef} autoFocus accessibilityLabel="Search hotel destinations" placeholder="City, area, or hotel" placeholderTextColor={ft.colors.placeholder} value={query} onChangeText={(next) => { setQuery(next); setDraft(next); }} returnKeyType="search" style={[styles.destinationSearchInput,{color:ft.colors.text}]}/>{query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear destination" onPress={clear} hitSlop={8}><FlowIcon name="close" size={19} color={ft.colors.secondaryText}/></Pressable> : null}</View>
            {loading ? <Text style={[styles.destinationStatus,{color:ft.colors.secondaryText}]}>Finding destinations…</Text> : error ? <Text accessibilityRole="alert" style={[styles.destinationStatus,{color:ft.colors.secondaryText}]}>Couldn’t load destinations. Please try again.</Text> : <FlatList keyboardShouldPersistTaps="handled" data={suggestions} keyExtractor={(item) => item.id} contentContainerStyle={styles.destinationList} renderItem={({item}) => { const selected = draft === item.searchValue; const detail = item.region ? `${item.region} · ${item.country}` : item.country; return <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}, ${detail}`} accessibilityState={{selected}} onPress={() => { setDraft(item.searchValue); setQuery(item.searchValue); }} style={[styles.destinationChoice,{borderBottomColor:ft.colors.border},selected&&{backgroundColor:ft.colors.selected,borderLeftColor:ft.colors.selectedBorder}]}><View style={[styles.destinationIcon,{backgroundColor:ft.colors.input}]}><FlowIcon name="hotel" size={22} color={ft.colors.icon}/></View><View style={styles.rowCopy}><Text numberOfLines={1} style={[ft.styles.value,selected&&{color:ft.colors.selectedPrimaryText}]}>{item.name}</Text><Text numberOfLines={1} style={[ft.styles.meta,selected&&{color:ft.colors.selectedSecondaryText}]}>{detail}</Text></View></Pressable>; }} ListEmptyComponent={trimmedQuery ? <Text style={[styles.destinationStatus,{color:ft.colors.secondaryText}]}>No matching destinations yet</Text> : <Text style={[styles.destinationStatus,{color:ft.colors.secondaryText}]}>Start typing to find a destination.</Text>} />}
            <PrimaryButton label="Done" onPress={() => onDone(draft.trim())}/>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}

type GuestsRoomsDraft = { adults: number; children: number; rooms: number; petFriendly: boolean };
function HotelGuestsRoomsSheet({ visible, adults, children, rooms, petFriendly, onDone, onCancel }: GuestsRoomsDraft & { visible: boolean; onDone: (draft: GuestsRoomsDraft) => void; onCancel: () => void }) {
  const ft = useFlowTheme();
  const [draft, setDraft] = useState<GuestsRoomsDraft>({ adults, children, rooms, petFriendly });
  useEffect(() => { if (visible) setDraft({ adults, children, rooms, petFriendly }); }, [visible, adults, children, rooms, petFriendly]);
  const setCount = (key: "adults" | "children" | "rooms", value: number) => setDraft((current) => ({ ...current, [key]: value }));
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
    <View style={styles.modalRoot}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: ft.colors.overlay }]} accessibilityRole="button" accessibilityLabel="Close Guests & Rooms picker" onPress={onCancel}/>
      <SafeAreaView edges={["bottom"]} style={styles.sheetPosition} pointerEvents="box-none">
        <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: ft.colors.surface }]}>
          <Text accessibilityRole="header" style={ft.styles.title}>Guests &amp; Rooms</Text>
          <ScrollView bounces={false} contentContainerStyle={styles.sheetContent}>
            <PickerRow label="Adults" description="Ages 18+" value={draft.adults} minimum={1} maximum={HOTEL_LIMITS.guests.max - draft.children} onChange={(value) => setCount("adults", value)}/>
            <PickerRow label="Children" description="Ages 0–17" value={draft.children} minimum={0} maximum={HOTEL_LIMITS.guests.max - draft.adults} onChange={(value) => setCount("children", value)}/>
            <PickerRow label="Rooms" description="Separate rooms" value={draft.rooms} minimum={HOTEL_LIMITS.rooms.min} maximum={HOTEL_LIMITS.rooms.max} onChange={(value) => setCount("rooms", value)}/>
            <View style={[styles.pickerRow, { borderBottomColor: ft.colors.border }]}><View style={styles.rowCopy}><Text style={ft.styles.value}>Pet-friendly</Text><Text style={ft.styles.meta}>Only show stays that allow pets</Text></View><Switch accessibilityLabel="Pet-friendly" accessibilityRole="switch" accessibilityState={{ checked: draft.petFriendly }} value={draft.petFriendly} onValueChange={(value) => setDraft((current) => ({ ...current, petFriendly: value }))} trackColor={{ false: ft.colors.border, true: ft.colors.selectedBorder }} thumbColor={ft.colors.surface}/></View>
          </ScrollView>
          <PrimaryButton label="Done" onPress={() => onDone(draft)}/>
        </View>
      </SafeAreaView>
    </View>
  </Modal>;
}
function PickerRow({ label, description, value, minimum, maximum, onChange }: { label: string; description: string; value: number; minimum: number; maximum: number; onChange: (value: number) => void }) { const ft = useFlowTheme(); const minusDisabled = value <= minimum; const plusDisabled = value >= maximum; return <View style={[styles.pickerRow, { borderBottomColor: ft.colors.border }]}><View style={styles.rowCopy}><Text style={ft.styles.value}>{label}</Text><Text style={ft.styles.meta}>{description}</Text></View><View style={styles.counterActions}><CounterButton label={`Decrease ${label.toLowerCase()}`} disabled={minusDisabled} symbol="−" onPress={() => onChange(Math.max(minimum, value - 1))}/><Text accessibilityLabel={`${value} ${label.toLowerCase()}`} style={[styles.count, { color: ft.colors.text }]}>{value}</Text><CounterButton label={`Increase ${label.toLowerCase()}`} disabled={plusDisabled} symbol="+" onPress={() => onChange(Math.min(maximum, value + 1))}/></View></View>; }
function CounterButton({ label, disabled, symbol, onPress }: { label: string; disabled: boolean; symbol: string; onPress: () => void }) { const ft = useFlowTheme(); return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.control, { borderColor: disabled ? ft.colors.border : ft.colors.selectedBorder }, disabled && styles.disabled]}><Text style={[styles.controlText, { color: disabled ? ft.colors.secondaryText : ft.colors.selectedBorder }]}>{symbol}</Text></Pressable>; }
const styles = StyleSheet.create({ inputField:{minHeight:76,padding:12,borderBottomColor:flowColors.border,borderBottomWidth:1},locationFieldRow:{flexDirection:"row",alignItems:"center",gap:10},locationFieldContent:{flex:1},input:{minHeight:44,color:flowColors.navy,fontSize:14},pad:{padding:8},error:{color:"#A21D25",fontSize:12,lineHeight:18,paddingHorizontal:12,paddingVertical:5},modalRoot:{flex:1,justifyContent:"flex-end"},keyboardViewport:{flex:1},destinationOverlay:{flex:1,justifyContent:"flex-end"},destinationSheet:{borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,gap:14,maxHeight:"90%",minHeight:"55%"},destinationHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},destinationSearch:{minHeight:52,borderWidth:1,borderRadius:10,paddingHorizontal:14,flexDirection:"row",alignItems:"center",gap:10},destinationSearchInput:{flex:1,minWidth:0,fontSize:15},destinationList:{flexGrow:1},destinationChoice:{minHeight:76,flexDirection:"row",alignItems:"center",gap:12,borderBottomWidth:1,borderLeftWidth:3,paddingVertical:10,paddingHorizontal:8},destinationIcon:{width:46,height:46,borderRadius:12,alignItems:"center",justifyContent:"center"},destinationStatus:{minHeight:120,textAlign:"center",paddingVertical:36,fontSize:14},link:{fontSize:14,fontWeight:"700",paddingVertical:10},sheetPosition:{justifyContent:"flex-end",maxHeight:"90%"},sheet:{borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,gap:12,maxHeight:"100%"},sheetContent:{paddingBottom:4},control:{width:44,height:44,borderRadius:22,borderWidth:1,alignItems:"center",justifyContent:"center"},controlText:{fontSize:24},disabled:{opacity:.4},pickerRow:{minHeight:72,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12,borderBottomWidth:1},rowCopy:{flex:1,minWidth:0,gap:2},counterActions:{flexDirection:"row",alignItems:"center",gap:8},count:{minWidth:24,textAlign:"center",fontSize:17,fontWeight:"800"} });
