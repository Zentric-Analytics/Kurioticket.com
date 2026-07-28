import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { airports, type Airport, type Cabin, type TripType } from "./flowData";
import { ChoiceSheet, Field, PrimaryButton, Segments, UnavailableNotice } from "./FlowPrimitives";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";

const dates = ["May 20, Tue", "May 21, Wed", "May 27, Tue", "May 28, Wed"] as const;
const cabins: Cabin[] = ["Economy", "Premium Economy", "Business", "First"];
type Picker = "from" | "to" | "depart" | "return" | "travelers" | "cabin" | null;

export function FlightSearchPanel({ compact = false }: { compact?: boolean }) {
  const [tripType, setTripType] = useState<TripType>("round-trip");
  const [from, setFrom] = useState<Airport>(airports[0]);
  const [to, setTo] = useState<Airport>(airports[1]);
  const [depart, setDepart] = useState<(typeof dates)[number]>("May 20, Tue");
  const [returnDate, setReturnDate] = useState<(typeof dates)[number]>("May 27, Tue");
  const [travelers, setTravelers] = useState(1);
  const [cabin, setCabin] = useState<Cabin>("Economy");
  const [picker, setPicker] = useState<Picker>(null);
  const [notice, setNotice] = useState("");

  const chooseAirport = (code: string) => {
    const airport = airports.find((item) => item.code === code);
    if (airport && picker === "from") setFrom(airport);
    if (airport && picker === "to") setTo(airport);
    setPicker(null); setNotice("");
  };
  const submit = () => {
    if (tripType === "multi-city") { setNotice("Multi-city results are not available in this mobile build yet."); return; }
    if (from.code === to.code) { setNotice("Origin and destination must be different."); return; }
    router.push({ pathname: "/flight-results", params: { from: from.code, to: to.code, tripType, depart, returnDate, travelers: String(travelers), cabin } });
  };
  return <View style={[flowStyles.card, flowStyles.shadow, compact && styles.compact]}>
    <Segments value={tripType} onChange={(value) => { setTripType(value); setNotice(""); }} options={[{ value: "round-trip", label: "Round trip" }, { value: "one-way", label: "One way" }, { value: "multi-city", label: "Multi-city" }]} />
    <View>
      <Field label="From" value={from.code} meta={`${from.city}, ${from.country}`} onPress={() => setPicker("from")} />
      <Field label="To" value={to.code} meta={`${to.city}, ${to.country}`} onPress={() => setPicker("to")} />
      <Pressable accessibilityRole="button" accessibilityLabel="Swap origin and destination" onPress={() => { const previous = from; setFrom(to); setTo(previous); setNotice(""); }} style={styles.swap}><FlowIcon name="swap" color={flowColors.blue} /></Pressable>
    </View>
    <View style={styles.row}><View style={styles.half}><Field label="Depart" value={depart} icon="calendar" onPress={() => setPicker("depart")} /></View>{tripType === "round-trip" ? <View style={styles.half}><Field label="Return" value={returnDate} icon="calendar" onPress={() => setPicker("return")} /></View> : null}</View>
    <View style={styles.row}><View style={styles.half}><Field label="Travelers" value={`${travelers} Traveler${travelers === 1 ? "" : "s"}`} icon="person" onPress={() => setPicker("travelers")} /></View><View style={styles.half}><Field label="Cabin" value={cabin} onPress={() => setPicker("cabin")} trailing={<FlowIcon name="chevron" size={18} />} /></View></View>
    {notice ? <UnavailableNotice text={notice} /> : null}
    <View style={styles.button}><PrimaryButton label="Search flights" onPress={submit} /></View>
    <ChoiceSheet visible={picker === "from" || picker === "to"} title={picker === "from" ? "Choose origin" : "Choose destination"} choices={airports.map((item) => ({ value: item.code, label: item.code, meta: `${item.city}, ${item.country}` }))} onChoose={chooseAirport} onClose={() => setPicker(null)} />
    <ChoiceSheet visible={picker === "depart" || picker === "return"} title={picker === "depart" ? "Departure date" : "Return date"} choices={dates.map((date) => ({ value: date, label: date }))} onChoose={(date) => { if (picker === "depart") setDepart(date); else setReturnDate(date); setPicker(null); }} onClose={() => setPicker(null)} />
    <ChoiceSheet visible={picker === "travelers"} title="Travelers" choices={[1,2,3,4,5].map((count) => ({ value: String(count), label: `${count} Traveler${count === 1 ? "" : "s"}` }))} onChoose={(count) => { setTravelers(Number(count)); setPicker(null); }} onClose={() => setPicker(null)} />
    <ChoiceSheet visible={picker === "cabin"} title="Cabin class" choices={cabins.map((item) => ({ value: item, label: item }))} onChoose={(item) => { setCabin(item as Cabin); setPicker(null); }} onClose={() => setPicker(null)} />
  </View>;
}

const styles = StyleSheet.create({
  compact: { borderRadius: 12 },
  row: { flexDirection: "row" },
  half: { flex: 1 },
  swap: { position: "absolute", right: 12, top: 50, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "white", borderColor: flowColors.border, borderWidth: 1, elevation: 2 },
  button: { padding: 8 },
});
