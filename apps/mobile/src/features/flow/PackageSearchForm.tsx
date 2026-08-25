import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ArrowRightLeft, Baby, BedDouble, Minus, PersonStanding, Plus, UserRound, type LucideIcon } from "lucide-react-native";
import { CompactSearchField, PrimaryButton } from "./FlowPrimitives";
import { useFlowTheme } from "./flowStyles";
import { searchAirports, type Airport } from "./airportData";
import { HotelDestinationSheet } from "./HotelSearchPanel";
import { CarRentalDatesSheet } from "./CarSearchPickers";
import { applyPackageDates, applyPackageDestination, createPackageSearch, includedProducts, packageModes, swapPackageAirports, transitionPackageMode, updatePackageParty, type PackageMode, type PackageSearch } from "./packageSearchModel";
import { fetchHomepageDefaultOrigin } from "../home/homepageDefaultOrigin";

const dateText = (value: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Select";

export function PackageSearchForm({ presentation }: { presentation: "home" | "standalone" }) {
  const ft = useFlowTheme();
  const [search, setSearch] = useState(createPackageSearch);
  const travelerCount = search.adults + search.children + search.infants;
  const [airportField, setAirportField] = useState<"origin" | "destination">();
  const [hotelDestinationOpen, setHotelDestinationOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const userControlsOrigin = useRef(false);
  const included = includedProducts(search.mode);
  useEffect(() => {
    if (!included.flight || search.origin.trim() || search.originCode.trim() || userControlsOrigin.current) return;

    let active = true;
    void fetchHomepageDefaultOrigin().then(airport => {
      if (!active || !airport || userControlsOrigin.current) return;

      const origin = `${airport.city} (${airport.code})`;
      setSearch(current => {
        if (current.origin.trim() || current.originCode.trim() || userControlsOrigin.current) return current;
        return { ...current, origin, originCode: airport.code };
      });
    }).catch(() => undefined);

    return () => { active = false; };
  }, [included.flight, search.origin, search.originCode]);
  const chooseAirport = (airport: Airport) => {
    const text = `${airport.city} (${airport.code})`;
    if (airportField === "origin") userControlsOrigin.current = true;
    setSearch(current => airportField === "origin" ? { ...current, origin: text, originCode: airport.code } : applyPackageDestination(current, text, airport.code));
    setAirportField(undefined);
  };
  const swapAirports = () => {
    userControlsOrigin.current = true;
    setSearch(current => swapPackageAirports(current));
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
      {included.flight ? <View style={styles.originBoundary}>
        <CompactSearchField label="Origin" value={search.origin || "City or airport"} muted={!search.origin} icon="location" onPress={() => { userControlsOrigin.current = true; setAirportField("origin"); }}/>
        <Pressable accessibilityRole="button" accessibilityLabel="Swap origin and destination" onPress={swapAirports} style={({ pressed }) => [styles.swapTarget, pressed && ft.styles.pressed]}>
          <View style={[styles.swapCircle, { backgroundColor: ft.colors.surface, borderColor: ft.colors.border, shadowColor: ft.colors.shadow }]}>
            <ArrowRightLeft accessible={false} size={17} color={ft.colors.blue}/>
          </View>
        </Pressable>
      </View> : null}
      <CompactSearchField label="Destination" value={search.destination || "Where to?"} muted={!search.destination} icon="location" onPress={() => included.flight ? setAirportField("destination") : setHotelDestinationOpen(true)}/>
      <CompactSearchField label="Travel dates" value={search.startDate ? `${dateText(search.startDate)} — ${dateText(search.endDate)}` : "Choose dates"} muted={!search.startDate} icon="calendar" onPress={() => setDatesOpen(true)}/>
      <CompactSearchField label={included.hotel ? "Travelers & Rooms" : "Travelers"} value={`${travelerCount} ${travelerCount === 1 ? "traveler" : "travelers"}${included.hotel ? ` · ${search.rooms} ${search.rooms === 1 ? "room" : "rooms"}` : ""}`} icon="person" onPress={() => setPartyOpen(true)}/>
    </View>
    <View style={styles.submit}><PrimaryButton label="Search package" icon={null} onPress={submit}/></View>
    <AirportSheet visible={Boolean(airportField)} title={airportField === "origin" ? "Choose origin" : "Choose destination"} onChoose={chooseAirport} onClose={() => setAirportField(undefined)}/>
    <HotelDestinationSheet visible={hotelDestinationOpen} value={search.destination} onDone={destination => { setSearch(current => applyPackageDestination(current, destination)); setHotelDestinationOpen(false); }} onCancel={() => setHotelDestinationOpen(false)}/>
    <CarRentalDatesSheet visible={datesOpen} title="Travel dates" pickupDate={search.startDate} returnDate={search.endDate} onDone={(start, end) => { setSearch(current => applyPackageDates(current, start, end)); setDatesOpen(false); }} onCancel={() => setDatesOpen(false)}/>
    <PackagePartySheet visible={partyOpen} search={search} onDone={next => { setSearch(next); setPartyOpen(false); }} onClose={() => setPartyOpen(false)}/>
  </>;
}

function AirportSheet({ visible, title, onChoose, onClose }: { visible: boolean; title: string; onChoose: (airport: Airport) => void; onClose: () => void }) { const ft = useFlowTheme(); const [query, setQuery] = useState(""); useEffect(() => { if (visible) setQuery(""); }, [visible]); const choices = useMemo(() => searchAirports(query, 12), [query]); return <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}><KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : "height"}><Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close airport search" onPress={onClose}/><View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: ft.colors.surface }]}><Text accessibilityRole="header" style={ft.styles.title}>{title}</Text><TextInput autoFocus accessibilityLabel="Search airports" value={query} onChangeText={setQuery} placeholder="City or airport" placeholderTextColor={ft.colors.placeholder} style={[styles.airportInput, { color: ft.colors.text, borderColor: ft.colors.border }]}/><ScrollView keyboardShouldPersistTaps="handled">{choices.map(airport => <Pressable key={airport.code} accessibilityRole="button" onPress={() => onChoose(airport)} style={[styles.choice, { borderBottomColor: ft.colors.border }]}><Text style={ft.styles.value}>{airport.city} ({airport.code})</Text><Text style={ft.styles.meta}>{airport.name}</Text></Pressable>)}</ScrollView><Pressable onPress={onClose} style={styles.cancel}><Text style={{ color: ft.colors.selectedBorder, fontWeight: "800" }}>Cancel</Text></Pressable></View></KeyboardAvoidingView></Modal>; }

const PACKAGE_TRAVELER_ROWS = [
  { key: "adults", label: "Adults", description: "18+ years", icon: UserRound },
  { key: "children", label: "Children", description: "Ages 2–17", icon: PersonStanding },
  { key: "infants", label: "Infants on lap", description: "Under 2 years", icon: Baby },
] as const;

function PackagePartySheet({ visible, search, onDone, onClose }: { visible: boolean; search: PackageSearch; onDone: (value: PackageSearch) => void; onClose: () => void }) {
  const ft = useFlowTheme();
  const [draft, setDraft] = useState(search);
  useEffect(() => { if (visible) setDraft(search); }, [visible, search]);
  const included = includedProducts(search.mode);
  if (!visible) return null;

  const maximumTravelers = included.flight ? 9 : 12;
  const totalTravelers = draft.adults + draft.children + draft.infants;
  const travelerRows = included.flight ? PACKAGE_TRAVELER_ROWS : PACKAGE_TRAVELER_ROWS.slice(0, 2);
  const updateCount = (key: "adults" | "children" | "infants" | "rooms", value: number) => {
    setDraft(current => updatePackageParty(current, { [key]: value }));
  };

  return <Modal transparent animationType="slide" visible onRequestClose={onClose}>
    <View style={styles.modalRoot}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close Travelers & Rooms picker" onPress={onClose}/>
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: ft.colors.surface }]}>
        <Text accessibilityRole="header" style={ft.styles.title}>{included.hotel ? "Travelers & Rooms" : "Travelers"}</Text>
        <ScrollView bounces={false} contentContainerStyle={styles.partyContent}>
          <View style={[styles.partyCard, { backgroundColor: ft.colors.input, borderColor: ft.colors.border }]}>
            {travelerRows.map((row, index) => {
              const value = draft[row.key];
              const decreaseDisabled = value <= (row.key === "adults" ? 1 : 0);
              const increaseDisabled = totalTravelers >= maximumTravelers || (row.key === "infants" && value >= draft.adults);
              return <View key={row.key}>
                <PackagePartyRow icon={row.icon} label={row.label} description={row.description} value={value} decreaseDisabled={decreaseDisabled} increaseDisabled={increaseDisabled} onDecrease={() => updateCount(row.key, value - 1)} onIncrease={() => updateCount(row.key, value + 1)}/>
                {index < travelerRows.length - 1 ? <View style={[styles.partyDivider, { backgroundColor: ft.colors.border }]}/> : null}
              </View>;
            })}
          </View>
          {included.hotel ? <View style={[styles.partyCard, { backgroundColor: ft.colors.input, borderColor: ft.colors.border }]}>
            <PackagePartyRow icon={BedDouble} label="Rooms" description="Separate rooms" value={draft.rooms} decreaseDisabled={draft.rooms <= 1} increaseDisabled={draft.rooms >= 6} onDecrease={() => updateCount("rooms", draft.rooms - 1)} onIncrease={() => updateCount("rooms", draft.rooms + 1)}/>
            <View style={[styles.partyDivider, { backgroundColor: ft.colors.border }]}/>
            <View style={styles.petRow}>
              <View style={styles.partyCopy}>
                <Text style={ft.styles.value}>Pet-friendly rooms</Text>
                <Text style={ft.styles.meta}>Only show stays that allow pets</Text>
              </View>
              <View style={styles.petSwitchSlot}>
                <Switch accessibilityLabel="Pet-friendly rooms" accessibilityRole="switch" accessibilityState={{ checked: draft.petFriendly }} value={draft.petFriendly} onValueChange={petFriendly => setDraft(current => ({ ...current, petFriendly }))} trackColor={{ false: ft.colors.border, true: ft.colors.selectedBorder }} thumbColor={ft.colors.surface}/>
              </View>
            </View>
          </View> : null}
        </ScrollView>
        <PrimaryButton label="Done" icon={null} onPress={() => onDone(draft)}/>
      </View>
    </View>
  </Modal>;
}

