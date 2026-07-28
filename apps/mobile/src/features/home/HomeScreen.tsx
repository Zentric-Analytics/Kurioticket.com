import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { readSession } from "../../storage/sessionStorage";
import { colors } from "../../theme/tokens";
import { ProductTabs, type SearchProduct } from "./ProductTabs";
import { HotelSearchForm } from "./HotelSearchForm";
import { CarSearchForm } from "./CarSearchForm";
import { DealsSearchForm } from "./DealsSearchForm";

export type TripType = "round-trip" | "one-way" | "multi-city";
export type Airport = { code: string; city: string; country: string };
export type Cabin = "Economy" | "Premium Economy" | "Business" | "First";

const BLUE = "#0754F7";
const NAVY = "#061747";
const MUTED = "#56658E";
const BORDER = "#E9EDF6";
const AIRPORTS: Airport[] = [
  { code: "JFK", city: "New York", country: "USA" },
  { code: "LAX", city: "Los Angeles", country: "USA" },
  { code: "LHR", city: "London", country: "United Kingdom" },
  { code: "CDG", city: "Paris", country: "France" },
];
const DESTINATIONS = [
  { name: "New York", code: "JFK", price: "$132", image: require("../../../assets/destinations/new-york.jpg") },
  { name: "London", code: "LHR", price: "$612", image: require("../../../assets/destinations/london.jpg") },
  { name: "Paris", code: "CDG", price: "$432", image: require("../../../assets/destinations/paris.jpg") },
  { name: "Bali", code: "DPS", price: "$612", image: require("../../../assets/destinations/bali.jpg") },
] as const;

function Icon({ name, size = 25, color = MUTED }: { name: string; size?: number; color?: string }) {
  const common = { stroke: color, strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const paths: Record<string, ReactNode> = {
    bell: <><Path {...common} d="M7 18h10l-1.4-2.2V11a3.6 3.6 0 0 0-7.2 0v4.8L7 18Z" /><Path {...common} d="M10.5 20.2a1.8 1.8 0 0 0 3 0M12 5.5V4" /></>,
    swap: <><Path {...common} d="M8 5v14M5 16l3 3 3-3M16 19V5M13 8l3-3 3 3" /></>,
    calendar: <><Rect {...common} x="4" y="6" width="16" height="14" rx="2" /><Path {...common} d="M8 3v6M16 3v6M4 10h16" /></>,
    user: <><Circle {...common} cx="12" cy="8" r="4" /><Path {...common} d="M4 21c.8-4.4 3.5-6 8-6s7.2 1.6 8 6" /></>,
    seat: <Path {...common} d="M7 4v9.5c0 2.5 1.7 4.5 4.2 4.5H19M9 12h6.5l1.5 4H9M6 20h13" />,
    search: <><Circle {...common} cx="10.5" cy="10.5" r="6.5" /><Path {...common} d="m15.5 15.5 5 5" /></>,
    chevron: <Path {...common} d="m8 9 4 4 4-4" />,
    right: <Path {...common} d="m9 5 7 7-7 7" />,
    heart: <Path {...common} d="M20.5 9c0 5-8.5 10-8.5 10S3.5 14 3.5 9A4.5 4.5 0 0 1 12 6.8 4.5 4.5 0 0 1 20.5 9Z" />,
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>{paths[name]}</Svg>;
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
}

function AppHeader() {
  const [name, setName] = useState("Traveler");
  useEffect(() => {
    void readSession().then((session) => {
      const first = session?.user.name?.trim().split(/\s+/)[0];
      if (first) setName(first);
    }).catch(() => undefined);
  }, []);
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text accessibilityRole="header" style={styles.greeting}>{greetingForHour(new Date().getHours())}</Text>
        <Text style={styles.name}>{name}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Notifications, no unread status available" onPress={() => router.push("/(tabs)/trips")} style={styles.headerButton}>
        <Icon name="bell" color={NAVY} size={29} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push("/(tabs)/profile")} style={styles.avatar}>
        <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
      </Pressable>
    </View>
  );
}

function PickerModal({ title, visible, onClose, children }: { title: string; visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable accessibilityViewIsModal style={styles.sheet} onPress={() => undefined}>
          <View style={styles.sheetHandle} />
          <Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text>
          {children}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.done}><Text style={styles.doneText}>Done</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TripTabs({ value, onChange }: { value: TripType; onChange: (next: TripType) => void }) {
  const tabs = [["round-trip", "Round trip"], ["one-way", "One way"], ["multi-city", "Multi-city"]] as const;
  return <View style={styles.tripTabs}>{tabs.map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: value === id }} onPress={() => onChange(id)} style={[styles.tripTab, value === id && styles.tripTabActive]}><Text style={[styles.tripText, value === id && styles.tripTextActive]}>{label}</Text></Pressable>)}</View>;
}

