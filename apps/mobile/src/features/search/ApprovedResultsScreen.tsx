import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Info } from "lucide-react-native";
import {
  travelApi,
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
import { flightEditSearchParams } from "../flow/flightSearchModel";
import { resolveDateHeaderCollapsed } from "./resultsHeaderModel";
import { useUnreadNotifications } from "../notifications/useUnreadNotifications";
import {
  activeFlightFilterCount,
  emptyFlightFilters,
  filterAndSortFlights,
  flightFilterOptions,
  type FlightFilters,
} from "./flightFilters";
import { readCurrencyPreference } from "../../storage/preferenceStorage";
import {
  convertAmount,
  displayPrice,
  resolveDisplayCurrencyContext,
  type DisplayPrice,
  type ExchangeRates,
} from "../currency/displayCurrency";

type Product = "flight" | "hotel";
type Status = "loading" | "ready" | "empty" | "error";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const airportLabel = (code: unknown) => {
  const value = String(code || "").toUpperCase();
  const airport = airports.find((item) => item.code === value);
  return airport ? `${airport.city} (${value})` : value;
};
export function ApprovedResultsScreen({ product }: { product: Product }) {
  const { width } = useWindowDimensions();
  const narrowHeader = width < 360;
  const stackedResultsSummary = width < 430;
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
  const [filterSection, setFilterSection] = useState<
    "all" | "stops" | "airlines" | "times"
  >("all");
  const hasUnreadNotifications = useUnreadNotifications(product === "flight");
  const [dateHeaderCollapsed, setDateHeaderCollapsed] = useState(false);
  const [currencyState, setCurrencyState] = useState<{ currency: string; rates: ExchangeRates } | null>(null);
  const currencyRatesRef = useRef<ExchangeRates | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    const ratesRequest = currencyRatesRef.current
      ? Promise.resolve(currencyRatesRef.current)
      : travelApi.currencyRates().then((payload) => payload.rates).catch(() => ({}));
    void Promise.all([
      readCurrencyPreference().catch(() => null),
      travelApi.location().catch(() => null),
      ratesRequest,
    ]).then(([preferredCurrency, location, rates]) => {
      if (!active) return;
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      const resolution = resolveDisplayCurrencyContext({
        preferredCurrency,
        ipCountryCode: location?.countryCode,
        locale,
      });
      if (Object.keys(rates).length) currencyRatesRef.current = rates;
      setCurrencyState({
        currency: resolution.resolvedCurrency,
        rates,
      });
      if (__DEV__) console.debug("[currency] display resolution", resolution);
    });
    return () => { active = false; };
  }, []));
  const dateHeaderProgress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(dateHeaderProgress, {
      toValue: dateHeaderCollapsed ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [dateHeaderCollapsed, dateHeaderProgress]);
  const onResultsScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (product !== "flight") return;
    const y = Math.max(0, event.nativeEvent.contentOffset.y);
    setDateHeaderCollapsed((current) => {
      const next = resolveDateHeaderCollapsed(y, current);
      return next === current ? current : next;
    });
  }, [product]);
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
  const edit = () => {
    if (product === "flight") {
      router.push({ pathname: "/edit-flight-search", params: flightEditSearchParams(params) });
      return;
    }
    router.canGoBack() ? router.back() : router.replace("/hotels");
  };
  const sorted = useMemo(() => {
    if (product === "flight") {
      return filterAndSortFlights(
        results as FlightResult[],
        filters,
        sort,
        currencyState
          ? (result) => convertAmount(result.price, result.currency, "USD", currencyState.rates)
          : undefined,
      );
    }
    return [...results].sort((a, b) =>
        sort === "price"
          ? (a as HotelResult).totalPrice! - (b as HotelResult).totalPrice!
          : (b as HotelResult).valueScore - (a as HotelResult).valueScore,
      );
  }, [results, filters, sort, product, currencyState]);
  const flightOptions = useMemo(
    () => flightFilterOptions(results as FlightResult[]),
    [results],
  );
  const activeFilterCount = activeFlightFilterCount(filters);
  const openFlightFilters = (
    section: "all" | "stops" | "airlines" | "times",
  ) => {
    setFilterSection(section);
    setFilterOpen(true);
  };
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
  const flightDisplayPrices = useMemo(() => {
    if (product !== "flight" || !currencyState) return new Map<string, DisplayPrice>();
    return new Map((sorted as FlightResult[]).map((result) => [
      result.id,
      displayPrice(result.price, result.currency, currencyState.currency, currencyState.rates),
    ]));
  }, [currencyState, product, sorted]);
  return (
    <SafeAreaView style={s0.safe} edges={["top"]}>
      <TopBar
        flightResults={product === "flight"}
        hasUnreadNotifications={product === "flight" && hasUnreadNotifications}
        onNotificationsPress={product === "flight" ? () => router.push("/notifications") : undefined}
      />
      <View style={[s0.summary, narrowHeader && s0.summaryNarrow]}>
        <View style={s0.summaryCopy}>
          <Text style={s0.route}>
            {product === "flight"
              ? `${airportLabel(payload.origin)}  ⇄  ${airportLabel(payload.destination)}`
              : String(payload.destination || "")}
          </Text>
          <Text style={[s0.sub, s0.summaryMeta]}>
            {product === "flight"
              ? `${shortDate(String(payload.departureDate || ""))} – ${shortDate(String(payload.returnDate || ""))}  ·  ${payload.travelers} Traveler${payload.travelers === 1 ? "" : "s"}  ·  ${String(payload.cabinClass || "").replace(/-/g, " ")}`
              : `${shortDate(String(payload.checkIn || ""))} – ${shortDate(String(payload.checkOut || ""))}  ·  ${payload.rooms || 1} Room, ${payload.guests || 2} Guests`}
          </Text>
        </View>
        <View style={narrowHeader && s0.editNarrow}>
          <Pill
            label="Edit search"
            icon={product === "flight" ? undefined : "document"}
            flightResultsIcon={product === "flight" ? "edit" : undefined}
            onPress={edit}
          />
        </View>
      </View>
      <Animated.View
        pointerEvents={product === "flight" && dateHeaderCollapsed ? "none" : "auto"}
        accessibilityElementsHidden={product === "flight" && dateHeaderCollapsed}
        importantForAccessibility={product === "flight" && dateHeaderCollapsed ? "no-hide-descendants" : "auto"}
        style={product === "flight" ? {
          height: dateHeaderProgress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }),
          opacity: dateHeaderProgress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.15, 0] }),
          overflow: "hidden",
          transform: [{ translateY: dateHeaderProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }],
        } : undefined}
      >
        <DateStrip
          date={date}
          prices={prices}
          formattedPrices={product === "flight" ? sorted.slice(0, 5).map((result) => flightDisplayPrices.get(result.id)?.formatted) : undefined}
          flightResults={product === "flight"}
          onSelect={(v) =>
            router.setParams(
              product === "flight" ? { departureDate: v } : { checkIn: v },
            )
          }
        />
      </Animated.View>
      <ScrollView
        horizontal
        style={s0.filterRail}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s0.filters}
      >
        <Pill
          label={product === "flight" && activeFilterCount ? `Filters (${activeFilterCount})` : "Filters"}
          active={product === "flight" && activeFilterCount > 0}
          icon={product === "flight" ? undefined : "sliders"}
          flightResultsIcon={product === "flight" ? "filters" : undefined}
          onPress={() => product === "flight" ? openFlightFilters("all") :
            Alert.alert(
              "Filters",
              "Filter controls use the current live result set.",
            )
          }
        />
        {(product === "flight"
          ? ["Stops", "Airlines", "Times"]
          : ["Price", "Guest rating", "Property type"]
        ).map((x) => (
          <Pill
            key={x}
            label={x}
            active={product === "flight" && (
              x === "Stops" ? filters.stops.length > 0 :
              x === "Airlines" ? filters.airlines.length > 0 :
              x === "Times" ? filters.times.length > 0 : false
            )}
            flightResultsChevron={product === "flight"}
            onPress={() => product === "flight" ? openFlightFilters(x.toLowerCase() as "stops" | "airlines" | "times") :
              Alert.alert(
                x,
                "No additional values are available from this search response.",
              )
            }
          />
        ))}
        <Pill
          label={`Sort: ${sort === "price" ? "Price" : product === "flight" ? "Best" : "Recommended"}`}
          active
          flightResultsChevron={product === "flight"}
          onPress={() => setSort((x) => (x === "best" ? "price" : "best"))}
        />
      </ScrollView>
      <ScrollView
        contentContainerStyle={s0.body}
        onScroll={onResultsScroll}
        scrollEventThrottle={16}
      >
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
          <View style={[s0.found, stackedResultsSummary && s0.foundNarrow]}>
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
              <View
                style={[
                  s0.foundAside,
                  stackedResultsSummary && s0.foundAsideNarrow,
                ]}
              >
                <View style={s0.priceNoticeTitle}>
                  <Info
                    accessibilityElementsHidden
                    accessible={false}
                    color={ui.muted}
                    size={16}
                    strokeWidth={2}
                  />
                  <Text style={s0.change}>Price may change</Text>
                </View>
                <Text style={s0.sub}>Book soon to lock in this price.</Text>
              </View>
            )}
          </View>
        ) : null}
        {sorted.map((x, i) =>
          product === "flight" ? (
            <FlightCard key={x.id} result={x as FlightResult} displayPrice={flightDisplayPrices.get(x.id)} rank={i} params={params} />
          ) : (
            <HotelCard
              key={x.id}
              result={x as HotelResult}
              rank={i}
              params={params}
            />
          ),
        )}
        {status === "ready" && product === "flight" && results.length > 0 && sorted.length === 0 ? (
          <Empty
            title="No flights match these filters"
            body="Clear the selected filters to see all loaded flights."
            retry={() => setFilters(emptyFlightFilters())}
            retryLabel="Clear filters"
            edit={edit}
          />
        ) : null}
        {status === "ready" && availability.priceAlerts ? <PriceAlert product={product} /> : null}
      </ScrollView>
      {product === "flight" ? (
        <FlightFilterModal
          visible={filterOpen}
          section={filterSection}
          filters={filters}
          options={flightOptions}
          onChange={setFilters}
          onClose={() => setFilterOpen(false)}
        />
      ) : null}
      <BottomNav />
    </SafeAreaView>
  );
}
const stopLabels = {
  nonstop: "Nonstop",
  one: "1 stop",
  twoPlus: "2+ stops",
} as const;
const timeLabels = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
} as const;

