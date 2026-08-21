import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { FlowIcon } from "./FlowIcon";
import { PrimaryButton } from "./FlowPrimitives";
import { useFlowTheme } from "./flowStyles";
import { searchAirports, type Airport } from "./airportData";
import { HotelDestinationSheet } from "./HotelSearchPanel";
import { CarRentalDatesSheet } from "./CarSearchPickers";
import { rentalTimesSummary } from "./carSearchModel";
import { CarTimeRangeSheet } from "./CarSearchPickers";
import { applyPackageDates, applyPackageDestination, createPackageSearch, includedProducts, packageModes, transitionPackageMode, updatePackageParty, type PackageMode, type PackageSearch } from "./packageSearchModel";

const dateText = (value: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Select";

export function PackageSearchForm({ presentation }: { presentation: "home" | "standalone" }) {
  const ft = useFlowTheme();
  const [search, setSearch] = useState(createPackageSearch);
  const travelerCount = search.adults + search.children + search.infants;
  const [airportField, setAirportField] = useState<"origin" | "destination">();
  const [hotelDestinationOpen, setHotelDestinationOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [timesOpen, setTimesOpen] = useState(false);
  const included = includedProducts(search.mode);
  const chooseAirport = (airport: Airport) => {
    const text = `${airport.city} (${airport.code})`;
    setSearch(current => airportField === "origin" ? { ...current, origin: text, originCode: airport.code } : applyPackageDestination(current, text, airport.code));
    setAirportField(undefined);
  };
  const submit = () => {
    // Native has no combined package journey. Preserve the pre-existing final-child handoff.
    if (included.car) router.push({ pathname: "/car-results", params: { pickupLocation: search.carPickupLocation, pickupDate: search.carPickupDate, dropoffDate: search.carReturnDate, pickupTime: search.carPickupTime, dropoffTime: search.carReturnTime, driverAge: String(search.carDriverAge) } });
    else router.push({ pathname: "/hotel-results", params: { destination: search.destination, checkIn: search.startDate, checkOut: search.endDate, guests: String(search.adults + search.children), rooms: String(search.rooms) } });
  };
  return <>
    <View accessibilityRole="radiogroup" accessibilityLabel="Choose package type">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.rail, presentation === "standalone" && styles.standaloneRail]}>
        {packageModes.map(option => { const selected = search.mode === option.value; return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected, selected }} onPress={() => setSearch(current => transitionPackageMode(current, option.value))} style={[styles.mode, selected && { borderBottomColor: ft.colors.selectedBorder }]}><Text style={[styles.modeText, { color: selected ? ft.colors.selectedBorder : ft.colors.secondaryText }]}>{option.label}</Text></Pressable>; })}
      </ScrollView>
    </View>
    <View style={[styles.fields, { borderColor: ft.colors.border, backgroundColor: ft.colors.input }]}>
      {included.flight ? <CompactField label="Origin" value={search.origin || "City or airport"} muted={!search.origin} icon="location" onPress={() => setAirportField("origin")}/> : null}
      <CompactField label="Destination" value={search.destination || "Select destination"} muted={!search.destination} icon="location" onPress={() => included.flight ? setAirportField("destination") : setHotelDestinationOpen(true)}/>
      <CompactField label="Travel dates" value={search.startDate ? `${dateText(search.startDate)} — ${dateText(search.endDate)}` : "Choose dates"} muted={!search.startDate} icon="calendar" onPress={() => setDatesOpen(true)}/>
      <CompactField label={included.hotel ? "Travelers & Rooms" : "Travelers"} value={`${travelerCount} ${travelerCount === 1 ? "traveler" : "travelers"}${included.hotel ? ` · ${search.rooms} ${search.rooms === 1 ? "room" : "rooms"}` : ""}`} icon="person" onPress={() => setPartyOpen(true)}/>
      {included.car ? <CompactField label="Pick-up / Return time" value={rentalTimesSummary(search.carPickupTime, search.carReturnTime)} icon="clock" onPress={() => setTimesOpen(true)}/> : null}
    </View>
    <View style={styles.submit}><PrimaryButton label="Search package" icon="search" onPress={submit}/></View>
    <AirportSheet visible={Boolean(airportField)} title={airportField === "origin" ? "Choose origin" : "Choose destination"} onChoose={chooseAirport} onClose={() => setAirportField(undefined)}/>
    <HotelDestinationSheet visible={hotelDestinationOpen} value={search.destination} onDone={destination => { setSearch(current => applyPackageDestination(current, destination)); setHotelDestinationOpen(false); }} onCancel={() => setHotelDestinationOpen(false)}/>
    <CarRentalDatesSheet visible={datesOpen} title="Travel dates" pickupDate={search.startDate} returnDate={search.endDate} onDone={(start, end) => { setSearch(current => applyPackageDates(current, start, end)); setDatesOpen(false); }} onCancel={() => setDatesOpen(false)}/>
    <PackagePartySheet visible={partyOpen} search={search} onDone={next => { setSearch(next); setPartyOpen(false); }} onClose={() => setPartyOpen(false)}/>
    <CarTimeRangeSheet visible={timesOpen} pickupTime={search.carPickupTime} returnTime={search.carReturnTime} onDone={(carPickupTime, carReturnTime) => { setSearch(current => ({ ...current, carPickupTime, carReturnTime })); setTimesOpen(false); }} onCancel={() => setTimesOpen(false)}/>
  </>;
}

