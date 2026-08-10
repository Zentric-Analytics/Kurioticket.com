import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  travelApi,
  TravelApiError,
  type FlightResult,
  type HotelResult,
} from "../../api/travelApi";
import {
  buildSearchPlan,
  validBookableHotel,
  validFlight,
} from "../flow/travelSearchModel";
import { FlowIcon } from "../flow/FlowIcon";
import {
  Badge,
  Button,
  DateStrip,
  Empty,
  Pill,
  TopBar,
  clock,
  money,
  s,
  shortDate,
  ui,
} from "./SearchUi";
import { visualFlights, visualHotels } from "./visualFixtures";
import { airports } from "../flow/airportData";
import { useFeatureAvailability } from "../availability/FeatureAvailability";
import {
  buildFlightPriceAlertPayload,
  flightAlertPresentation,
  parseTargetPrice,
} from "../flow/flightPriceAlertModel";
import type { SearchPlan } from "../flow/travelSearchModel";
import { emptyFlightFilters, filterAndSortFlights, flightFilterOptions, type FlightFilters } from "./flightFilters";
import { useSavedFlights } from "../../storage/useSavedFlights";

type Product = "flight" | "hotel";
type Status = "loading" | "ready" | "empty" | "error";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const airportLabel = (code: unknown) => {
  const value = String(code || "").toUpperCase();
  const airport = airports.find((item) => item.code === value);
  return airport ? `${airport.city} (${value})` : value;
};
export function ApprovedResultsScreen({ product }: { product: Product }) {
  const { availability } = useFeatureAvailability();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const plan = useMemo(
    () => buildSearchPlan(product, params),
    [product, JSON.stringify(params)],
  );
  const [results, setResults] = useState<(FlightResult | HotelResult)[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [sort, setSort] = useState("best");
  const [filters, setFilters] = useState<FlightFilters>(emptyFlightFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSection, setFilterSection] = useState<"all" | "stops" | "airlines" | "times">("all");
  const visualTest =
    process.env.EXPO_PUBLIC_VISUAL_TEST === "1" && one(params.visual) === "1";
  const load = useCallback(async () => {
    if (!plan.plan) {
      setStatus("error");
      setMessage(plan.error || "Invalid search");
      return;
    }
    setStatus("loading");
    setMessage("");
    if (visualTest) {
      setResults(product === "flight" ? visualFlights : visualHotels);
      setStatus("ready");
      return;
    }
    try {
      const response =
        product === "flight"
          ? await travelApi.searchFlights(plan.plan.payload)
          : await travelApi.searchHotels(plan.plan.payload);
      const valid =
        product === "flight"
          ? (response.results as FlightResult[]).filter((x) =>
              validFlight(x, plan.plan!),
            )
          : (response.results as HotelResult[]).filter(validBookableHotel);
      setResults(valid);
      setStatus(valid.length ? "ready" : "empty");
      setMessage(response.warnings?.[0] || "");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Search failed");
    }
  }, [product, plan.plan?.key, retry, visualTest]);
  useEffect(() => {
    void load();
  }, [load]);
  const edit = () =>
    router.canGoBack()
      ? router.back()
      : router.replace(product === "flight" ? "/flights" : "/hotels");
  const sorted = useMemo(() => product === "flight"
    ? filterAndSortFlights(results as FlightResult[], filters, sort)
    : [...results].sort((a, b) => sort === "price" ? (a as HotelResult).totalPrice! - (b as HotelResult).totalPrice! : (b as HotelResult).valueScore - (a as HotelResult).valueScore), [results, filters, sort, product]);
  const flightOptions = useMemo(() => flightFilterOptions(results as FlightResult[]), [results]);
  const hasFilters = filters.stops.length + filters.airlines.length + filters.times.length > 0;
  const openFilters = (section: typeof filterSection) => { setFilterSection(section); setFilterOpen(true); };
  const payload = plan.plan?.payload || {};
  const date = String(
    product === "flight"
      ? payload.departureDate
      : payload.checkIn || new Date().toISOString().slice(0, 10),
  );
  const prices = sorted
    .slice(0, 5)
    .map((x) =>
      product === "flight"
        ? (x as FlightResult).price
        : (x as HotelResult).pricePerNight!,
    );
  return (
    <SafeAreaView style={s0.safe} edges={["top"]}>
      <TopBar />
      <View style={s0.summary}>
        <View style={{ flex: 1 }}>
          <Text style={s0.route}>
            {product === "flight"
              ? `${airportLabel(payload.origin)}  ⇄  ${airportLabel(payload.destination)}`
              : String(payload.destination || "")}
          </Text>
          <Text style={s0.sub}>
            {product === "flight"
              ? `${shortDate(String(payload.departureDate || ""))} – ${shortDate(String(payload.returnDate || ""))}  ·  ${payload.travelers} Traveler${payload.travelers === 1 ? "" : "s"}  ·  ${String(payload.cabinClass || "").replace(/-/g, " ")}`
              : `${shortDate(String(payload.checkIn || ""))} – ${shortDate(String(payload.checkOut || ""))}  ·  ${payload.rooms || 1} Room, ${payload.guests || 2} Guests`}
          </Text>
        </View>
        <Pill label="Edit search" icon="document" onPress={edit} />
      </View>
      <DateStrip
        date={date}
        prices={prices}
        onSelect={(v) =>
          router.setParams(
            product === "flight" ? { departureDate: v } : { checkIn: v },
          )
        }
        onPrevious={() => { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() - 1); const iso = next.toISOString().slice(0, 10); if (iso >= new Date().toISOString().slice(0, 10)) router.setParams(product === "flight" ? { departureDate: iso } : { checkIn: iso }); }}
        onNext={() => { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + 1); const iso = next.toISOString().slice(0, 10); router.setParams(product === "flight" ? { departureDate: iso } : { checkIn: iso }); }}
      />
      <ScrollView
        horizontal
        style={s0.filterRail}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s0.filters}
      >
        <Pill label="Filters" icon="sliders" active={hasFilters} onPress={product === "flight" ? () => openFilters("all") : undefined} />
        {(product === "flight" ? ["Stops", "Airlines", "Times"] : ["Price", "Guest rating", "Property type"]).map((x) => (
          <Pill key={x} label={x} onPress={product === "flight" ? () => openFilters(x.toLowerCase() as typeof filterSection) : undefined} />
        ))}
        <Pill
          label={`Sort: ${sort === "price" ? "Price" : product === "flight" ? "Best" : "Recommended"}`}
          active
          onPress={() => setSort((x) => (x === "best" ? "price" : "best"))}
        />
      </ScrollView>
      <ScrollView contentContainerStyle={s0.body}>
        {status === "loading" ? <Loading product={product} /> : null}
        {message ? (
          <Text accessibilityRole="alert" style={s0.notice}>
            {message}
          </Text>
        ) : null}
        {status === "empty" ? (
          <Empty
            title={`No ${product === "flight" ? "flights" : "properties"} found`}
            body="Try changing your dates or removing filters."
            retry={() => setRetry((x) => x + 1)}
            edit={edit}
          />
        ) : null}
        {status === "error" ? (
          <Empty
            title="Search could not be completed"
            body={message || "Check your connection and try again."}
            retry={() => setRetry((x) => x + 1)}
            edit={edit}
          />
        ) : null}
        {status === "ready" ? (
          <View style={s0.found}>
            <View style={s0.foundCopy}>
              <Text style={s0.foundTitle}>
                {sorted.length}{" "}
                {product === "flight" ? "flights" : "properties"} found
              </Text>
              <Text style={s0.sub}>
                Prices include taxes and fees when reported by the provider
              </Text>
            </View>
            {product === "hotel" ? (
              <Button
                label="Map view"
                outline
                onPress={() =>
                  Alert.alert(
                    "Map view",
                    "Map inventory is not available from this provider response.",
                  )
                }
              />
            ) : (
              <View style={s0.foundAside}>
                <Text style={s0.change}>ⓘ Price may change</Text>
                <Text style={s0.sub}>Book soon to lock in this price.</Text>
              </View>
            )}
          </View>
        ) : null}
        {sorted.map((x, i) =>
          product === "flight" ? (
            <FlightCard key={x.id} result={x as FlightResult} rank={i} params={params} />
          ) : (
            <HotelCard
              key={x.id}
              result={x as HotelResult}
              rank={i}
              params={params}
            />
          ),
        )}
        {status === "ready" && product === "flight" && results.length > 0 && sorted.length === 0 ? <Empty title="No flights match these filters" body="Clear the selected filters to see all loaded flights." retry={() => setFilters(emptyFlightFilters())} retryLabel="Clear filters" edit={edit} /> : null}
        {status === "ready" && availability.priceAlerts ? (
          product === "flight" && plan.plan ? (
            <FlightPriceAlert plan={plan.plan} results={results as FlightResult[]} />
          ) : (
            <HotelPriceAlerts />
          )
        ) : null}
      </ScrollView>
      {product === "flight" ? <FlightFilterModal visible={filterOpen} section={filterSection} filters={filters} options={flightOptions} onChange={setFilters} onClose={() => setFilterOpen(false)} /> : null}
      <BottomNav />
    </SafeAreaView>
  );
}
const stopLabels = { nonstop: "Nonstop", one: "1 stop", twoPlus: "2+ stops" } as const;
const timeLabels = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night" } as const;
function FlightFilterModal({ visible, section, filters, options, onChange, onClose }: { visible: boolean; section: "all" | "stops" | "airlines" | "times"; filters: FlightFilters; options: ReturnType<typeof flightFilterOptions>; onChange: (filters: FlightFilters) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(filters);
  useEffect(() => { if (visible) setDraft(filters); }, [visible, filters]);
  const toggle = (key: keyof FlightFilters, value: string) => setDraft((current) => ({ ...current, [key]: current[key].includes(value as never) ? current[key].filter((x) => x !== value) : [...current[key], value] } as FlightFilters));
  const choices = (key: keyof FlightFilters, values: readonly string[], labels?: Record<string, string>) => <View style={s0.choiceRow}>{values.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: draft[key].includes(value as never) }} onPress={() => toggle(key, value)} style={[s0.choice, draft[key].includes(value as never) && s0.choiceActive]}><Text style={s0.inputLabel}>{labels?.[value] || value}</Text></Pressable>)}</View>;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal><View style={s0.modalBackdrop}><View style={s0.sheet} accessibilityLabel="Flight filters"><View style={s0.sheetHead}><Text accessibilityRole="header" style={s0.foundTitle}>Filter flights</Text><Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose}><FlowIcon name="close" /></Pressable></View>{(section === "all" || section === "stops") && options.stops.length ? <><Text style={s0.inputLabel}>Stops</Text>{choices("stops", options.stops, stopLabels)}</> : null}{(section === "all" || section === "airlines") && options.airlines.length ? <><Text style={s0.inputLabel}>Airlines</Text>{choices("airlines", options.airlines)}</> : null}{(section === "all" || section === "times") && options.times.length ? <><Text style={s0.inputLabel}>Departure time</Text>{choices("times", options.times, timeLabels)}</> : null}<Button label="Apply filters" onPress={() => { onChange(draft); onClose(); }} /><Button label="Clear filters" outline onPress={() => { const clear = emptyFlightFilters(); setDraft(clear); onChange(clear); }} /></View></View></Modal>;
}
function FlightCard({ result, rank, params }: { result: FlightResult; rank: number; params: Record<string, string | string[]> }) {
  const { savedIds, toggle } = useSavedFlights();
  const saved = savedIds.has(result.id);
  return (
    <View style={[s0.card, rank === 0 && s0.best]}>
      <View style={s0.cardTop}>
        {rank === 0 ? (
          <View style={s0.badgeRow}>
            <Badge>★ Best overall</Badge>
            <Badge green>Great price</Badge>
          </View>
        ) : rank === 1 ? (
          <Badge green>2nd best</Badge>
        ) : (
          <Badge>
            {result.stops
              ? `${result.stops} stop${result.stops > 1 ? "s" : ""}`
              : "Nonstop"}
          </Badge>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${saved ? "Remove" : "Save"} ${result.airlineName}`}
          accessibilityState={{ selected: saved }}
          onPress={() => toggle(result.id)}
        >
          <FlowIcon
            name="heart"
            fill={saved ? ui.blue : "none"}
            color={saved ? ui.blue : ui.muted}
          />
        </Pressable>
      </View>
      <View style={s0.flightMain}>
        {result.airlineLogo ? (
          <Image source={{ uri: result.airlineLogo }} style={s0.airline} />
        ) : (
          <View style={s0.airlineFallback}>
            <Text>{result.airlineName.slice(0, 2)}</Text>
          </View>
        )}
        <View style={s0.departureBlock}>
          <Text style={s0.nameSmall}>{result.airlineName}</Text>
          <Text style={s0.time}>{clock(result.departureTime)}</Text>
          <Text style={s0.sub}>{result.originAirport}</Text>
        </View>
        <View style={s0.timeline}>
          <Text style={s0.sub}>{result.duration}</Text>
          <View style={s0.line} />
          <Text style={s0.nonstop}>
            {result.stops ? `${result.stops} stop` : "Nonstop"}
          </Text>
        </View>
        <View style={s0.arrivalBlock}>
          <Text style={s0.time}>{clock(result.arrivalTime)}</Text>
          <Text style={s0.sub}>{result.destinationAirport}</Text>
        </View>
        <View style={s0.priceBox}>
          <Text style={s0.bigPrice}>
            {money(result.currency, result.price)}
          </Text>
          <Text style={s0.sub}>round trip</Text>
        </View>
      </View>
      <View style={s0.benefits}>
        <Text style={s0.benefit}>
          ▣ {result.baggageInfo || "Baggage details unavailable"}
        </Text>
        <Text style={s0.benefit}>◉ Seat selection unavailable</Text>
        <Text style={s0.benefit}>
          ◉ {result.refundInfo || "Fare rules unavailable"}
        </Text>
        <Button
          label="View details"
          outline={rank !== 0}
          onPress={() =>
            router.push({
              pathname: "/flight-details",
              params: {
                result: JSON.stringify(result),
                ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, one(value) || ""])),
              },
            })
          }
        />
      </View>
    </View>
  );
}
function HotelCard({
  result,
  rank,
  params,
}: {
  result: HotelResult;
  rank: number;
  params: Record<string, string | string[]>;
}) {
  const [saved, setSaved] = useState(false);
  const compact = useWindowDimensions().width < 430;
  const score =
    result.reviewScore == null
      ? result.rating
      : result.reviewScore * (10 / (result.reviewScale || 10));
  return (
    <View style={[s0.hotelCard, compact && s0.hotelCardCompact]}>
      <View style={[s0.hotelImageWrap, compact && s0.hotelImageWrapCompact]}>
        {result.imageUrl ? (
          <Image source={{ uri: result.imageUrl }} style={s0.hotelImage} />
        ) : (
          <View style={s0.hotelImage} />
        )}
        <View style={s0.overlay}>
          <Text style={s0.overlayText}>
            {result.imageUrls?.length
              ? `▧ 1 / ${result.imageUrls.length}`
              : "Image unavailable"}
          </Text>
        </View>
        <View style={s0.hotelBadge}>
          <Badge>
            {rank === 0
              ? "Best overall"
              : rank === 1
                ? "Great price"
                : "Highly rated"}
          </Badge>
        </View>
      </View>
      <View style={[s0.hotelCopy, compact && s0.hotelCopyCompact]}>
        <Pressable onPress={() => setSaved(!saved)} style={s0.heart}>
          <FlowIcon name="heart" fill={saved ? ui.blue : "white"} />
        </Pressable>
        <Text style={s0.hotelName}>{result.name}</Text>
        <Text style={s0.stars}>
          {"★".repeat(result.classificationStars || Math.round(result.rating))}{" "}
          <Text style={s0.sub}>
            {" "}
            · {result.neighbourhood || result.location}
          </Text>
        </Text>
        <Text style={s0.review}>
          <Text style={s0.score}>{score.toFixed(1)}</Text>{" "}
          {score >= 9 ? "Exceptional" : score >= 8 ? "Excellent" : "Good"}
          {result.reviewCount
            ? `  ·  ${result.reviewCount.toLocaleString()} reviews`
            : ""}
        </Text>
        {result.distanceFromCenter ? (
          <Text style={s0.sub}>
            ⌾ {result.distanceFromCenter} from city center
          </Text>
        ) : null}
        <View style={s0.amenities}>
          {result.amenities.slice(0, 3).map((a) => (
            <Text key={a} style={s0.amenity}>
              ● {a}
            </Text>
          ))}
        </View>
        <Text style={s0.providers}>{result.provider}</Text>
        <View style={s0.hotelPrice}>
          <View style={s0.foundCopy}>
            <Text style={s0.bigPrice}>
              {money(result.currency, result.pricePerNight)}
              <Text style={s0.sub}> /night</Text>
            </Text>
            <Text style={s0.sub}>
              {money(result.currency, result.totalPrice)} total
            </Text>
          </View>
          <Button
            label="View deal"
            onPress={() =>
              router.push({
                pathname: "/hotel-details",
                params: {
                  result: JSON.stringify(result),
                  ...Object.fromEntries(
                    Object.entries(params).map(([k, v]) => [k, one(v) || ""]),
                  ),
                },
              })
            }
          />
        </View>
      </View>
    </View>
  );
}
function Loading({ product }: { product: Product }) {
  return (
            <View style={s0.foundAside}>
      {[0, 1, 2].map((x) => (
        <View key={x} style={s0.skeleton} />
      ))}
      <View style={s0.loading}>
        <ActivityIndicator color={ui.blue} />
        <Text style={s0.sub}>
          Searching available {product === "flight" ? "flights" : "stays"}…
        </Text>
      </View>
    </View>
  );
}
function AlertShell({ children }: { children: React.ReactNode }) {
  return (
    <View style={s0.alert}>
      <View style={s0.alertIcon}>
        <FlowIcon name="bell" color="white" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s0.foundTitle}>Price alerts</Text>
        {children}
      </View>
    </View>
  );
}
function HotelPriceAlerts() {
  return (
    <AlertShell>
      <Text style={s0.sub}>
        Hotel alert creation is not currently supported. Manage your existing
        price alerts instead.
      </Text>
      <Button
        label="View price alerts"
        outline
        onPress={() => router.push("/price-alerts")}
      />
    </AlertShell>
  );
}
function FlightPriceAlert({ plan, results }: { plan: SearchPlan; results: FlightResult[] }) {
  const presentation = flightAlertPresentation("flight", true, results);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [open, setOpen] = useState(false);
  const [targetDraft, setTargetDraft] = useState("");
  const [targetError, setTargetError] = useState("");
  const [creating, setCreating] = useState(false);
  const currency = presentation.currencies.includes(selectedCurrency)
    ? selectedCurrency
    : presentation.currencies.length === 1
      ? presentation.currencies[0]
      : "";
  const createAlert = async () => {
    if (creating || !currency || !presentation.enabled) return;
    const parsed = parseTargetPrice(targetDraft);
    if (parsed.error || parsed.value === undefined) {
      setTargetError(parsed.error || "Enter a target price.");
      return;
    }
    setCreating(true);
    setTargetError("");
    try {
      await travelApi.createPriceAlert(
        buildFlightPriceAlertPayload(plan, parsed.value, currency),
      );
      setOpen(false);
      setTargetDraft("");
      Alert.alert(
        "Price alert created",
        "We’ll track this flight search against your target price.",
        [
          { text: "View price alerts", onPress: () => router.push("/price-alerts") },
          { text: "Stay here" },
        ],
      );
    } catch (error) {
      if (error instanceof TravelApiError && error.status === 401) {
        setOpen(false);
        Alert.alert("Sign in required", "Sign in to create a price alert.", [
          { text: "Sign in", onPress: () => router.push("/email-auth") },
          { text: "Cancel" },
        ]);
      } else if (
        error instanceof TravelApiError &&
        error.status === 409 &&
        error.details?.duplicate === true
      ) {
        setTargetError("This alert already exists. Open Price alerts to manage it.");
      } else {
        setTargetError(
          error instanceof TravelApiError
            ? error.message
            : "Unable to create price alert. Try again.",
        );
      }
    } finally {
      setCreating(false);
    }
  };
  return (
    <>
      <AlertShell>
        <Text style={s0.sub}>
          Get notified when this flight search reaches your target price.
        </Text>
        {presentation.currencies.length > 1 ? (
          <View accessibilityLabel="Choose alert currency" style={s0.currencyRow}>
            {presentation.currencies.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: currency === item }}
                onPress={() => setSelectedCurrency(item)}
                style={[s0.currency, currency === item && s0.currencySelected]}
              >
                <Text>{item}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Button
          label="Create price alert"
          outline
          disabled={!presentation.enabled || !currency}
          onPress={() => {
            setTargetError("");
            setOpen(true);
          }}
        />
        {!presentation.enabled ? (
          <Text accessibilityRole="alert" style={s0.sub}>
            {presentation.liveResults.length
              ? "A supported result currency was not available for this search."
              : "Price alerts require a valid live flight result."}
          </Text>
        ) : null}
      </AlertShell>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => !creating && setOpen(false)}
        accessibilityViewIsModal
      >
        <KeyboardAvoidingView
          style={s0.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s0.sheet} accessibilityLabel="Create flight price alert">
            <Text accessibilityRole="header" style={s0.foundTitle}>Create price alert</Text>
            <Text style={s0.route}>{plan.summary}</Text>
            <Text style={s0.sub}>
              {String(plan.payload.tripType)} · {String(plan.payload.travelers)} travelers · {String(plan.payload.cabinClass)} · {currency}
            </Text>
            <Text style={s0.inputLabel}>Target price ({currency})</Text>
            <TextInput
              autoFocus
              accessibilityLabel={`Target price in ${currency}`}
              value={targetDraft}
              onChangeText={(value) => { setTargetDraft(value); setTargetError(""); }}
              keyboardType="decimal-pad"
              editable={!creating}
              style={s0.input}
            />
            {targetError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s0.error}>{targetError}</Text> : null}
            <Button label={creating ? "Creating…" : "Create price alert"} disabled={creating} onPress={() => void createAlert()} />
            <Button label="Cancel" outline disabled={creating} onPress={() => setOpen(false)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
export function BottomNav() {
  const inset = useSafeAreaInsets();
  return (
    <View style={[s0.nav, { paddingBottom: Math.max(inset.bottom, 8) }]}>
      {[
        ["compass", "Explore"],
        ["trip", "Trips"],
        ["search", "Search"],
        ["heart", "Saved"],
        ["person", "Profile"],
      ].map(([icon, label]) => (
        <View key={label} style={s0.navItem}>
          <FlowIcon
            name={icon as never}
            color={label === "Search" ? ui.blue : ui.muted}
          />
          <Text style={[s0.navText, label === "Search" && { color: ui.blue }]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}
const s0 = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },
  summary: {
    paddingHorizontal: 26,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  filterRail: { height: 70, flexGrow: 0 },
  route: { fontSize: 21, fontWeight: "900", color: ui.navy },
  sub: { fontSize: 12, color: ui.muted, lineHeight: 17 },
  filters: { paddingHorizontal: 18, paddingVertical: 16, gap: 9 },
  body: { paddingHorizontal: 18, paddingBottom: 92, gap: 14 },
  notice: {
    backgroundColor: "#F2F6FF",
    color: ui.navy,
    padding: 10,
    borderRadius: 8,
  },
  found: {
    minHeight: 78,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAFCFF",
  },
  foundCopy: { flex: 1, minWidth: 0 },
  foundAside: { flexShrink: 1, maxWidth: 160 },
  foundTitle: { fontSize: 16, fontWeight: "800", color: ui.navy },
  change: { color: ui.navy, fontSize: 12 },
  card: {
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 14,
    padding: 15,
    gap: 15,
    backgroundColor: "white",
  },
  best: { borderColor: ui.blue },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  badgeRow: { flexDirection: "row", gap: 7 },
  flightMain: { flexDirection: "row", alignItems: "center", gap: 6 },
  airline: { width: 38, height: 38, resizeMode: "contain" },
  airlineFallback: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: "#EEF2F8",
    alignItems: "center",
    justifyContent: "center",
  },
  nameSmall: { fontSize: 12, color: ui.navy, fontWeight: "700" },
  departureBlock: { flex: 1.15, minWidth: 0 },
  arrivalBlock: { flex: 0.9, minWidth: 0 },
  time: { fontSize: 17, fontWeight: "900", color: ui.navy },
  timeline: { flex: 1, minWidth: 56, maxWidth: 95, alignItems: "center" },
  line: {
    width: "100%",
    height: 1,
    backgroundColor: ui.muted,
    marginVertical: 7,
  },
  nonstop: { fontSize: 11, color: ui.blue },
  priceBox: { width: 62, flexShrink: 0, alignItems: "flex-end" },
  bigPrice: { fontSize: 22, fontWeight: "900", color: ui.navy },
  benefits: {
    borderTopWidth: 1,
    borderTopColor: "#EDF0F5",
    paddingTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefit: { fontSize: 11, color: ui.muted, flex: 1 },
  hotelCard: {
    height: 234,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 13,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: "white",
  },
  hotelCardCompact: { height: 282 },
  hotelImageWrap: { width: "39%" },
  hotelImageWrapCompact: { width: "38%" },
  hotelImage: { width: "100%", height: "100%", backgroundColor: "#E9EDF3" },
  overlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,.72)",
    padding: 6,
    borderRadius: 5,
  },
  overlayText: { color: "white", fontSize: 10, fontWeight: "700" },
  hotelBadge: { position: "absolute", top: 10, left: 9 },
  hotelCopy: { flex: 1, padding: 12, gap: 5 },
  hotelCopyCompact: { padding: 10 },
  heart: { position: "absolute", right: 8, top: 7, zIndex: 2 },
  hotelName: {
    fontSize: 17,
    fontWeight: "900",
    color: ui.navy,
    paddingRight: 30,
  },
  stars: { color: "#FFB800", fontSize: 14 },
  review: { fontSize: 11, color: ui.navy },
  score: { backgroundColor: ui.blue, color: "white", fontWeight: "900" },
  amenities: { gap: 3 },
  amenity: { color: ui.green, fontSize: 10 },
  providers: { fontSize: 10, color: ui.muted },
  hotelPrice: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skeleton: {
    height: 160,
    backgroundColor: "#EEF1F6",
    borderRadius: 14,
    marginBottom: 12,
  },
  loading: {
    position: "absolute",
    top: 130,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
  },
  alert: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 13,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: "#FAFCFF",
  },
  currencyRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  currency: { borderWidth: 1, borderColor: ui.border, borderRadius: 8, padding: 8 },
  currencySelected: { borderColor: ui.blue, backgroundColor: "#F5F8FF" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(7,21,47,.45)" },
  sheet: { backgroundColor: "white", padding: 24, paddingBottom: 36, gap: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: ui.border, borderRadius: 22, paddingHorizontal: 14 },
  choiceActive: { borderColor: ui.blue, backgroundColor: "#EEF4FF" },
  inputLabel: { fontSize: 13, fontWeight: "700", color: ui.navy },
  input: { height: 48, borderWidth: 1, borderColor: ui.border, borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  error: { color: "#B42318", fontSize: 12 },
  alertIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ui.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  nav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: ui.border,
    paddingTop: 9,
    backgroundColor: "white",
  },
  navItem: { flex: 1, alignItems: "center", gap: 3 },
  navText: { fontSize: 10, color: ui.muted, fontWeight: "700" },
});
