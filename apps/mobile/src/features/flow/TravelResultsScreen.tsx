import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { travelApi, TravelApiError, type CarResult, type FlightResult, type HotelResult } from "../../api/travelApi";
import { buildSearchPlan, httpsUrl, type Product, validBookableCar, validBookableHotel, validFlight } from "./travelSearchModel";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";

type Result = FlightResult | HotelResult | CarResult;
type Status = "validating" | "loading" | "partial" | "ready" | "empty" | "unavailable" | "error";
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
async function openProvider(url?: string) {
  if (!httpsUrl(url) || !url || !await Linking.canOpenURL(url)) throw new Error("invalid-provider-url");
  await Linking.openURL(url);
}

export function TravelResultsScreen({ product }: { product: Product }) {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const primitives = [
    one(params.tripType), one(params.from), one(params.to), one(params.departureDate), one(params.returnDate), one(params.travelers), one(params.adults), one(params.children), one(params.infants), one(params.cabin),
    one(params.destination), one(params.checkIn), one(params.checkOut), one(params.guests), one(params.rooms),
    one(params.pickupLocation), one(params.dropoffLocation), one(params.pickupDate), one(params.pickupTime), one(params.dropoffDate), one(params.dropoffTime), one(params.driverAge),
  ];
  const planResult = useMemo(() => buildSearchPlan(product, params), [product, ...primitives]);
  const key = planResult.plan?.key || `invalid:${product}:${planResult.error}`;
  const payloadJson = JSON.stringify(planResult.plan?.payload || {});
  const [results, setResults] = useState<Result[]>([]);
  const [discoveryHotels, setDiscoveryHotels] = useState<HotelResult[]>([]);
  const [status, setStatus] = useState<Status>(planResult.error ? "validating" : "loading");
  const [message, setMessage] = useState(planResult.error || "");
  const [retry, setRetry] = useState(0);
  const sequence = useRef(0);
  const activeRequest = useRef<{
    key: string;
    controller: AbortController;
    promise: Promise<void>;
    abortTimer?: ReturnType<typeof setTimeout>;
  } | undefined>(undefined);

  const load = useCallback((signal: AbortSignal) => {
    const runId = ++sequence.current;
    if (planResult.error) { setResults([]); setDiscoveryHotels([]); setMessage(planResult.error); setStatus("validating"); return Promise.resolve(); }
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    const requestId = `mobile-${Date.now().toString(36)}-${runId}`;
    setResults([]); setDiscoveryHotels([]); setMessage(""); setStatus("loading");
    const request = product === "flight" ? travelApi.searchFlights(payload, { signal, requestId }) : product === "hotel" ? travelApi.searchHotels(payload, { signal, requestId }) : travelApi.searchCars(payload, { signal, requestId });
    return request.then((response) => {
      if (signal.aborted || runId !== sequence.current) return;
      const raw = Array.isArray(response.results) ? response.results : [];
      let valid: Result[] = [];
      let discovery: HotelResult[] = [];
      if (product === "flight") valid = (raw as FlightResult[]).filter((result) => validFlight(result, planResult.plan!));
      if (product === "hotel") {
        discovery = (raw as HotelResult[]).filter((result) => result.inventoryKind === "discovery");
        valid = (raw as HotelResult[]).filter(validBookableHotel);
      }
      if (product === "car") valid = (raw as CarResult[]).filter(validBookableCar);
      setResults(valid); setDiscoveryHotels(discovery);
      const warning = "warnings" in response && Array.isArray(response.warnings) ? response.warnings[0] || "" : "";
      const unavailable = product === "car" && "status" in response && response.status === "unavailable";
      if (unavailable) { setMessage("Live car inventory is temporarily unavailable."); setStatus("unavailable"); }
      else if (valid.length) { setMessage(warning); setStatus(warning || valid.length !== raw.length ? "partial" : "ready"); }
      else if (discovery.length) { setMessage("Live rates are unavailable. These properties are shown for discovery only."); setStatus("partial"); }
      else if (raw.length && !valid.length) { setMessage("The provider response did not contain safe, bookable inventory."); setStatus("unavailable"); }
      else setStatus("empty");
    }).catch((error) => {
      if (signal.aborted || runId !== sequence.current || (error instanceof TravelApiError && error.code === "cancelled")) return;
      const unavailable = error instanceof TravelApiError && (error.code === "unavailable" || error.code === "configuration");
      setMessage(error instanceof TravelApiError ? error.message : "Search failed. Please try again.");
      setStatus(unavailable ? "unavailable" : "error");
    });
  }, [key, payloadJson, product, retry]);

  useEffect(() => {
    const executionKey = `${key}:${retry}`;
    let active = activeRequest.current;
    if (active?.key === executionKey) {
      if (active.abortTimer) clearTimeout(active.abortTimer);
      active.abortTimer = undefined;
    } else {
      if (active) {
        if (active.abortTimer) clearTimeout(active.abortTimer);
        active.controller.abort();
        sequence.current += 1;
      }
      const controller = new AbortController();
      active = { key: executionKey, controller, promise: load(controller.signal) };
      activeRequest.current = active;
    }
    const request = active;
    return () => {
      request.abortTimer = setTimeout(() => {
        if (activeRequest.current !== request) return;
        request.controller.abort();
        sequence.current += 1;
        activeRequest.current = undefined;
      }, 0);
    };
  }, [key, load, retry]);

  const title = `${product[0].toUpperCase()}${product.slice(1)} results`;
  const loadingCopy = product === "flight" ? "Searching available flights" : product === "hotel" ? "Checking available stays" : "Checking available cars";
  const retrySearch = () => setRetry((value) => value + 1);
  return <SafeAreaView style={flowStyles.safe} edges={["top"]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={flowStyles.iconButton}><FlowIcon name="back" /></Pressable><View><Text accessibilityRole="header" style={flowStyles.title}>{title}</Text>{planResult.plan ? <Text style={flowStyles.meta}>{planResult.plan.summary}</Text> : null}</View></View>
    <ScrollView contentContainerStyle={flowStyles.scroll}>
      {status === "loading" ? <View style={styles.loading}><ActivityIndicator color={flowColors.blue} size="large" /><Text style={flowStyles.value}>{loadingCopy}</Text><Text style={flowStyles.meta}>This search will stop automatically if providers do not respond.</Text></View> : null}
      {message ? <Text accessibilityRole="alert" style={styles.notice}>{message}</Text> : null}
      {status === "validating" ? <State title="Search details need attention" body="Edit the search and keep your entered values." edit /> : null}
      {status === "empty" ? <State title="No results for this search" body="Try different dates or adjust the destination." retry={retrySearch} edit /> : null}
      {status === "unavailable" ? <State title="Live inventory is unavailable" body="No demo or fallback inventory will be shown." retry={retrySearch} edit /> : null}
      {status === "error" ? <State title="Search could not be completed" body="Check your connection and try again." retry={retrySearch} edit /> : null}
      {results.map((result) => product === "flight" ? <FlightCard key={result.id} result={result as FlightResult} /> : product === "hotel" ? <HotelCard key={result.id} result={result as HotelResult} /> : <CarCard key={result.id} result={result as CarResult} />)}
      {discoveryHotels.length ? <View style={styles.discovery}><Text style={flowStyles.sectionTitle}>Places to consider — live rates unavailable</Text>{discoveryHotels.map((hotel) => <View key={hotel.id} style={[styles.card, flowStyles.shadow]}><Text style={flowStyles.value}>{hotel.name}</Text><Text style={flowStyles.meta}>{hotel.neighbourhood || hotel.location}</Text><Text style={styles.discoveryLabel}>Discovery only</Text></View>)}</View> : null}
    </ScrollView>
  </SafeAreaView>;
}

function State({ title, body, retry, edit }: { title: string; body: string; retry?: () => void; edit?: boolean }) {
  return <View style={styles.center}><FlowIcon name="search" color={flowColors.blue} size={38} /><Text style={flowStyles.value}>{title}</Text><Text style={flowStyles.meta}>{body}</Text><View style={styles.actions}>{retry ? <Pressable accessibilityRole="button" onPress={retry} style={flowStyles.primary}><Text style={flowStyles.primaryText}>Try again</Text></Pressable> : null}{edit ? <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.edit}><Text style={styles.editText}>Edit search</Text></Pressable> : null}</View></View>;
}
function SafeProviderCard({ label, url, children }: { label: string; url?: string; children: React.ReactNode }) {
  const actionable = httpsUrl(url);
  const open = () => void openProvider(url).catch(() => alertProviderFailure());
  return <Pressable accessibilityRole={actionable ? "button" : undefined} accessibilityLabel={label} disabled={!actionable} onPress={open} style={[styles.card, flowStyles.shadow]}>{children}{actionable ? <Text style={styles.action}>Continue with provider</Text> : null}</Pressable>;
}
function alertProviderFailure() {
  Alert.alert("Unable to open provider", "The booking link is unavailable. Please try another result.");
}
function FlightCard({ result }: { result: FlightResult }) {
  const url = result.partnerRedirectUrl || result.bookingUrl;
  return <SafeProviderCard label={`View ${result.airlineName} flight`} url={url}><View style={styles.between}><Text style={flowStyles.value}>{result.airlineName}</Text><Text style={styles.price}>{result.currency} {result.price.toFixed(0)}</Text></View><Text style={styles.route}>{result.originAirport} → {result.destinationAirport}</Text><View style={styles.between}><Text style={flowStyles.meta}>{new Date(result.departureTime).toLocaleString()}</Text><Text style={flowStyles.meta}>{result.duration} · {result.stops ? `${result.stops} stop${result.stops > 1 ? "s" : ""}` : "Direct"}</Text></View></SafeProviderCard>;
}
function HotelCard({ result }: { result: HotelResult }) {
  const url = result.partnerRedirectUrl || result.bookingUrl;
  return <SafeProviderCard label={`View ${result.name}`} url={url}>{result.imageUrl ? <Image source={{ uri: result.imageUrl }} style={styles.image} /> : null}<Text style={flowStyles.value}>{result.name}</Text><Text style={flowStyles.meta}>{result.neighbourhood || result.location}</Text><View style={styles.between}><Text style={flowStyles.meta}>★ {result.reviewScore || result.rating}</Text><Text style={styles.price}>{result.totalPrice && result.currency ? `${result.currency} ${result.totalPrice.toFixed(0)}` : ""}</Text></View></SafeProviderCard>;
}
function CarCard({ result }: { result: CarResult }) {
  const offer = result.offers.find((item) => httpsUrl(item.bookingUrl));
  return <SafeProviderCard label={`View ${result.modelName}`} url={offer?.bookingUrl}>{result.imageUrl ? <Image source={{ uri: result.imageUrl }} style={styles.image} /> : null}<Text style={flowStyles.value}>{result.modelName}</Text><Text style={flowStyles.meta}>{result.categoryLabel} · {result.transmission} · {result.passengers} seats</Text><View style={styles.between}><Text style={flowStyles.meta}>{offer?.rentalCompanyName || result.rentalCompanyName}</Text><Text style={styles.price}>{offer ? `${offer.currency} ${offer.totalPrice.toFixed(0)}` : ""}</Text></View></SafeProviderCard>;
}
const styles = StyleSheet.create({
  header: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, borderBottomColor: flowColors.border, borderBottomWidth: 1 },
  loading: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: "white", borderRadius: 14 },
  center: { minHeight: 280, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  notice: { color: flowColors.navy, backgroundColor: "#F2F6FF", borderRadius: 10, padding: 12 },
  actions: { alignSelf: "stretch", gap: 10 }, edit: { minHeight: 52, borderWidth: 1, borderColor: flowColors.blue, borderRadius: 9, alignItems: "center", justifyContent: "center" }, editText: { color: flowColors.blue, fontWeight: "800" },
  card: { backgroundColor: "white", borderColor: flowColors.border, borderWidth: 1, borderRadius: 14, padding: 13, gap: 8 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, route: { color: flowColors.navy, fontSize: 19, fontWeight: "800" }, price: { color: flowColors.blue, fontSize: 16, fontWeight: "800" }, action: { color: flowColors.blue, fontSize: 12, fontWeight: "800", textAlign: "right" },
  image: { height: 150, borderRadius: 10, backgroundColor: "#EEF2F8" }, discovery: { gap: 10 }, discoveryLabel: { color: flowColors.muted, fontSize: 12, fontWeight: "700" },
});