function CompactField({ label, value, icon, muted, onPress }: { label: string; value: string; icon: "location" | "calendar" | "person" | "clock"; muted?: boolean; onPress: () => void }) { const ft = useFlowTheme(); return <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} onPress={onPress} style={[styles.field, { borderBottomColor: ft.colors.border }]}><Text style={[styles.label, { color: ft.colors.secondaryText }]}>{label.toUpperCase()}</Text><View style={styles.valueRow}><FlowIcon name={icon} size={18} color={ft.colors.icon}/><Text numberOfLines={1} style={[styles.value, { color: muted ? ft.colors.placeholder : ft.colors.text }]}>{value}</Text><FlowIcon name="chevron" size={16} color={ft.colors.icon}/></View></Pressable>; }

function AirportSheet({ visible, title, onChoose, onClose }: { visible: boolean; title: string; onChoose: (airport: Airport) => void; onClose: () => void }) { const ft = useFlowTheme(); const [query, setQuery] = useState(""); useEffect(() => { if (visible) setQuery(""); }, [visible]); const choices = useMemo(() => searchAirports(query, 12), [query]); return <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}><KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : "height"}><Pressable style={[StyleSheet.absoluteFill, { backgroundColor: ft.colors.overlay }]} accessibilityRole="button" accessibilityLabel="Close airport search" onPress={onClose}/><View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: ft.colors.surface }]}><Text accessibilityRole="header" style={ft.styles.title}>{title}</Text><TextInput autoFocus accessibilityLabel="Search airports" value={query} onChangeText={setQuery} placeholder="City or airport" placeholderTextColor={ft.colors.placeholder} style={[styles.airportInput, { color: ft.colors.text, borderColor: ft.colors.border }]}/><ScrollView keyboardShouldPersistTaps="handled">{choices.map(airport => <Pressable key={airport.code} accessibilityRole="button" onPress={() => onChoose(airport)} style={[styles.choice, { borderBottomColor: ft.colors.border }]}><Text style={ft.styles.value}>{airport.city} ({airport.code})</Text><Text style={ft.styles.meta}>{airport.name}</Text></Pressable>)}</ScrollView><Pressable onPress={onClose} style={styles.cancel}><Text style={{ color: ft.colors.selectedBorder, fontWeight: "800" }}>Cancel</Text></Pressable></View></KeyboardAvoidingView></Modal>; }