function PackagePartyRow({ icon: Icon, label, description, value, decreaseDisabled, increaseDisabled, onDecrease, onIncrease }: { icon: LucideIcon; label: string; description: string; value: number; decreaseDisabled: boolean; increaseDisabled: boolean; onDecrease: () => void; onIncrease: () => void }) {
  const ft = useFlowTheme();
  return <View style={styles.partyRow}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.partyIcon, { backgroundColor: ft.colors.selected }]}>
      <Icon size={23} color={ft.colors.selectedBorder}/>
    </View>
    <View style={styles.partyCopy}>
      <Text style={ft.styles.value}>{label}</Text>
      <Text style={ft.styles.meta}>{description}</Text>
    </View>
    <View style={styles.partyCounter}>
      <PackageCounterButton label={`Decrease ${label}`} disabled={decreaseDisabled} icon={Minus} onPress={onDecrease}/>
      <Text accessibilityLabel={`${value} ${label}`} style={[styles.partyNumber, { color: ft.colors.text }]}>{value}</Text>
      <PackageCounterButton label={`Increase ${label}`} disabled={increaseDisabled} icon={Plus} onPress={onIncrease}/>
    </View>
  </View>;
}

function PackageCounterButton({ label, disabled, icon: Icon, onPress }: { label: string; disabled: boolean; icon: LucideIcon; onPress: () => void }) {
  const ft = useFlowTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.partyCounterTarget, pressed && !disabled && ft.styles.pressed]}>
    <View style={[styles.partyCounterCircle, { borderColor: disabled ? ft.colors.border : ft.colors.selectedBorder }, disabled && styles.partyDisabled]}>
      <Icon accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" size={19} color={disabled ? ft.colors.secondaryText : ft.colors.selectedBorder}/>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({ rail:{flexDirection:"row",flexWrap:"nowrap",borderBottomWidth:1,paddingHorizontal:6},standaloneRail:{minHeight:46},mode:{height:42,justifyContent:"center",paddingHorizontal:10,borderBottomWidth:2,borderBottomColor:"transparent"},modeText:{fontSize:12,fontWeight:"700"},fields:{borderWidth:1,borderRadius:11,margin:10},originBoundary:{position:"relative",zIndex:1},swapTarget:{position:"absolute",left:"50%",bottom:-22,transform:[{translateX:-22}],width:44,height:44,alignItems:"center",justifyContent:"center",zIndex:2},swapCircle:{width:36,height:36,borderRadius:18,borderWidth:1,alignItems:"center",justifyContent:"center",shadowOpacity:0.12,shadowRadius:4,shadowOffset:{width:0,height:2},elevation:3},submit:{paddingHorizontal:10,paddingBottom:10},modalRoot:{flex:1,justifyContent:"flex-end"},sheet:{maxHeight:"86%",borderTopLeftRadius:24,borderTopRightRadius:24,padding:18,gap:12},airportInput:{minHeight:48,borderWidth:1,borderRadius:9,paddingHorizontal:12,fontSize:15},choice:{paddingVertical:12,borderBottomWidth:1},cancel:{height:44,alignItems:"center",justifyContent:"center"},partyContent:{gap:18,paddingBottom:4},partyCard:{borderWidth:1,borderRadius:12,overflow:"hidden"},partyDivider:{height:1,marginHorizontal:14},partyRow:{minHeight:88,flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:14,paddingVertical:12},partyIcon:{width:44,height:44,borderRadius:22,flexShrink:0,alignItems:"center",justifyContent:"center"},partyCopy:{flex:1,minWidth:0,gap:2},partyCounter:{flexShrink:0,flexDirection:"row",alignItems:"center",gap:4},partyCounterTarget:{width:44,height:44,alignItems:"center",justifyContent:"center"},partyCounterCircle:{width:40,height:40,borderRadius:20,borderWidth:1,alignItems:"center",justifyContent:"center"},partyDisabled:{opacity:.42},partyNumber:{minWidth:28,textAlign:"center",fontSize:16,fontWeight:"800",fontVariant:["tabular-nums"]},petRow:{minHeight:80,flexDirection:"row",alignItems:"center",gap:12,paddingHorizontal:14,paddingVertical:12},petSwitchSlot:{width:52,flexShrink:0,alignItems:"flex-end",justifyContent:"center"},fieldsStandalone:{marginTop:8} });
