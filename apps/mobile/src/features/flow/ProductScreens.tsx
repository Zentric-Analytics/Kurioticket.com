import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { destinationImages } from "./flowData";
import { FlightSearchPanel } from "./FlightSearchPanel";
import { Field, PrimaryButton, ScreenHeader, Segments, UnavailableNotice } from "./FlowPrimitives";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";

function Page({ title, children, hero }: { title: string; children: React.ReactNode; hero: number }) {
  return <SafeAreaView style={flowStyles.safe} edges={["top"]}><ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><ScreenHeader title={title} back /><Image source={hero} resizeMode="cover" style={styles.hero} />{children}</ScrollView></SafeAreaView>;
}
function Cards({ title, items }: { title: string; items: { name: string; price: string; image?: number }[] }) {
  return <><View style={flowStyles.sectionHeader}><Text style={flowStyles.sectionTitle}>{title}</Text><Pressable accessibilityRole="button" onPress={() => undefined}><Text style={flowStyles.viewAll}>View all</Text></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>{items.map((item) => <View key={item.name} style={[styles.smallCard, flowStyles.shadow]}>{item.image ? <Image source={item.image} style={styles.smallImage} /> : null}<Text style={flowStyles.value}>{item.name}</Text><Text style={flowStyles.meta}>{item.price}</Text></View>)}</ScrollView></>;
}
export function FlightsScreen() {
  return <Page title="Flights" hero={require("../../../assets/launch/kurioticket-launch-coast-aircraft.png")}><FlightSearchPanel /><Cards title="Popular routes" items={[{ name: "JFK → LAX", price: "from $320" }, { name: "JFK → MIA", price: "from $210" }]} /></Page>;
}

export function HotelsScreen() {
  const [destination, setDestination] = useState("");
  const [notice, setNotice] = useState("");
  return <Page title="Hotels" hero={destinationImages.Paris}><View style={[flowStyles.card, flowStyles.shadow]}><View style={styles.inputField}><Text style={flowStyles.label}>Destination</Text><View style={styles.inputRow}><TextInput accessibilityLabel="Destination" value={destination} onChangeText={setDestination} placeholder="Enter city or hotel" placeholderTextColor={flowColors.muted} style={styles.input} /><FlowIcon name="location" size={20} /></View></View><View style={styles.row}><View style={styles.half}><Field label="Check-in" value="May 20, Tue" /></View><View style={styles.half}><Field label="Check-out" value="May 27, Tue" /></View></View><Field label="Guests" value="1 Room, 2 Guests" trailing={<FlowIcon name="chevron" size={18} />} />{notice ? <UnavailableNotice text={notice} /> : null}<View style={styles.pad}><PrimaryButton label="Search hotels" onPress={() => setNotice(destination.trim() ? "Hotel results are not available in this mobile build yet." : "Enter a destination.")} /></View></View><Cards title="Popular destinations" items={[{ name: "New York", price: "from $120", image: destinationImages["New York"] }, { name: "Paris", price: "from $140", image: destinationImages.Paris }, { name: "Bali", price: "from $90", image: destinationImages.Bali }]} /></Page>;
}

export function CarsScreen() {
  const [location, setLocation] = useState("");
  const [different, setDifferent] = useState(false);
  const [notice, setNotice] = useState("");
  return <Page title="Cars" hero={destinationImages.Bali}><View style={[flowStyles.card, flowStyles.shadow]}><View style={styles.inputField}><Text style={flowStyles.label}>Pick-up location</Text><View style={styles.inputRow}><TextInput accessibilityLabel="Pick-up location" value={location} onChangeText={setLocation} placeholder="Enter city or airport" placeholderTextColor={flowColors.muted} style={styles.input} /><FlowIcon name="location" size={20} /></View></View><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: different }} onPress={() => setDifferent(!different)} style={styles.checkboxRow}><View style={[styles.checkbox, different && styles.checked]}>{different ? <FlowIcon name="check" color="white" size={15} /> : null}</View><Text style={flowStyles.meta}>Return to a different location</Text></Pressable><View style={styles.row}><View style={styles.half}><Field label="Pick-up date" value="May 20, Tue" /></View><View style={styles.half}><Field label="Time" value="10:00 AM" /></View></View><View style={styles.row}><View style={styles.half}><Field label="Return date" value="May 27, Tue" /></View><View style={styles.half}><Field label="Time" value="10:00 AM" /></View></View><Field label="Driver age" value="30 – 65 years" trailing={<FlowIcon name="chevron" size={18} />} />{notice ? <UnavailableNotice text={notice} /> : null}<View style={styles.pad}><PrimaryButton label="Search cars" onPress={() => setNotice(location.trim() ? "Car results are not available in this mobile build yet." : "Enter a pick-up location.")} /></View></View><Cards title="Top car categories" items={[{ name: "Economy", price: "from $25/day" }, { name: "SUV", price: "from $45/day" }, { name: "Luxury", price: "from $85/day" }]} /></Page>;
}

