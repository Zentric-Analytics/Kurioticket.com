import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { travelApi, type MobileTrip } from "../../api/travelApi";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";

export function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<MobileTrip | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (!id) return; void travelApi.trip(id).then((data) => setTrip(data.trip)).catch(() => setError("This trip could not be loaded.")); }, [id]);
  return <SafeAreaView style={flowStyles.safe} edges={["top"]}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={flowStyles.iconButton}><FlowIcon name="back" /></Pressable><Text accessibilityRole="header" style={flowStyles.title}>Trip details</Text></View>{!trip && !error ? <View style={styles.center}><ActivityIndicator color={flowColors.blue} /></View> : null}{error ? <View style={styles.center}><Text accessibilityRole="alert" style={flowStyles.meta}>{error}</Text></View> : null}{trip ? <ScrollView contentContainerStyle={flowStyles.scroll}><View style={[styles.card, flowStyles.shadow]}><Text style={styles.route}>{trip.origin ? `${trip.origin} → ` : ""}{trip.destination}</Text><Text style={flowStyles.meta}>{new Date(trip.departureDate).toLocaleString()}</Text>{trip.returnDate ? <Text style={flowStyles.meta}>Return: {new Date(trip.returnDate).toLocaleString()}</Text> : null}<View style={styles.divider} /><Row label="Status" value={trip.status} /><Row label="Booking reference" value={trip.bookingReference} /><Row label="Provider" value={trip.provider} /><Row label="Product" value={trip.tripType} /><Row label="Travelers" value={String(trip.passengerCount)} />{trip.totalAmount !== null ? <Row label="Total" value={`${trip.currency} ${trip.totalAmount.toFixed(2)}`} /> : null}</View></ScrollView> : null}</SafeAreaView>;
}
function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><Text style={flowStyles.label}>{label}</Text><Text style={flowStyles.value}>{value}</Text></View>; }
const styles = StyleSheet.create({
  header: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, borderBottomColor: flowColors.border, borderBottomWidth: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { backgroundColor: "white", borderColor: flowColors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 },
  route: { color: flowColors.navy, fontSize: 22, fontWeight: "800" },
  divider: { height: 1, backgroundColor: flowColors.border },
  row: { gap: 4, paddingVertical: 4 },
});