function FlightFilterModal({
  visible,
  section,
  filters,
  options,
  onChange,
  onClose,
}: {
  visible: boolean;
  section: "all" | "stops" | "airlines" | "times";
  filters: FlightFilters;
  options: ReturnType<typeof flightFilterOptions>;
  onChange: (filters: FlightFilters) => void;
  onClose: () => void;
}) {
  const inset = useSafeAreaInsets();
  const [draft, setDraft] = useState(filters);
  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);
  const toggle = (key: keyof FlightFilters, value: string) =>
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(value as never)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }) as FlightFilters);
  const choices = (
    key: keyof FlightFilters,
    values: readonly string[],
    labels?: Record<string, string>,
  ) => values.length ? (
    <View style={s0.choiceRow}>
      {values.map((value) => {
        const selected = draft[key].includes(value as never);
        return (
          <Pressable
            key={value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            onPress={() => toggle(key, value)}
            style={[s0.choice, selected && s0.choiceActive]}
          >
            <Text style={[s0.choiceText, selected && s0.choiceTextActive]}>
              {labels?.[value] || value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  ) : <Text style={s0.noChoices}>No additional values are available in these results.</Text>;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <View style={s0.modalBackdrop}>
        <View style={[s0.sheet, { paddingBottom: Math.max(inset.bottom, 18) }]} accessibilityLabel="Flight filters">
          <View style={s0.sheetHead}>
            <Text accessibilityRole="header" style={s0.foundTitle}>Filter flights</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={s0.closeButton}>
              <FlowIcon name="close" />
            </Pressable>
          </View>
          <ScrollView style={s0.sheetScroll} contentContainerStyle={s0.sheetContent} showsVerticalScrollIndicator={false}>
            {section === "all" || section === "stops" ? <View style={s0.filterSection}><Text style={s0.filterSectionTitle}>Stops</Text>{choices("stops", options.stops, stopLabels)}</View> : null}
            {section === "all" || section === "airlines" ? <View style={s0.filterSection}><Text style={s0.filterSectionTitle}>Airlines</Text>{choices("airlines", options.airlines)}</View> : null}
            {section === "all" || section === "times" ? <View style={s0.filterSection}><Text style={s0.filterSectionTitle}>Departure time</Text>{choices("times", options.times, timeLabels)}</View> : null}
          </ScrollView>
          <View style={s0.sheetActions}>
            <Button label="Apply filters" onPress={() => { onChange(draft); onClose(); }} />
            <Button label="Clear filters" outline onPress={() => { const clear = emptyFlightFilters(); setDraft(clear); onChange(clear); }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
function FlightCard({ result, displayPrice: fare, rank, params }: { result: FlightResult; displayPrice?: DisplayPrice; rank: number; params: Record<string, string | string[]> }) {
  const [saved, setSaved] = useState(false);
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
          accessibilityLabel={`${saved ? "Remove" : "Save"} ${result.airlineName}`}
          onPress={() => setSaved(!saved)}
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
            {fare?.formatted ?? "—"}
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
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={s0.loadingState}>
      <View style={s0.loadingMessage}>
        <ActivityIndicator color={ui.blue} />
        <Text
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          style={s0.loadingText}
        >
          Searching available {product === "flight" ? "flights" : "stays"}…
        </Text>
      </View>
      <Animated.View style={[s0.skeletonList, { opacity }]}>
        {[0, 1, 2].map((x) =>
          product === "flight" ? (
            <FlightLoadingSkeleton key={x} />
          ) : (
            <HotelLoadingSkeleton key={x} />
          ),
        )}
      </Animated.View>
    </View>
  );
}

function SkeletonLine({ style }: { style?: object }) {
  return <View style={[s0.skeletonLine, style]} />;
}

function FlightLoadingSkeleton() {
  return (
    <View style={s0.skeletonCard} accessibilityElementsHidden>
      <View style={s0.skeletonTopRow}>
        <View style={s0.skeletonBadge} />
        <View style={s0.skeletonHeart} />
      </View>
      <View style={s0.skeletonFlightRow}>
        <View style={s0.skeletonLogo} />
        <View style={s0.skeletonDeparture}>
          <SkeletonLine style={s0.skeletonName} />
          <SkeletonLine style={s0.skeletonTime} />
          <SkeletonLine style={s0.skeletonAirport} />
        </View>
        <View style={s0.skeletonRoute}>
          <SkeletonLine style={s0.skeletonDuration} />
          <SkeletonLine style={s0.skeletonRouteLine} />
          <SkeletonLine style={s0.skeletonStop} />
        </View>
        <View style={s0.skeletonArrival}>
          <SkeletonLine style={s0.skeletonTime} />
          <SkeletonLine style={s0.skeletonAirport} />
        </View>
        <View style={s0.skeletonPrice}>
          <SkeletonLine style={s0.skeletonPriceLine} />
          <SkeletonLine style={s0.skeletonPriceCaption} />
        </View>
      </View>
      <View style={s0.skeletonBenefits}>
        <View style={s0.skeletonBenefitLines}>
          <SkeletonLine style={s0.skeletonBenefitLine} />
          <SkeletonLine style={s0.skeletonBenefitLineShort} />
          <SkeletonLine style={s0.skeletonBenefitLine} />
        </View>
        <View style={s0.skeletonButton} />
      </View>
    </View>
  );
}

function HotelLoadingSkeleton() {
  return (
    <View style={s0.hotelSkeletonCard} accessibilityElementsHidden>
      <View style={s0.hotelSkeletonImage} />
      <View style={s0.hotelSkeletonCopy}>
        <SkeletonLine style={s0.hotelSkeletonTitle} />
        <SkeletonLine style={s0.hotelSkeletonMeta} />
        <SkeletonLine style={s0.hotelSkeletonReview} />
        <SkeletonLine style={s0.hotelSkeletonDetail} />
        <View style={s0.hotelSkeletonFooter}>
          <SkeletonLine style={s0.hotelSkeletonPrice} />
          <View style={s0.skeletonButton} />
        </View>
      </View>
    </View>
  );
}
function PriceAlert({ product }: { product: Product }) {
  return (
    <View style={s0.alert}>
      <View style={s0.alertIcon}>
        <FlowIcon name="bell" color="white" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s0.foundTitle}>Price alerts</Text>
        <Text style={s0.sub}>
          Track this {product === "flight" ? "route" : "search"} and get
          notified when prices drop.
        </Text>
      </View>
      <Button
        label="Track prices"
        outline
        onPress={() => router.push("/price-alerts")}
      />
    </View>
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
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  summaryNarrow: { flexDirection: "column", gap: 8 },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryMeta: { marginTop: 3 },
  editNarrow: { alignSelf: "flex-start" },
  filterRail: { height: 64, flexGrow: 0 },
  route: { fontSize: 20, lineHeight: 25, fontWeight: "900", color: ui.navy },
  sub: { fontSize: 12, color: ui.muted, lineHeight: 17 },
  filters: { paddingHorizontal: 18, paddingVertical: 10, gap: 9, alignItems: "center" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10, 24, 48, 0.42)" },
  sheet: { maxHeight: "82%", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, gap: 14, backgroundColor: "white" },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sheetScroll: { flexGrow: 0 },
  sheetContent: { gap: 22, paddingBottom: 4 },
  filterSection: { gap: 10 },
  filterSectionTitle: { fontSize: 14, fontWeight: "800", color: ui.navy },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  choice: { minHeight: 42, justifyContent: "center", borderWidth: 1, borderColor: ui.border, borderRadius: 21, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "white" },
  choiceActive: { borderColor: ui.blue, backgroundColor: "#EEF4FF" },
  choiceText: { color: ui.navy, fontSize: 13, fontWeight: "600" },
  choiceTextActive: { color: ui.blue },
  noChoices: { color: ui.muted, fontSize: 13, lineHeight: 19 },
  sheetActions: { gap: 9 },
  body: { paddingHorizontal: 18, paddingBottom: 92, gap: 14 },
  notice: {
    backgroundColor: "#F2F6FF",
    color: ui.navy,
    padding: 10,
    borderRadius: 8,
  },
  found: {
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: "#FAFCFF",
    gap: 12,
  },
  foundNarrow: { alignItems: "flex-start", flexDirection: "column", gap: 8 },
  foundCopy: { flex: 1, minWidth: 0, gap: 2 },
  foundAside: { flexShrink: 1, maxWidth: 170, gap: 2 },
  foundAsideNarrow: { maxWidth: "100%" },
  foundTitle: { fontSize: 16, fontWeight: "800", color: ui.navy },
  priceNoticeTitle: { flexDirection: "row", alignItems: "center", gap: 5 },
  change: { color: ui.navy, fontSize: 12, fontWeight: "600" },
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
  loadingState: { width: "100%", gap: 14 },
  loadingMessage: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  loadingText: { fontSize: 13, lineHeight: 18, color: ui.navy, fontWeight: "700" },
  skeletonList: { width: "100%", gap: 14 },
  skeletonCard: {
    width: "100%",
    minHeight: 190,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 14,
    padding: 15,
    gap: 15,
    backgroundColor: "white",
  },
  skeletonTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skeletonBadge: { width: 92, height: 23, borderRadius: 12, backgroundColor: "#E7EBF1" },
  skeletonHeart: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#E7EBF1" },
  skeletonFlightRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  skeletonLogo: { width: 38, height: 38, borderRadius: 9, backgroundColor: "#E7EBF1" },
  skeletonDeparture: { flex: 1.15, minWidth: 0, gap: 5 },
  skeletonArrival: { flex: 0.9, minWidth: 0, gap: 5 },
  skeletonRoute: { flex: 1, minWidth: 38, maxWidth: 95, alignItems: "center", gap: 6 },
  skeletonPrice: { width: 52, flexShrink: 0, alignItems: "flex-end", gap: 6 },
  skeletonLine: { height: 7, borderRadius: 4, backgroundColor: "#E7EBF1" },
  skeletonName: { width: "78%" },
  skeletonTime: { width: "70%", height: 14 },
  skeletonAirport: { width: "48%" },
  skeletonDuration: { width: "65%", height: 6 },
  skeletonRouteLine: { width: "100%", height: 2 },
  skeletonStop: { width: "52%", height: 6 },
  skeletonPriceLine: { width: "100%", height: 16 },
  skeletonPriceCaption: { width: "75%", height: 6 },
  skeletonBenefits: {
    borderTopWidth: 1,
    borderTopColor: "#EDF0F5",
    paddingTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skeletonBenefitLines: { flex: 1, gap: 7 },
  skeletonBenefitLine: { width: "90%" },
  skeletonBenefitLineShort: { width: "68%" },
  skeletonButton: { width: 88, height: 34, borderRadius: 8, backgroundColor: "#E7EBF1" },
  hotelSkeletonCard: {
    width: "100%",
    height: 234,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 13,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: "white",
  },
  hotelSkeletonImage: { width: "39%", height: "100%", backgroundColor: "#E7EBF1" },
  hotelSkeletonCopy: { flex: 1, padding: 12, gap: 12 },
  hotelSkeletonTitle: { width: "82%", height: 15 },
  hotelSkeletonMeta: { width: "62%" },
  hotelSkeletonReview: { width: "74%" },
  hotelSkeletonDetail: { width: "88%" },
  hotelSkeletonFooter: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  hotelSkeletonPrice: { width: 58, height: 16 },
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