type DealTab = "all" | "flights" | "hotels" | "cars";
export function DealsScreen() {
  const [tab, setTab] = useState<DealTab>("all");
  const deals = [{ name: "New York to London", detail: "Round trip", price: "$450", discount: "31% off", image: destinationImages.London }, { name: "Bali Hotels", detail: "3 nights", price: "$120", discount: "40% off", image: destinationImages.Bali }, { name: "Economy Cars", detail: "from $25/day", price: "", discount: "20% off", image: destinationImages["New York"] }];
  return <Page title="Deals" hero={destinationImages.Bali}><View style={[flowStyles.card, flowStyles.shadow]}><Segments value={tab} onChange={setTab} options={[{ value: "all", label: "All Deals", icon: "deal" }, { value: "flights", label: "Flights", icon: "flight" }, { value: "hotels", label: "Hotels", icon: "hotel" }, { value: "cars", label: "Cars", icon: "car" }]} /></View><View style={flowStyles.sectionHeader}><Text style={flowStyles.sectionTitle}>Today’s top deals</Text><Text style={flowStyles.viewAll}>View all</Text></View>{deals.filter((_, i) => tab === "all" || i === ["flights","hotels","cars"].indexOf(tab)).map((deal) => <Pressable key={deal.name} accessibilityRole="button" onPress={() => router.push("/flight-results")} style={({ pressed }) => [styles.deal, flowStyles.shadow, pressed && flowStyles.pressed]}><Image source={deal.image} style={styles.dealImage} /><View style={styles.grow}><Text style={flowStyles.value}>{deal.name}</Text><Text style={flowStyles.meta}>{deal.detail}</Text><Text style={styles.price}>{deal.price}</Text></View><Text style={[styles.discount, deal.discount === "20% off" && styles.green]}>{deal.discount}</Text></Pressable>)}<Text style={[flowStyles.sectionTitle, styles.why]}>Why book with us?</Text><View style={styles.benefit}><FlowIcon name="check" color={flowColors.blue} /><View><Text style={flowStyles.value}>Best Price Guarantee</Text><Text style={flowStyles.meta}>We match any lower price</Text></View></View><View style={styles.benefit}><FlowIcon name="card" color={flowColors.blue} /><View><Text style={flowStyles.value}>Free Cancellation</Text><Text style={flowStyles.meta}>Plans change, book with confidence</Text></View></View></Page>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 9, paddingBottom: 28, gap: 12 },
  hero: { height: 178, borderRadius: 2, backgroundColor: "#EAF3FF" },
  row: { flexDirection: "row" }, half: { flex: 1 }, pad: { padding: 8 },
  inputField: { minHeight: 76, padding: 12, borderBottomColor: flowColors.border, borderBottomWidth: 1 },
  inputRow: { flexDirection: "row", alignItems: "center" }, input: { flex: 1, minHeight: 42, color: flowColors.navy, fontSize: 14 },
  cardRow: { gap: 8, paddingBottom: 5 }, smallCard: { width: 116, minHeight: 82, backgroundColor: "white", borderRadius: 10, borderColor: flowColors.border, borderWidth: 1, padding: 9 },
  smallImage: { height: 86, margin: -9, marginBottom: 8, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  checkboxRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12 }, checkbox: { width: 20, height: 20, borderWidth: 1.5, borderColor: flowColors.navy, alignItems: "center", justifyContent: "center" }, checked: { backgroundColor: flowColors.blue, borderColor: flowColors.blue },
  deal: { minHeight: 86, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 11, backgroundColor: "white", padding: 8, borderColor: flowColors.border, borderWidth: 1 },
  dealImage: { width: 76, height: 68, borderRadius: 9 }, grow: { flex: 1 }, price: { color: flowColors.navy, fontSize: 12, fontWeight: "800" }, discount: { color: flowColors.red, fontSize: 11, fontWeight: "800" }, green: { color: flowColors.green },
  why: { marginTop: 10 }, benefit: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: "white", borderRadius: 11, borderColor: flowColors.border, borderWidth: 1 },
});