function RouteBlock({ from, to, choose, swap }: { from: Airport; to: Airport; choose: (which: "from" | "to") => void; swap: () => void }) {
  const Field = ({ label, airport, onPress }: { label: string; airport: Airport; onPress: () => void }) => <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${airport.city}, ${airport.code}`} onPress={onPress} style={styles.routeField}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.airportCode}>{airport.code}</Text><Text style={styles.city}>{airport.city}, {airport.country}</Text></Pressable>;
  return <View style={styles.routeBox}><Field label="FROM" airport={from} onPress={() => choose("from")} /><View style={styles.routeDivider} /><Field label="TO" airport={to} onPress={() => choose("to")} /><Pressable accessibilityRole="button" accessibilityLabel="Swap origin and destination" onPress={swap} style={styles.swap}><Icon name="swap" color={BLUE} size={31} /></Pressable></View>;
}

function TwoColumnField({ left, right }: { left: ReactNode; right: ReactNode }) {
  return <View style={styles.twoColumn}>{left}<View style={styles.verticalDivider} />{right}</View>;
}

function FlightSearchCard() {
  const [tripType, setTripType] = useState<TripType>("round-trip");
  const [from, setFrom] = useState(AIRPORTS[0]);
  const [to, setTo] = useState(AIRPORTS[1]);
  const [picker, setPicker] = useState<null | "from" | "to" | "depart" | "return" | "travelers" | "cabin">(null);
  const [travelers, setTravelers] = useState(1);
  const [cabin, setCabin] = useState<Cabin>("Economy");
  const [depart, setDepart] = useState("May 20, Tue");
  const [returnDate, setReturnDate] = useState("May 27, Tue");
  const [error, setError] = useState("");
  const pickAirport = (airport: Airport) => { if (picker === "from") setFrom(airport); if (picker === "to") setTo(airport); setPicker(null); };
  const search = () => {
    if (from.code === to.code) { setError("Origin and destination must be different."); return; }
    setError("Flight results are not available in this mobile build yet.");
  };
  const dateField = (label: string, value: string, target: "depart" | "return") => <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={() => setPicker(target)} style={styles.halfField}><View><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.value}>{value}</Text></View><Icon name="calendar" size={27} /></Pressable>;
  return (
    <>
      <View style={styles.searchCard}>
        <TripTabs value={tripType} onChange={(next) => { if (next === "multi-city") { setError("Multi-city search is not available in this mobile build yet."); return; } setTripType(next); setError(""); }} />
        <RouteBlock from={from} to={to} choose={setPicker} swap={() => { setFrom(to); setTo(from); setError(""); }} />
        <TwoColumnField left={dateField("DEPART", depart, "depart")} right={tripType === "round-trip" ? dateField("RETURN", returnDate, "return") : <View style={styles.halfField}><Text style={styles.oneWay}>One way</Text></View>} />
        <TwoColumnField left={<Pressable accessibilityRole="button" accessibilityLabel={`Travelers: ${travelers}`} onPress={() => setPicker("travelers")} style={styles.halfField}><Icon name="user" size={28} /><View><Text style={styles.fieldLabel}>TRAVELERS</Text><Text style={styles.value}>{travelers} Traveler{travelers === 1 ? "" : "s"}</Text></View></Pressable>} right={<Pressable accessibilityRole="button" accessibilityLabel={`Cabin: ${cabin}`} onPress={() => setPicker("cabin")} style={styles.halfField}><Icon name="seat" size={28} /><View style={styles.grow}><Text style={styles.fieldLabel}>CABIN</Text><Text style={styles.value}>{cabin}</Text></View><Icon name="chevron" size={24} /></Pressable>} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Search flights" onPress={search} style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}><Icon name="search" color="white" size={29} /><Text style={styles.searchButtonText}>Search flights</Text></Pressable>
      </View>
      <PickerModal title={picker === "from" ? "Choose origin" : "Choose destination"} visible={picker === "from" || picker === "to"} onClose={() => setPicker(null)}>{AIRPORTS.map((airport) => <Pressable key={airport.code} accessibilityRole="button" onPress={() => pickAirport(airport)} style={styles.choice}><Text style={styles.choiceCode}>{airport.code}</Text><Text style={styles.choiceText}>{airport.city}, {airport.country}</Text></Pressable>)}</PickerModal>
      <PickerModal title={picker === "depart" ? "Departure date" : "Return date"} visible={picker === "depart" || picker === "return"} onClose={() => setPicker(null)}>{["May 20, Tue", "May 21, Wed", "May 27, Tue", "May 28, Wed"].map((date) => <Pressable key={date} accessibilityRole="button" onPress={() => { if (picker === "depart") setDepart(date); else setReturnDate(date); setPicker(null); }} style={styles.choice}><Icon name="calendar" /><Text style={styles.choiceText}>{date}</Text></Pressable>)}</PickerModal>
      <PickerModal title="Travelers" visible={picker === "travelers"} onClose={() => setPicker(null)}><View style={styles.counter}><Text style={styles.choiceText}>Travelers</Text><Pressable accessibilityRole="button" accessibilityLabel="Remove traveler" onPress={() => setTravelers(Math.max(1, travelers - 1))} style={styles.counterButton}><Text style={styles.counterText}>−</Text></Pressable><Text style={styles.count}>{travelers}</Text><Pressable accessibilityRole="button" accessibilityLabel="Add traveler" onPress={() => setTravelers(Math.min(9, travelers + 1))} style={styles.counterButton}><Text style={styles.counterText}>+</Text></Pressable></View></PickerModal>
      <PickerModal title="Cabin class" visible={picker === "cabin"} onClose={() => setPicker(null)}>{(["Economy", "Premium Economy", "Business", "First"] as Cabin[]).map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: cabin === item }} onPress={() => { setCabin(item); setPicker(null); }} style={styles.choice}><Text style={styles.choiceText}>{item}</Text></Pressable>)}</PickerModal>
    </>
  );
}

function PriceAlertCard() {
  return <Pressable accessibilityRole="button" accessibilityLabel="Track prices and save" onPress={async () => { const session = await readSession().catch(() => null); router.push(session ? "/(tabs)/trips" : "/email-auth"); }} style={({ pressed }) => [styles.alertCard, pressed && styles.pressed]}><View style={styles.alertIcon}><Icon name="bell" color={BLUE} size={34} /></View><View style={styles.grow}><Text style={styles.alertTitle}>Track prices & save</Text><Text style={styles.alertBody}>Get alerts when prices drop{"\n"}for your favorite trips.</Text></View><Icon name="right" size={28} /></Pressable>;
}

function PopularDestinations() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  return <View><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Popular destinations</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/explore")}><Text style={styles.viewAll}>View all</Text></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destinationRow}>{DESTINATIONS.map((destination) => { const saved = favorites.has(destination.name); return <Pressable key={destination.name} accessibilityRole="button" accessibilityLabel={`Explore ${destination.name}`} onPress={() => router.push("/(tabs)/explore")} style={styles.destinationCard}><View><Image source={destination.image} resizeMode="cover" style={styles.destinationImage} /><Pressable accessibilityRole="button" accessibilityLabel={`${saved ? "Remove" : "Add"} ${destination.name} ${saved ? "from" : "to"} favorites`} accessibilityState={{ selected: saved }} hitSlop={8} onPress={(event) => { event.stopPropagation(); setFavorites((current) => { const next = new Set(current); if (saved) next.delete(destination.name); else next.add(destination.name); return next; }); }} style={styles.heart}><Icon name="heart" color="white" size={24} /></Pressable></View><Text style={styles.destinationName}>{destination.name}</Text><Text style={styles.price}>from {destination.price}</Text></Pressable>; })}</ScrollView></View>;
}

export function HomeScreen() {
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct>("flights");
  const content = useMemo(() => {
    if (selectedProduct === "hotels") return <HotelSearchForm />;
    if (selectedProduct === "cars") return <CarSearchForm />;
    if (selectedProduct === "deals") return <DealsSearchForm />;
    return <><FlightSearchCard /><PriceAlertCard /><PopularDestinations /></>;
  }, [selectedProduct]);
  return <SafeAreaView style={styles.safe} edges={["top"]}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><AppHeader /><ProductTabs selectedProduct={selectedProduct} onSelectProduct={setSelectedProduct} />{content}</ScrollView></SafeAreaView>;
}

function EmptyTab({ title, body }: { title: string; body: string }) {
  return <SafeAreaView style={styles.safe}><View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.alertBody}>{body}</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)")} style={styles.done}><Text style={styles.doneText}>Home</Text></Pressable></View></SafeAreaView>;
}
export function ExploreScreen() { return <EmptyTab title="Explore" body="Discover destination inspiration and routes." />; }
export function TripsScreen() { return <EmptyTab title="Trips" body="Saved trips and price watches appear here." />; }
export function ProfileScreen() { return <EmptyTab title="Profile" body="Manage your account and travel preferences." />; }

const shadow = { shadowColor: "#19335B", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 };
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FBFCFF" },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 26, gap: 14 },
  header: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 2 },
  headerCopy: { flex: 1 },
  greeting: { color: MUTED, fontSize: 17, lineHeight: 23, fontWeight: "600" },
  name: { color: NAVY, fontSize: 31, lineHeight: 38, fontWeight: "800", letterSpacing: -0.7 },
  headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E8EEFF", alignItems: "center", justifyContent: "center" },
  avatarText: { color: BLUE, fontSize: 21, fontWeight: "700" },
  searchCard: { backgroundColor: "white", borderRadius: 18, padding: 12, gap: 0, ...shadow },
  tripTabs: { height: 43, flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 10 },
  tripTab: { flex: 1, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tripTabActive: { borderBottomColor: BLUE },
  tripText: { color: MUTED, fontSize: 15, fontWeight: "600" },
  tripTextActive: { color: BLUE, fontWeight: "700" },
  routeBox: { minHeight: 178, borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingHorizontal: 10, position: "relative" },
  routeField: { minHeight: 88, justifyContent: "center", paddingRight: 62 },
  routeDivider: { height: 1, backgroundColor: BORDER },
  fieldLabel: { color: MUTED, fontSize: 11, lineHeight: 16, fontWeight: "600" },
  airportCode: { color: NAVY, fontSize: 21, lineHeight: 25, fontWeight: "800" },
  city: { color: MUTED, fontSize: 14, lineHeight: 20 },
  swap: { position: "absolute", right: -1, top: 65, width: 48, height: 48, borderRadius: 24, backgroundColor: "white", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center", ...shadow },
  twoColumn: { minHeight: 73, flexDirection: "row", borderWidth: 1, borderColor: BORDER, borderRadius: 16, marginTop: 8, alignItems: "stretch" },
  verticalDivider: { width: 1, height: "66%", backgroundColor: BORDER, alignSelf: "center" },
  halfField: { flex: 1, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  value: { color: NAVY, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  oneWay: { color: MUTED, fontSize: 14, fontWeight: "600" },
  grow: { flex: 1 },
  error: { color: "#B91C1C", fontSize: 12, marginTop: 7, paddingHorizontal: 4 },
  searchButton: { height: 52, marginTop: 8, borderRadius: 12, backgroundColor: BLUE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  searchButtonText: { color: "white", fontSize: 17, fontWeight: "700" },
  alertCard: { minHeight: 91, borderRadius: 17, backgroundColor: "white", padding: 13, flexDirection: "row", alignItems: "center", gap: 13, ...shadow },
  alertIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#EAF0FF", alignItems: "center", justifyContent: "center" },
  alertTitle: { color: NAVY, fontSize: 15, fontWeight: "800", lineHeight: 21 },
  alertBody: { color: MUTED, fontSize: 14, lineHeight: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  sectionTitle: { color: NAVY, fontSize: 17, fontWeight: "800" },
  viewAll: { color: BLUE, fontSize: 14, fontWeight: "700" },
  destinationRow: { gap: 10, paddingBottom: 8 },
  destinationCard: { width: 112, borderRadius: 12, backgroundColor: "white", overflow: "hidden", paddingBottom: 10, ...shadow },
  destinationImage: { width: 112, height: 104 },
  heart: { position: "absolute", right: 7, top: 7, width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  destinationName: { color: NAVY, fontSize: 14, lineHeight: 20, fontWeight: "800", paddingHorizontal: 8, paddingTop: 8 },
  price: { color: BLUE, fontSize: 13, lineHeight: 18, paddingHorizontal: 8 },
  pressed: { opacity: 0.72 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(3,14,43,.35)" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 8 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#CBD2E1", alignSelf: "center", marginBottom: 7 },
  sheetTitle: { color: NAVY, fontSize: 21, fontWeight: "800", marginBottom: 4 },
  choice: { minHeight: 52, borderBottomWidth: 1, borderBottomColor: BORDER, flexDirection: "row", alignItems: "center", gap: 14 },
  choiceCode: { color: NAVY, fontSize: 18, fontWeight: "800", width: 48 },
  choiceText: { color: NAVY, fontSize: 16, flex: 1 },
  done: { minHeight: 48, borderRadius: 14, backgroundColor: BLUE, alignItems: "center", justifyContent: "center", marginTop: 10 },
  doneText: { color: "white", fontWeight: "800", fontSize: 16 },
  counter: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12 },
  counterButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: BLUE, alignItems: "center", justifyContent: "center" },
  counterText: { color: BLUE, fontSize: 24 },
  count: { color: NAVY, fontSize: 18, fontWeight: "800", minWidth: 24, textAlign: "center" },
  empty: { flex: 1, padding: 24, justifyContent: "center", gap: 14 },
  emptyTitle: { color: NAVY, fontSize: 30, fontWeight: "800" },
});
