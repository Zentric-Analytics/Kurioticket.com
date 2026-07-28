import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { travelApi, TravelApiError, type CarResult, type FlightResult, type HotelResult } from "../../api/travelApi";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";

type Product = "flight" | "hotel" | "car";
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const openProvider = (url?: string) => { if (url && /^https?:\/\//.test(url)) void Linking.openURL(url); };

export function TravelResultsScreen({ product }: { product: Product }) {
  const params = useLocalSearchParams<Record<string, string>>();
  const [results, setResults] = useState<Array<FlightResult | HotelResult | CarResult>>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setStatus("loading"); setMessage("");
    try {
      if (product === "flight") {
        const response = await travelApi.searchFlights({
          tripType: one(params.tripType) || "round-trip", origin: one(params.from), destination: one(params.to),
          departureDate: one(params.departureDate), returnDate: one(params.tripType) === "round-trip" ? one(params.returnDate) : undefined,
          adults: Number(one(params.travelers) || 1), children: 0, infants: 0, travelers: Number(one(params.travelers) || 1),
          cabinClass: (one(params.cabin) || "economy").toLowerCase().replace("premium economy", "economy"),
        });
        setResults(response.results); setMessage(response.warnings?.[0] || "");
        setStatus(response.results.length ? "ready" : "empty");
      } else if (product === "hotel") {
        const response = await travelApi.searchHotels({
          destination: one(params.destination), checkIn: one(params.checkIn), checkOut: one(params.checkOut),
          guests: Number(one(params.guests) || 2), rooms: Number(one(params.rooms) || 1),
        });
        setResults(response.results); setMessage(response.warnings?.[0] || "");
        setStatus(response.results.length ? "ready" : "empty");
      } else {
        const response = await travelApi.searchCars({
          pickupLocation: one(params.pickupLocation), dropoffLocation: one(params.dropoffLocation) || one(params.pickupLocation),
          pickupDate: one(params.pickupDate), pickupTime: one(params.pickupTime) || "10:00",
          dropoffDate: one(params.dropoffDate), dropoffTime: one(params.dropoffTime) || "10:00",
          driverAge: one(params.driverAge) || "30",
        });
        setResults(response.results); setMessage(response.status === "unavailable" ? "Live car inventory is temporarily unavailable." : "");
        setStatus(response.results.length ? "ready" : "empty");
      }
    } catch (error) {
      setMessage(error instanceof TravelApiError ? error.message : "Search failed. Please try again.");
      setStatus("error");
    }
  }, [params, product]);
  useEffect(() => { void load(); }, [load]);
  const title = `${product[0].toUpperCase()}${product.slice(1)} results`;
  return <SafeAreaView style={flowStyles.safe} edges={["top"]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={flowStyles.iconButton}><FlowIcon name="back" /></Pressable><Text accessibilityRole="header" style={flowStyles.title}>{title}</Text></View>
    {status === "loading" ? <View style={styles.center}><ActivityIndicator color={flowColors.blue} size="large" /><Text style={flowStyles.meta}>Searching live providers…</Text></View> :
      <ScrollView contentContainerStyle={flowStyles.scroll}>
        {message ? <Text accessibilityRole="alert" style={styles.notice}>{message}</Text> : null}
        {status === "error" ? <Pressable accessibilityRole="button" onPress={() => void load()} style={flowStyles.primary}><Text style={flowStyles.primaryText}>Try again</Text></Pressable> : null}
        {status === "empty" ? <View style={styles.center}><FlowIcon name="search" color={flowColors.blue} size={38} /><Text style={flowStyles.value}>No current results found</Text><Text style={flowStyles.meta}>Change your dates or destination and search again.</Text></View> : null}
        {results.map((result) => product === "flight" ? <FlightCard key={result.id} result={result as FlightResult} /> : product === "hotel" ? <HotelCard key={result.id} result={result as HotelResult} /> : <CarCard key={result.id} result={result as CarResult} />)}
      </ScrollView>}
  </SafeAreaView>;
}

function FlightCard({ result }: { result: FlightResult }) {
  const url = result.partnerRedirectUrl || result.bookingUrl;
  return <Pressable accessibilityRole="button" accessibilityLabel={`View ${result.airlineName} flight`} onPress={() => openProvider(url)} style={[styles.card, flowStyles.shadow]}><View style={styles.between}><Text style={flowStyles.value}>{result.airlineName}</Text><Text style={styles.price}>{result.currency} {result.price.toFixed(0)}</Text></View><Text style={styles.route}>{result.originAirport} → {result.destinationAirport}</Text><View style={styles.between}><Text style={flowStyles.meta}>{new Date(result.departureTime).toLocaleString()}</Text><Text style={flowStyles.meta}>{result.duration} · {result.stops ? `${result.stops} stop${result.stops > 1 ? "s" : ""}` : "Direct"}</Text></View><Text style={styles.action}>Continue with provider</Text></Pressable>;
}
function HotelCard({ result }: { result: HotelResult }) {
  const url = result.partnerRedirectUrl || result.bookingUrl;
  return <Pressable accessibilityRole="button" accessibilityLabel={`View ${result.name}`} onPress={() => openProvider(url)} style={[styles.card, flowStyles.shadow]}>{result.imageUrl ? <Image source={{ uri: result.imageUrl }} style={styles.image} /> : null}<Text style={flowStyles.value}>{result.name}</Text><Text style={flowStyles.meta}>{result.neighbourhood || result.location}</Text><View style={styles.between}><Text style={flowStyles.meta}>★ {result.reviewScore || result.rating}</Text><Text style={styles.price}>{result.totalPrice && result.currency ? `${result.currency} ${result.totalPrice.toFixed(0)}` : "Check availability"}</Text></View><Text style={styles.action}>{result.inventoryKind === "discovery" ? "View property" : "Continue with provider"}</Text></Pressable>;
}
function CarCard({ result }: { result: CarResult }) {
  const offer = result.offers[0];
  return <Pressable accessibilityRole="button" accessibilityLabel={`View ${result.modelName}`} onPress={() => openProvider(offer?.bookingUrl)} style={[styles.card, flowStyles.shadow]}>{result.imageUrl ? <Image source={{ uri: result.imageUrl }} style={styles.image} /> : null}<Text style={flowStyles.value}>{result.modelName}</Text><Text style={flowStyles.meta}>{result.categoryLabel} · {result.transmission} · {result.passengers} seats</Text><View style={styles.between}><Text style={flowStyles.meta}>{offer?.rentalCompanyName || result.rentalCompanyName}</Text><Text style={styles.price}>{offer ? `${offer.currency} ${offer.totalPrice.toFixed(0)}` : "Unavailable"}</Text></View>{offer?.bookingUrl ? <Text style={styles.action}>Continue with provider</Text> : null}</Pressable>;
}
const styles = StyleSheet.create({
  header: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, borderBottomColor: flowColors.border, borderBottomWidth: 1 },
  center: { flex: 1, minHeight: 280, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  notice: { color: flowColors.navy, backgroundColor: "#F2F6FF", borderRadius: 10, padding: 12 },
  card: { backgroundColor: "white", borderColor: flowColors.border, borderWidth: 1, borderRadius: 14, padding: 13, gap: 8 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  route: { color: flowColors.navy, fontSize: 19, fontWeight: "800" },
  price: { color: flowColors.blue, fontSize: 16, fontWeight: "800" },
  action: { color: flowColors.blue, fontSize: 12, fontWeight: "800", textAlign: "right" },
  image: { height: 150, borderRadius: 10, backgroundColor: "#EEF2F8" },
});