function PackagePartySheet({ visible, search, onDone, onClose }: { visible: boolean; search: PackageSearch; onDone: (value: PackageSearch) => void; onClose: () => void }) { const ft = useFlowTheme(); const [draft, setDraft] = useState(search); useEffect(() => { if (visible) setDraft(search); }, [visible, search]); const included = includedProducts(search.mode); if (!visible) return null; const row = (label: "Adults" | "Children" | "Infants" | "Rooms", key: "adults" | "children" | "infants" | "rooms") => <View style={[styles.counterRow, { borderBottomColor: ft.colors.border }]}><Text style={ft.styles.value}>{label}</Text><View style={styles.counter}><Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} onPress={() => setDraft(current => updatePackageParty(current, { [key]: current[key] - 1 }))} style={styles.counterButton}><Text style={{ color: ft.colors.selectedBorder, fontSize: 22 }}>−</Text></Pressable><Text style={[ft.styles.value, styles.number]}>{draft[key]}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} onPress={() => setDraft(current => updatePackageParty(current, { [key]: current[key] + 1 }))} style={styles.counterButton}><Text style={{ color: ft.colors.selectedBorder, fontSize: 22 }}>+</Text></Pressable></View></View>; return <Modal transparent animationType="slide" visible onRequestClose={onClose}><View style={styles.modalRoot}><Pressable style={[StyleSheet.absoluteFill, { backgroundColor: ft.colors.overlay }]} accessibilityRole="button" accessibilityLabel="Close Travelers & Rooms picker" onPress={onClose}/><View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: ft.colors.surface }]}><Text accessibilityRole="header" style={ft.styles.title}>{included.hotel ? "Travelers & Rooms" : "Travelers"}</Text>{row("Adults", "adults")}{row("Children", "children")}{included.flight ? row("Infants", "infants") : null}{included.hotel ? row("Rooms", "rooms") : null}{included.hotel ? <View style={styles.pet}><View><Text style={ft.styles.value}>Pet-friendly</Text><Text style={ft.styles.meta}>Only show pet-friendly stays</Text></View><Switch value={draft.petFriendly} onValueChange={petFriendly => setDraft(current => ({ ...current, petFriendly }))}/></View> : null}<PrimaryButton label="Done" icon="check" onPress={() => onDone(draft)}/></View></View></Modal>; }

const styles = StyleSheet.create({ rail:{flexDirection:"row",flexWrap:"nowrap",borderBottomWidth:1,paddingHorizontal:6},standaloneRail:{minHeight:46},mode:{height:42,justifyContent:"center",paddingHorizontal:10,borderBottomWidth:2,borderBottomColor:"transparent"},modeText:{fontSize:12,fontWeight:"700"},fields:{borderWidth:1,borderRadius:11,overflow:"hidden",margin:10},field:{minHeight:66,paddingHorizontal:12,paddingVertical:9,borderBottomWidth:1,justifyContent:"center",gap:4},label:{fontSize:10,fontWeight:"800",letterSpacing:.5},valueRow:{flexDirection:"row",alignItems:"center",gap:9},value:{fontSize:15,fontWeight:"600",flex:1},submit:{paddingHorizontal:10,paddingBottom:10},modalRoot:{flex:1,justifyContent:"flex-end"},sheet:{maxHeight:"86%",borderTopLeftRadius:24,borderTopRightRadius:24,padding:18,gap:8},airportInput:{minHeight:48,borderWidth:1,borderRadius:9,paddingHorizontal:12,fontSize:15},choice:{paddingVertical:12,borderBottomWidth:1},cancel:{height:44,alignItems:"center",justifyContent:"center"},counterRow:{minHeight:68,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1},counter:{flexDirection:"row",alignItems:"center",gap:7},counterButton:{width:42,height:42,borderRadius:21,alignItems:"center",justifyContent:"center"},number:{width:28,textAlign:"center"},pet:{minHeight:68,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},fieldsStandalone:{marginTop:8} });
