import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { travelApi, TravelApiError, type CarResult, type FlightResult, type HotelResult } from "../../api/travelApi";
import { getApiBaseUrl } from "../../config/apiUrl";
import { buildSearchPlan, type Product, validBookableCar, validBookableHotel, validFlight } from "./travelSearchModel";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";
import { buildFlightPriceAlertPayload, flightAlertPresentation, parseTargetPrice } from "./flightPriceAlertModel";
import { getRuntimeDiagnostics } from "../../diagnostics/runtimeDiagnostics";
import { ApprovedResultsScreen } from "../search/ApprovedResultsScreen";
import { ApprovedCarResultsScreen } from "../search/ApprovedCarResultsScreen";
import { isMobileProductAvailable, useFeatureAvailability } from "../availability/FeatureAvailability";

type Result = FlightResult | HotelResult | CarResult;
type Status = "validating" | "loading" | "partial" | "ready" | "empty" | "unavailable" | "error";
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
async function openAction(result: Result) {
  const action = result.searchPolicy.action;
  if (!action.enabled) throw new Error("disabled-action");
  const base = getApiBaseUrl();
  const url = action.kind === "internal-detail" && base.ok ? new URL(action.href, `${base.baseUrl}/`).toString() : action.href;
  if (!/^https:\/\/[^/\s]+(?:\/|$)/i.test(url) || !await Linking.canOpenURL(url)) throw new Error("invalid-action-url");
  await Linking.openURL(url);
}
function imageUri(value?: string) {
  if (!value) return undefined;
  if (/^https:\/\//i.test(value)) return value;
  const base = getApiBaseUrl();
  return base.ok && /^\/(?!\/)/.test(value) ? new URL(value, `${base.baseUrl}/`).toString() : undefined;
}

export function TravelResultsScreen({ product }: { product: Product }) {
  const { availability, loading } = useFeatureAvailability();
  if (loading || !isMobileProductAvailable(availability, product)) return <LegacyTravelResultsScreen product={product} />;
  if (product === "flight" || product === "hotel") return <ApprovedResultsScreen product={product} />;
  if (product === "car") return <ApprovedCarResultsScreen />;
  return <LegacyTravelResultsScreen product={product} />;
}

function LegacyTravelResultsScreen({ product }: { product: Product }) {
  const { availability, loading: availabilityLoading } = useFeatureAvailability();
  const productAvailable = isMobileProductAvailable(availability, product);
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const primitives = [
    one(params.tripType), one(params.origin), one(params.destination), one(params.from), one(params.to), one(params.departureDate), one(params.returnDate), one(params.travelers), one(params.adults), one(params.children), one(params.infants), one(params.cabin), one(params.cabinClass), one(params.currency), one(params.market),
    one(params.destination), one(params.checkIn), one(params.checkOut), one(params.guests), one(params.rooms),
    one(params.pickupLocation), one(params.dropoffLocation), one(params.pickupDate), one(params.pickupTime), one(params.dropoffDate), one(params.dropoffTime), one(params.driverAge),
  ];
  const planResult = useMemo(() => buildSearchPlan(product, params), [product, ...primitives]);
  const key = planResult.plan?.key || `invalid:${product}:${planResult.error}`;
  const payloadJson = JSON.stringify(planResult.plan?.payload || {});
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState<Status>(planResult.error ? "validating" : "loading");
  const [message, setMessage] = useState(planResult.error || "");
  const [retry, setRetry] = useState(0);
  const [alertOpen, setAlertOpen] = useState(false); const [targetDraft, setTargetDraft] = useState(""); const [targetError, setTargetError] = useState(""); const [creating, setCreating] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const sequence = useRef(0);
  const activeRequest = useRef<{
    key: string;
    controller: AbortController;
    promise: Promise<void>;
    abortTimer?: ReturnType<typeof setTimeout>;
  } | undefined>(undefined);

  const load = useCallback((signal: AbortSignal) => {
    const runId = ++sequence.current;
    if (availabilityLoading) { setResults([]); setMessage(""); setStatus("loading"); return Promise.resolve(); }
    if (!availabilityLoading && !productAvailable) { setResults([]); setMessage(`${product[0].toUpperCase()}${product.slice(1)} search is temporarily unavailable.`); setStatus("unavailable"); return Promise.resolve(); }
    if (planResult.error) { setResults([]); setMessage(planResult.error); setStatus("validating"); return Promise.resolve(); }
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    const requestId = `mobile-${Date.now().toString(36)}-${runId}`;
    setResults([]); setMessage(""); setStatus("loading");
    const request = product === "flight" ? travelApi.searchFlights(payload, { signal, requestId }) : product === "hotel" ? travelApi.searchHotels(payload, { signal, requestId }) : travelApi.searchCars(payload, { signal, requestId });
    return request.then((response) => {
      if (signal.aborted || runId !== sequence.current) return;
      const raw = Array.isArray(response.results) ? response.results : [];
      let valid: Result[] = [];
      if (product === "flight") valid = (raw as FlightResult[]).filter((result) => validFlight(result, planResult.plan!));
      if (product === "hotel") valid = (raw as HotelResult[]).filter(validBookableHotel);
      if (product === "car") valid = (raw as CarResult[]).filter(validBookableCar);
      const rejected = raw.filter((result) => !valid.includes(result as Result));
      if (rejected.length) console.warn("[travel-search] response contract validation rejected results", { requestId, product, rejectedIds: rejected.map((result) => typeof result === "object" && result && "id" in result ? String(result.id) : "missing-id") });
      setResults(valid);
      const warning = Array.isArray(response.warnings) ? response.warnings[0] || "" : "";
      if (response.status === "unavailable") { setMessage(warning || `Live ${product} inventory is temporarily unavailable.`); setStatus("unavailable"); }
      else if (rejected.length && !valid.length) { setMessage("The search service returned malformed inventory."); setStatus("error"); }
      else if (valid.length) { setMessage(warning); setStatus(response.status === "partial" || rejected.length > 0 ? "partial" : "ready"); }
      else setStatus("empty");
    }).catch((error) => {
      if (signal.aborted || runId !== sequence.current || (error instanceof TravelApiError && error.code === "cancelled")) return;
      const unavailable = error instanceof TravelApiError && (error.code === "unavailable" || error.code === "configuration");
      setMessage(error instanceof TravelApiError ? error.message : "Search failed. Please try again.");
      setStatus(unavailable ? "unavailable" : "error");
    });
  }, [key, payloadJson, product, retry, availabilityLoading, productAvailable]);

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
  const flightAlert = flightAlertPresentation(product, Boolean(planResult.plan), results as FlightResult[]);
  const flightResults = flightAlert.liveResults;
  const alertCurrencies = flightAlert.currencies;
  const diagnostics = getRuntimeDiagnostics();
  const alertCurrency = alertCurrencies.includes(selectedCurrency) ? selectedCurrency : alertCurrencies.length === 1 ? alertCurrencies[0] : "";
  const createAlert = async () => {
    if (creating || !planResult.plan || !alertCurrency) return;
    const parsed = parseTargetPrice(targetDraft); if (parsed.error || parsed.value === undefined) { setTargetError(parsed.error || "Enter a target price."); return; }
    setCreating(true); setTargetError("");
    try {
      await travelApi.createPriceAlert(buildFlightPriceAlertPayload(planResult.plan, parsed.value, alertCurrency));
      setAlertOpen(false); setTargetDraft("");
      Alert.alert("Price alert created", "We’ll track this flight search against your target price.", [{ text: "View price alerts", onPress: () => router.push("/price-alerts") }, { text: "Stay here" }]);
    } catch (error) {
      if (error instanceof TravelApiError && error.status === 401) { setAlertOpen(false); Alert.alert("Sign in required", "Sign in to create a price alert.", [{ text: "Sign in", onPress: () => router.push("/email-auth") }, { text: "Cancel" }]); }
      else if (error instanceof TravelApiError && error.status === 409 && error.details?.duplicate === true) setTargetError("This alert already exists. Open Price alerts to manage it.");
      else setTargetError(error instanceof TravelApiError ? error.message : "Unable to create price alert. Try again.");
    } finally { setCreating(false); }
  };
  const loadingCopy = product === "flight" ? "Searching available flights" : product === "hotel" ? "Checking available stays" : "Checking available cars";
  const retrySearch = () => setRetry((value) => value + 1);
  const editSearch = () => {
    if (router.canGoBack()) { router.back(); return; }
    if (product === "flight" && planResult.plan) router.replace({ pathname: "/flights", params: Object.fromEntries(Object.entries(params).map(([name, value]) => [name, one(value) ?? ""])) });
    if (product === "car" && planResult.plan) router.replace({ pathname: "/cars", params: Object.fromEntries(Object.entries(planResult.plan.payload).map(([name, value]) => [name, String(value)])) });
  };
  useEffect(() => {
    if (product !== "flight") return;
    console.info("[flight-results] current-price-alert-ui=true", { product, hasPlan: Boolean(planResult.plan), resultCount: results.length, liveFlightResultCount: flightResults.length, availableAlertCurrencies: alertCurrencies });
  }, [product, Boolean(planResult.plan), results.length, flightResults.length, alertCurrencies.join(",")]);
  return <SafeAreaView style={flowStyles.safe} edges={["top"]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={flowStyles.iconButton}><FlowIcon name="back" /></Pressable><View><Text accessibilityRole="header" style={flowStyles.title}>{title}</Text>{planResult.plan ? <Text style={flowStyles.meta}>{planResult.plan.summary}</Text> : null}{product === "flight" && (__DEV__ || diagnostics.channel === "preview") ? <Text style={styles.fingerprint}>Build: {diagnostics.shortUpdateId}</Text> : null}</View></View>
    <ScrollView contentContainerStyle={flowStyles.scroll}>
      {status === "loading" ? <View style={styles.loading}><ActivityIndicator color={flowColors.blue} size="large" /><Text style={flowStyles.value}>{loadingCopy}</Text><Text style={flowStyles.meta}>This search will stop automatically if providers do not respond.</Text></View> : null}
      {message ? <Text accessibilityRole="alert" style={styles.notice}>{message}</Text> : null}
      {flightAlert.visible && availability.priceAlerts ? <View style={[styles.track, flowStyles.shadow]}><Text style={flowStyles.sectionTitle}>Track this search</Text><Text style={flowStyles.meta}>Get notified when this flight search reaches your target price.</Text>{alertCurrencies.length > 1 ? <View accessibilityLabel="Choose alert currency" style={styles.currencyRow}>{alertCurrencies.map((currency) => <Pressable key={currency} accessibilityRole="button" accessibilityState={{ selected: alertCurrency === currency }} onPress={() => setSelectedCurrency(currency)} style={[styles.currency, alertCurrency === currency && styles.currencySelected]}><Text>{currency}</Text></Pressable>)}</View> : null}<Pressable accessibilityRole="button" accessibilityLabel="Create price alert" accessibilityState={{ disabled: !alertCurrency }} disabled={!alertCurrency} onPress={() => { if (!alertOpen) { setTargetError(""); setAlertOpen(true); } }} style={[flowStyles.primary, !alertCurrency && styles.disabled]}><Text style={flowStyles.primaryText}>Create price alert</Text></Pressable>{!alertCurrency ? <Text accessibilityRole="alert" style={flowStyles.meta}>{flightResults.length ? "A supported result currency was not available for this search." : "Price alerts require a valid live flight result."}</Text> : null}</View> : null}
      {status === "validating" ? <State title="Search details need attention" body="Edit the search and keep your entered values." onEdit={editSearch} /> : null}
      {status === "empty" ? <State title="No results for this search" body="Try different dates or adjust the destination." retry={retrySearch} onEdit={editSearch} /> : null}
      {status === "unavailable" ? <State title="Results are temporarily unavailable" body="Please try again." retry={retrySearch} onEdit={editSearch} /> : null}
      {status === "error" ? <State title="Search could not be completed" body="Check your connection and try again." retry={retrySearch} onEdit={editSearch} /> : null}
      {results.map((result) => product === "flight" ? <FlightCard key={result.id} result={result as FlightResult} /> : product === "hotel" ? <HotelCard key={result.id} result={result as HotelResult} /> : <CarCard key={result.id} result={result as CarResult} />)}
    </ScrollView>
    <Modal visible={alertOpen} transparent animationType="slide" onRequestClose={() => !creating && setAlertOpen(false)} accessibilityViewIsModal>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}><View style={styles.sheet} accessibilityLabel="Create flight price alert"><Text accessibilityRole="header" style={flowStyles.sectionTitle}>Create price alert</Text><Text style={flowStyles.value}>{planResult.plan?.summary}</Text><Text style={flowStyles.meta}>{String(planResult.plan?.payload.tripType)} · {String(planResult.plan?.payload.travelers)} travelers · {String(planResult.plan?.payload.cabinClass)} · {alertCurrency}</Text><Text style={flowStyles.label}>Target price ({alertCurrency})</Text><TextInput autoFocus accessibilityLabel={`Target price in ${alertCurrency}`} value={targetDraft} onChangeText={(value) => { setTargetDraft(value); setTargetError(""); }} keyboardType="decimal-pad" editable={!creating} style={styles.input} />{targetError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{targetError}</Text> : null}<Pressable accessibilityRole="button" accessibilityState={{ busy: creating, disabled: creating }} disabled={creating} onPress={() => void createAlert()} style={flowStyles.primary}><Text style={flowStyles.primaryText}>{creating ? "Creating…" : "Create price alert"}</Text></Pressable><Pressable accessibilityRole="button" disabled={creating} onPress={() => setAlertOpen(false)} style={styles.edit}><Text style={styles.editText}>Cancel</Text></Pressable></View></KeyboardAvoidingView>
    </Modal>
  </SafeAreaView>;
}

function State({ title, body, retry, onEdit }: { title: string; body: string; retry?: () => void; onEdit?: () => void }) {
  return <View style={styles.center}><FlowIcon name="search" color={flowColors.blue} size={38} /><Text style={flowStyles.value}>{title}</Text><Text style={flowStyles.meta}>{body}</Text><View style={styles.actions}>{retry ? <Pressable accessibilityRole="button" onPress={retry} style={flowStyles.primary}><Text style={flowStyles.primaryText}>Try again</Text></Pressable> : null}{onEdit ? <Pressable accessibilityRole="button" onPress={onEdit} style={styles.edit}><Text style={styles.editText}>Edit search</Text></Pressable> : null}</View></View>;
}
function SafeProviderCard({ label, result, children }: { label: string; result: Result; children: React.ReactNode }) {
  const actionable = result.searchPolicy.action.enabled;
  const open = () => void openAction(result).catch(() => alertProviderFailure());
  const actionLabel = result.searchPolicy.action.kind === "internal-detail" ? "View details" : "Continue with provider";
  return <Pressable accessibilityRole={actionable ? "button" : undefined} accessibilityLabel={label} disabled={!actionable} onPress={open} style={[styles.card, flowStyles.shadow]}>{children}{actionable ? <Text style={styles.action}>{actionLabel}</Text> : null}</Pressable>;
}
function alertProviderFailure() {
  Alert.alert("Unable to open provider", "The booking link is unavailable. Please try another result.");
}
function FlightCard({ result }: { result: FlightResult }) {
  return <SafeProviderCard label={`View ${result.airlineName} flight`} result={result}><View style={styles.between}><Text style={flowStyles.value}>{result.airlineName}</Text><Text style={styles.price}>{result.currency} {result.price.toFixed(0)}</Text></View><Text style={styles.route}>{result.originAirport} → {result.destinationAirport}</Text><View style={styles.between}><Text style={flowStyles.meta}>{new Date(result.departureTime).toLocaleString()}</Text><Text style={flowStyles.meta}>{result.duration} · {result.stops ? `${result.stops} stop${result.stops > 1 ? "s" : ""}` : "Direct"}</Text></View></SafeProviderCard>;
}
function HotelCard({ result }: { result: HotelResult }) {
  const image = imageUri(result.imageUrl);
  return <SafeProviderCard label={`View ${result.name}`} result={result}>{image ? <Image source={{ uri: image }} style={styles.image} /> : null}<Text style={flowStyles.value}>{result.name}</Text><Text style={flowStyles.meta}>{result.neighbourhood || result.location}</Text><View style={styles.between}><Text style={flowStyles.meta}>★ {result.reviewScore || result.rating}</Text><Text style={styles.price}>{result.totalPrice && result.currency ? `${result.currency} ${result.totalPrice.toFixed(0)}` : ""}</Text></View></SafeProviderCard>;
}
function CarCard({ result }: { result: CarResult }) {
  const offer = result.offers[0];
  const image = imageUri(result.imageUrl);
  return <SafeProviderCard label={`View ${result.modelName}`} result={result}>{image ? <Image source={{ uri: image }} style={styles.image} /> : null}<Text style={flowStyles.value}>{result.modelName}</Text><Text style={flowStyles.meta}>{result.categoryLabel} · {result.transmission} · {result.passengers} seats</Text><View style={styles.between}><Text style={flowStyles.meta}>{offer?.rentalCompanyName || result.rentalCompanyName}</Text><Text style={styles.price}>{offer ? `${offer.currency} ${offer.totalPrice.toFixed(0)}` : ""}</Text></View></SafeProviderCard>;
}
const styles = StyleSheet.create({
  header: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, borderBottomColor: flowColors.border, borderBottomWidth: 1 },
  fingerprint: { color: flowColors.muted, fontSize: 11 },
  loading: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: "white", borderRadius: 14 },
  center: { minHeight: 280, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  notice: { color: flowColors.navy, backgroundColor: "#F2F6FF", borderRadius: 10, padding: 12 },
  actions: { alignSelf: "stretch", gap: 10 }, edit: { minHeight: 52, borderWidth: 1, borderColor: flowColors.blue, borderRadius: 9, alignItems: "center", justifyContent: "center" }, editText: { color: flowColors.blue, fontWeight: "800" },
  card: { backgroundColor: "white", borderColor: flowColors.border, borderWidth: 1, borderRadius: 14, padding: 13, gap: 8 },
  track: { backgroundColor: "white", borderColor: flowColors.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  currencyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, currency: { borderWidth: 1, borderColor: flowColors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }, currencySelected: { borderColor: flowColors.blue, backgroundColor: "#EAF1FF" }, disabled: { opacity: 0.45 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }, sheet: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, gap: 12, maxHeight: "90%" }, input: { minHeight: 52, borderWidth: 1, borderColor: flowColors.border, borderRadius: 9, paddingHorizontal: 12, fontSize: 18 }, error: { color: "#A4262C" },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, route: { color: flowColors.navy, fontSize: 19, fontWeight: "800" }, price: { color: flowColors.blue, fontSize: 16, fontWeight: "800" }, action: { color: flowColors.blue, fontSize: 12, fontWeight: "800", textAlign: "right" },
  image: { height: 150, borderRadius: 10, backgroundColor: "#EEF2F8" }, discovery: { gap: 10 }, discoveryLabel: { color: flowColors.muted, fontSize: 12, fontWeight: "700" },
});
