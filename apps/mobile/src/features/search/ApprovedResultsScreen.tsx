import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Bell,
  Luggage,
  PlaneTakeoff,
  ShieldCheck,
} from "lucide-react-native";
import { FLIGHT_TRIP_TYPE_LABELS } from "../flow/flightTripTypeLabels";
import { Heart } from "lucide-react-native";
import {
  travelApi,
  TravelApiError,
  type FlightResult,
  type HotelResult,
  type MobilePriceAlert,
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
import { useFeatureAvailability } from "../availability/FeatureAvailability";
import { flightEditSearchParams } from "../flow/flightSearchModel";
import {
  activeFlightFilterCount,
  emptyFlightFilters,
  filterAndSortFlights,
  flightSortOptions,
  flightSortQuickLabel,
  flightFilterOptions,
  resolveFlightPriceComparisonContext,
  type FlightSort,
  type FlightFilters,
} from "./flightFilters";
import { FlightFilterSheet, type FlightFilterSectionName } from "./FlightFilterSheet";
import { readCurrencyPreference } from "../../storage/preferenceStorage";
import {
  convertAmount,
  displayPrice,
  resolveDisplayCurrencyContext,
  type DisplayCurrencyResolution,
  type DisplayPrice,
  type ExchangeRates,
} from "../currency/displayCurrency";
import { summarizeBaggage, summarizeFareRules } from "./flightCardSummaries";
import { androidFavoriteColors } from "../home/AndroidFavoriteButton";
import { useSavedFlights } from "../../storage/useSavedFlights";
import { useCanonicalSaved } from "../../storage/useCanonicalSaved";
import { AirlineLogo } from "./AirlineLogo";
import { useAppTheme } from "../../theme/AppTheme";
import { buildFlightDetailParams } from "./flightDetailNavigation";
import { withinFlightLoadingDeadline } from "./flightLoadingDeadline";
import { startFlightSearchEventLoopMonitor } from "./flightSearchDiagnostics";
import { buildRecentSearch, recordRecentSearchBestEffort } from "../recent/recentSearch";
import { buildPriceByDate, calendarIsoFromTimestamp } from "./dateStripModel";
import { flightResultCountLabel } from "./flightResultCount";
import { flightCardLegs, type FlightCardLeg } from "./flightCardLegs";
import { deriveFlightResultHighlights, type FlightResultHighlight } from "./flightResultHighlights";
import { readSession } from "../../storage/sessionStorage";
import {
  buildFlightPriceAlertPayload,
  flightAlertPresentation,
  matchingFlightPriceAlert,
  parseTargetPrice,
} from "../flow/flightPriceAlertModel";
import type { SearchPlan } from "../flow/travelSearchModel";
import { FlightResultsState } from "./FlightResultsState";
import { resolveFlightResultsState } from "./flightResultsStateModel";

type Product = "flight" | "hotel";
type Status = "loading" | "ready" | "empty" | "error";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
export function ApprovedResultsScreen({ product }: { product: Product }) {
  const { theme } = useAppTheme();
  const flightResults = product === "flight";
  const { width } = useWindowDimensions();
  const narrowHeader = width < 360;
  const { availability } = useFeatureAvailability();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const plan = buildSearchPlan(product, params);
  const [results, setResults] = useState<(FlightResult | HotelResult)[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const searchSequence = useRef(0);
  const activeSearch = useRef<AbortController | null>(null);
  const requestInFlight = useRef(false);
  const resultsRef = useRef<(FlightResult | HotelResult)[]>([]);
  const [sort, setSort] = useState<FlightSort>("best");
  const [sortOpen, setSortOpen] = useState(false);
  const [filters, setFilters] = useState<FlightFilters>(emptyFlightFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSection, setFilterSection] = useState<FlightFilterSectionName>("all");
  const [currencyState, setCurrencyState] = useState<{ resolution: DisplayCurrencyResolution; rates: ExchangeRates } | null>(null);
  const currencyRatesRef = useRef<ExchangeRates | null>(null);
  const previousComparisonCurrency = useRef<string | null>(null);
  const previousFlightSearchKey = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!flightResults || !plan.plan?.key) return;
    if (previousFlightSearchKey.current && previousFlightSearchKey.current !== plan.plan.key) {
      setSort("best");
      setFilters(emptyFlightFilters());
      setSortOpen(false);
      setFilterOpen(false);
    }
    previousFlightSearchKey.current = plan.plan.key;
  }, [flightResults, plan.plan?.key]);
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
      setCurrencyState({ resolution, rates });
    });
    return () => { active = false; };
  }, []));
  const visualTest =
    process.env.EXPO_PUBLIC_VISUAL_TEST === "1" && one(params.visual) === "1";
  const load = useCallback(async () => {
    activeSearch.current?.abort("superseded");
    const controller = new AbortController();
    activeSearch.current = controller;
    const sequence = ++searchSequence.current;
    const requestId = `mobile-${Date.now()}-${sequence}`;
    const clientStartedAt = performance.now();
    let deadlineExpired = false;
    const isLatest = () => sequence === searchSequence.current;
    const isCurrent = () => !controller.signal.aborted && isLatest();
    if (!plan.plan) {
      requestInFlight.current = false;
      setStatus("error");
      setMessage(plan.error || "Invalid search");
      return;
    }
    requestInFlight.current = true;
    setStatus("loading");
    setMessage("");
    if (visualTest) {
      setResults(product === "flight" ? visualFlights : visualHotels);
      resultsRef.current = product === "flight" ? visualFlights : visualHotels;
      setStatus("ready");
      requestInFlight.current = false;
      return;
    }
    const stopEventLoopMonitor = __DEV__ && product === "flight"
      ? startFlightSearchEventLoopMonitor()
      : undefined;
    try {
      const response =
        product === "flight"
          ? await withinFlightLoadingDeadline(
              travelApi.searchFlights(plan.plan.payload, { signal: controller.signal, requestId }),
              () => {
                deadlineExpired = true;
                controller.abort("ui-deadline");
              },
            )
          : await travelApi.searchHotels(plan.plan.payload, { signal: controller.signal, requestId });
      if (!isCurrent()) return;
      const validationStartedAt = performance.now();
      const valid =
        product === "flight"
          ? (response.results as FlightResult[]).filter((x) =>
              validFlight(x, plan.plan!),
            )
          : (response.results as HotelResult[]).filter(validBookableHotel);
      const clientValidationMs = performance.now() - validationStartedAt;
      setResults(valid);
      resultsRef.current = valid;
      setStatus(valid.length ? "ready" : "empty");
      setMessage(response.warnings?.[0] || "");
      void recordRecentSearchBestEffort(buildRecentSearch(product, plan.plan.payload));
      if (__DEV__ && product === "flight") {
        console.info("[flight-search:client-processing]", {
          requestId,
          resultCount: response.results.length,
          clientValidationMs,
          statePreparationMs: performance.now() - validationStartedAt,
          clientElapsedMs: performance.now() - clientStartedAt,
        });
      }
    } catch (e) {
      if (!isLatest()) return;
      if (!deadlineExpired && (controller.signal.aborted || (e instanceof TravelApiError && e.code === "cancelled"))) return;
      const failureMessage =
        deadlineExpired ||
        (e instanceof TravelApiError && e.code === "timeout") ||
        (e instanceof Error && e.message === "flight_loading_deadline")
          ? "Flight search took too long. Please try again."
          : e instanceof Error ? e.message : "Search failed";
      // A refresh failure must not discard a still-usable result collection.
      setStatus(resultsRef.current.length ? "ready" : "error");
      setMessage(failureMessage);
    } finally {
      if (isLatest()) requestInFlight.current = false;
      if (stopEventLoopMonitor) {
        // Let an overdue interval run before clearing it so a blocking parse or
        // validation phase at request completion is included in max drift.
        await new Promise((resolve) => setTimeout(resolve, 0));
        console.info("[flight-search:event-loop]", { requestId, ...stopEventLoopMonitor() });
      }
    }
  }, [product, plan.plan?.key, retry, visualTest]);
  useEffect(() => {
    void load();
    return () => {
      searchSequence.current += 1;
      activeSearch.current?.abort("screen-cleanup");
    };
  }, [load]);
  useFocusEffect(useCallback(() => () => {
    searchSequence.current += 1;
    activeSearch.current?.abort("screen-blur");
  }, []));
  const edit = () => {
    activeSearch.current?.abort("edit-search");
    if (product === "flight") {
      router.push({ pathname: "/edit-flight-search", params: flightEditSearchParams(params) });
      return;
    }
    router.push({
      pathname: "/hotels",
      params: {
        destination: one(params.destination) || "",
        checkIn: one(params.checkIn) || "",
        checkOut: one(params.checkOut) || "",
        guests: one(params.guests) || "",
        rooms: one(params.rooms) || "",
      },
    });
  };
  const normalizeFlightPrice = useCallback((result: FlightResult) => currencyState
    ? convertAmount(result.price, result.currency, currencyState.resolution.resolvedCurrency, currencyState.rates)
    : result.price, [currencyState]);
  const flightPriceContext = useMemo(() => product === "flight" && currencyState
    ? resolveFlightPriceComparisonContext(results as FlightResult[], currencyState.resolution.resolvedCurrency, normalizeFlightPrice)
    : null, [currencyState, normalizeFlightPrice, product, results]);
  const sorted = useMemo(() => {
    if (product === "flight") {
      return filterAndSortFlights(
        results as FlightResult[],
        filters,
        sort,
        flightPriceContext?.valueForResult,
        normalizeFlightPrice,
      );
    }
    return [...results].sort((a, b) =>
        sort === "price"
          ? (a as HotelResult).totalPrice! - (b as HotelResult).totalPrice!
          : (b as HotelResult).valueScore - (a as HotelResult).valueScore,
      );
  }, [results, filters, sort, product, flightPriceContext, normalizeFlightPrice]);
  const flightHighlights = useMemo(() => product === "flight"
    ? deriveFlightResultHighlights(sorted as FlightResult[], normalizeFlightPrice)
    : new Map<string, FlightResultHighlight>(), [normalizeFlightPrice, product, sorted]);
  const flightOptions = useMemo(() => flightFilterOptions(results as FlightResult[], flightPriceContext), [flightPriceContext, results]);
  useEffect(() => {
    const nextCurrency = currencyState ? flightPriceContext?.identity ?? "unavailable" : null;
    if (nextCurrency && previousComparisonCurrency.current && previousComparisonCurrency.current !== nextCurrency) {
      setFilters((current) => current.price ? { ...current, price: null } : current);
    }
    if (nextCurrency) previousComparisonCurrency.current = nextCurrency;
  }, [currencyState, flightPriceContext?.identity]);
  const activeFilterCount = activeFlightFilterCount(filters, flightOptions);
  const flightState = product === "flight" ? resolveFlightResultsState({
    status,
    rawResultCount: results.length,
    displayedResultCount: sorted.length,
  }) : null;
  const retrySearch = useCallback(() => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setRetry((x) => x + 1);
  }, []);
  const openFlightFilters = (section: FlightFilterSectionName) => {
    setFilterSection(section);
    setFilterOpen(true);
  };
  const payload = plan.plan?.payload || {};
  const date = String(
    product === "flight"
      ? payload.departureDate
      : payload.checkIn || new Date().toISOString().slice(0, 10),
  );
  const flightDisplayPrices = useMemo(() => {
    if (product !== "flight" || !currencyState) return new Map<string, DisplayPrice>();
    return new Map((results as FlightResult[]).map((result) => [
      result.id,
      displayPrice(result.price, result.currency, currencyState.resolution.resolvedCurrency, currencyState.rates),
    ]));
  }, [currencyState, product, results]);
  const dateStripPriceByDate = useMemo(() => {
    if (product === "flight") {
      return buildPriceByDate((results as FlightResult[]).flatMap((result) => {
        const departureDate = calendarIsoFromTimestamp(result.departureTime);
        const displayed = flightDisplayPrices.get(result.id);
        return departureDate && displayed ? [{
          date: departureDate,
          amount: displayed.amount,
          formatted: displayed.formatted,
          accessibilityLabel: displayed.formatted,
        }] : [];
      }));
    }
    const lowest = (sorted as HotelResult[])[0]?.pricePerNight;
    return lowest == null ? {} : buildPriceByDate([{ date, amount: lowest }]);
  }, [date, flightDisplayPrices, product, results, sorted]);
  const dateStrip = (
    <DateStrip
            date={date}
            priceByDate={dateStripPriceByDate}
            flightResults={product === "flight"}
            onSelect={(v) =>
              router.setParams(
                product === "flight" ? { departureDate: v } : { checkIn: v },
              )
            }
          />
  );
  const filterRail = (
    <ScrollView
            horizontal
            style={s0.filterRail}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s0.filters}
          >
            {product === "flight" ? (
              <Pill
                label={flightSortQuickLabel(sort)}
                active={sort !== "best"}
                flightResultsChevron
                onPress={() => setSortOpen(true)}
              />
            ) : null}
            <Pill
              label={product === "flight" && activeFilterCount ? `Filter · ${activeFilterCount}` : "Filter"}
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
              ? ["Airlines", "Stops"]
              : ["Price", "Guest rating", "Property type"]
            ).map((x) => (
              <Pill
                key={x}
                label={x}
                active={product === "flight" && (
                  x === "Stops" ? filters.stops.length > 0 :
                  x === "Airlines" ? filters.airlines.length > 0 : false
                )}
                flightResultsChevron={product === "flight"}
                onPress={() => product === "flight" ? openFlightFilters(x.toLowerCase() as "stops" | "airlines") :
                  Alert.alert(
                    x,
                    "No additional values are available from this search response.",
                  )
                }
              />
            ))}
            {product === "hotel" ? (
              <Pill
                label={`Sort: ${sort === "price" ? "Price" : "Recommended"}`}
                active
                onPress={() => setSort((x) => (x === "best" ? "price" : "best"))}
              />
            ) : null}
          </ScrollView>
  );
  const resultContent = (
    <>
      {product === "hotel" && status === "loading" ? <Loading product={product} /> : null}
              {message && (!flightResults || status === "ready") ? (
                <Text accessibilityRole="alert" style={[s0.notice, flightResults && { backgroundColor: theme.surface, color: theme.textPrimary, borderColor: theme.border, borderWidth: 1 }]}>
                  {message}
                </Text>
              ) : null}
              {product === "hotel" && status === "empty" ? (
                <Empty
                  title="No properties found"
                  body="Try changing your dates or removing filters."
                  retry={() => setRetry((x) => x + 1)}
                  edit={edit}
                  flightResults={flightResults}
                />
              ) : null}
              {product === "hotel" && status === "error" ? (
                <Empty
                  title="Search could not be completed"
                  body={message || "Check your connection and try again."}
                  retry={() => setRetry((x) => x + 1)}
                  edit={edit}
                  flightResults={flightResults}
                />
              ) : null}
              {product === "flight" && flightState ? (
                <FlightResultsState
                  state={flightState}
                  onRetry={retrySearch}
                  onEditSearch={edit}
                  onClearFilters={() => setFilters(emptyFlightFilters())}
                  onAdjustFilters={() => openFlightFilters("all")}
                />
              ) : null}
              {status === "ready" && product === "flight" && !flightState && plan.plan ? (
                <PriceAlert product={product} plan={plan.plan} results={results as FlightResult[]} available={availability.priceAlerts} />
              ) : null}
              {status === "ready" && product === "hotel" ? (
                <View style={s0.found}>
                  <View style={s0.foundCopy}>
                    <Text style={s0.foundTitle}>
                      {sorted.length} properties found
                    </Text>
                    <Text style={s0.sub}>
                      Prices include taxes and fees when reported by the provider
                    </Text>
                  </View>
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
                </View>
              ) : null}
              {!flightState && sorted.map((x, i) =>
                product === "flight" ? (
                  <FlightCard key={x.id} result={x as FlightResult} displayPrice={flightDisplayPrices.get(x.id)} displayCurrencyContext={currencyState?.resolution} highlight={flightHighlights.get(x.id)} params={params} />
                ) : (
                  <HotelCard
                    key={x.id}
                    result={x as HotelResult}
                    rank={i}
                    params={params}
                  />
                ),
              )}
              {status === "ready" && product === "hotel" && availability.priceAlerts ? <PriceAlert product={product} /> : null}
    </>
  );
  return (
    <SafeAreaView style={[s0.safe, flightResults && { backgroundColor: theme.background }]} edges={["top"]}>
      {flightResults ? (
        <FlightResultsHeader
          route={`${String(payload.origin || "").toUpperCase()} ${payload.tripType === "one-way" ? "→" : "⇄"} ${String(payload.destination || "").toUpperCase()}`}
          dateRange={payload.tripType === "one-way"
            ? shortDate(String(payload.departureDate || ""))
            : `${shortDate(String(payload.departureDate || ""))} – ${shortDate(String(payload.returnDate || ""))}`}
          travelerCount={Number(payload.travelers)}
          tripTypeLabel={FLIGHT_TRIP_TYPE_LABELS[payload.tripType === "round-trip" ? "round-trip" : "one-way"]}
          cabinClass={String(payload.cabinClass || "economy")}
          onEdit={edit}
        />
      ) : (
        <>
          <TopBar />
          <View style={[s0.summary, narrowHeader && s0.summaryNarrow]}>
            <View style={s0.summaryCopy}>
              <Text style={s0.route}>{String(payload.destination || "")}</Text>
              <Text style={[s0.sub, s0.summaryMeta]}>
                {`${shortDate(String(payload.checkIn || ""))} – ${shortDate(String(payload.checkOut || ""))}  ·  ${payload.rooms || 1} Room, ${payload.guests || 2} Guests`}
              </Text>
            </View>
            <View style={narrowHeader && s0.editNarrow}>
              <Pill label="Edit search" icon="document" onPress={edit} />
            </View>
          </View>
        </>
      )}
      {product === "flight" ? (
        <ScrollView
          style={[s0.resultsScroll, { backgroundColor: theme.background }]}
          alwaysBounceVertical={false}
          bounces={false}
          overScrollMode="never"
          stickyHeaderIndices={[1]}
          contentContainerStyle={s0.flightResultsContent}
        >
          <View>{dateStrip}</View>
          <View style={[s0.stickyFilterSurface, { backgroundColor: theme.background }]}>
            {status === "ready" && !flightState ? (
              <Text
                accessibilityRole="header"
                style={[s0.flightResultCount, { color: theme.textPrimary }]}
              >
                {flightResultCountLabel(sorted.length)}
              </Text>
            ) : null}
            {status === "ready" && results.length > 0 ? filterRail : null}
          </View>
          <View style={[s0.body, s0.flightResultsBody]}>{resultContent}</View>
        </ScrollView>
      ) : (
        <>
          {dateStrip}
          {filterRail}
          <ScrollView alwaysBounceVertical={false} bounces={false} contentContainerStyle={s0.body} overScrollMode="never">{resultContent}</ScrollView>
        </>
      )}
      {product === "flight" ? (
        <>
          <FlightSortModal visible={sortOpen} sort={sort} onChange={setSort} onClose={() => setSortOpen(false)} />
          <FlightFilterSheet
            visible={filterOpen}
            section={filterSection}
            filters={filters}
            options={flightOptions}
            results={results as FlightResult[]}
            priceValue={flightPriceContext?.valueForResult}
            currency={flightPriceContext?.currency ?? currencyState?.resolution.resolvedCurrency ?? "USD"}
            priceFilteringReady={flightPriceContext != null}
            onChange={setFilters}
            onClose={() => setFilterOpen(false)}
          />
        </>
      ) : null}
      <BottomNav flightResults={flightResults} />
    </SafeAreaView>
  );
}

function FlightResultsHeader({
  route,
  dateRange,
  travelerCount,
  tripTypeLabel,
  cabinClass,
  onEdit,
}: {
  route: string;
  dateRange: string;
  travelerCount: number;
  tripTypeLabel: string;
  cabinClass: string;
  onEdit: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View
      accessibilityLabel="Flight search summary"
      style={[s0.flightHeader, { backgroundColor: theme.background }]}
    >
      <View accessibilityLabel="Flight route controls" style={s0.flightHeaderMainRow}>
        <View style={s0.flightHeaderSide}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [s0.flightHeaderBack, pressed && s0.flightHeaderControlPressed]}
          >
            <ArrowLeft size={25} strokeWidth={2} color={theme.icon} />
          </Pressable>
        </View>
        <View style={s0.flightHeaderRouteBlock}>
          <Text style={[s0.route, s0.flightHeaderRoute, { color: theme.textPrimary }]}>
            {route}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit search"
          onPress={onEdit}
          style={({ pressed }) => [
            s0.flightHeaderEdit,
            pressed && s0.flightHeaderControlPressed,
          ]}
        >
          <Text style={[s0.flightHeaderEditText, { color: theme.textPrimary }]}>Edit</Text>
        </Pressable>
      </View>
      <View style={s0.flightHeaderMetadataAlignmentRow}>
        <View style={s0.flightHeaderMetadataInset} />
        <ScrollView
          accessibilityLabel="Trip metadata row"
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s0.flightHeaderMetadataScroller}
          contentContainerStyle={s0.flightHeaderMetadataRow}
        >
          <Text numberOfLines={1} style={[s0.flightHeaderMetadataText, { color: theme.textSecondary }]}>{tripTypeLabel}</Text>
          <Text style={[s0.flightHeaderMetadataSeparator, { color: theme.textSecondary }]}>·</Text>
          <Text numberOfLines={1} style={[s0.flightHeaderMetadataText, { color: theme.textSecondary }]}>{dateRange}</Text>
          <Text style={[s0.flightHeaderMetadataSeparator, { color: theme.textSecondary }]}>·</Text>
          <Text numberOfLines={1} style={[s0.flightHeaderMetadataText, { color: theme.textSecondary }]}>
            {travelerCount} {travelerCount === 1 ? "Traveler" : "Travelers"}
          </Text>
          <Text style={[s0.flightHeaderMetadataSeparator, { color: theme.textSecondary }]}>·</Text>
          <Text numberOfLines={1} style={[s0.flightHeaderMetadataText, { color: theme.textSecondary }]}>
            {cabinClass.split("-").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ")}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}
function FlightSortModal({
  visible,
  sort,
  onChange,
  onClose,
}: {
  visible: boolean;
  sort: FlightSort;
  onChange: (sort: FlightSort) => void;
  onClose: () => void;
}) {
  const { theme } = useAppTheme();
  const inset = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <View style={s0.modalBackdrop}>
        <View style={[s0.sortSheet, { paddingBottom: Math.max(inset.bottom, 18), backgroundColor: theme.surface }]} accessibilityLabel="Sort flights">
          <View style={s0.sheetHead}>
            <Text accessibilityRole="header" style={[s0.foundTitle, { color: theme.textPrimary }]}>Sort flights</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close sort options" onPress={onClose} style={s0.closeButton}>
              <FlowIcon name="close" color={theme.icon} />
            </Pressable>
          </View>
          <View accessibilityRole="radiogroup" style={s0.sortOptions}>
            {flightSortOptions.map((option) => {
              const selected = sort === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => { onChange(option.value); onClose(); }}
                  style={({ pressed }) => [s0.sortOption, pressed && s0.sortOptionPressed]}
                >
                  <View style={[s0.radio, { borderColor: selected ? ui.blue : theme.border }]}>
                    {selected ? <View style={s0.radioDot} /> : null}
                  </View>
                  <View style={s0.sortOptionCopy}>
                    <Text style={[s0.sortOptionLabel, { color: theme.textPrimary }, selected && { color: ui.blue }]}>{option.label}</Text>
                    <Text style={[s0.sortOptionDescription, { color: theme.textSecondary }]}>{option.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FlightCard({ result, displayPrice: fare, displayCurrencyContext, highlight, params }: { result: FlightResult; displayPrice?: DisplayPrice; displayCurrencyContext?: DisplayCurrencyResolution; highlight?: FlightResultHighlight; params: Record<string, string | string[]> }) {
  const { theme } = useAppTheme();
  const { savedFlights, toggle } = useSavedFlights();
  const saved = savedFlights.has(result.id);
  const roundTrip = one(params.tripType) === "round-trip";
  const { outbound, returnLeg } = flightCardLegs(result, roundTrip);
  const baggageBenefit = summarizeBaggage(result.baggageInfo);
  const fareBenefit = summarizeFareRules(result.refundInfo);
  return (
    <View style={[s0.card, { backgroundColor: theme.surface, shadowColor: theme.dark ? "#000000" : "#18305B" }]}>
      <View style={s0.flightMain}>
        <View style={s0.flightIdentityLayout}>
          <View style={s0.airlineLogoColumn}>
            <AirlineLogo
              airlineName={result.airlineName}
              logoUrl={result.airlineLogo}
            />
          </View>
          <View style={s0.flightDetails}>
            <View style={s0.airlineHeader}>
              <Text accessibilityLabel={`Airline ${result.airlineName}`} style={[s0.airlineName, { color: theme.textPrimary }]} numberOfLines={2} ellipsizeMode="tail">
                {result.airlineName}
              </Text>
              {highlight ? (
                <View
                  accessible
                  accessibilityLabel={`${highlight} flight result`}
                  style={[s0.resultBadge, theme.dark && { backgroundColor: "#173568" }]}
                >
                  <Text style={[s0.resultBadgeText, theme.dark && { color: "#8FB5FF" }]}>{highlight}</Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={saved ? `Remove ${result.airlineName} flight from saved` : `Save ${result.airlineName} flight`}
                accessibilityState={{ selected: saved }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={(event) => { event.stopPropagation(); toggle(result, params); }}
                style={({ pressed }) => [s0.favoriteButton, pressed && s0.favoritePressed]}
              >
                <Heart
                  size={20}
                  strokeWidth={2}
                  fill={saved ? androidFavoriteColors.active : "transparent"}
                  color={saved ? androidFavoriteColors.active : theme.textSecondary}
                />
              </Pressable>
            </View>
            <View style={s0.journeyList}>
              <FlightJourneyRow label="OUTBOUND" leg={outbound} />
              {returnLeg ? <FlightJourneyRow label="RETURN" leg={returnLeg} /> : null}
            </View>
          </View>
        </View>
      </View>
      <View style={s0.benefits}>
        <View style={s0.benefitList}>
          {baggageBenefit ? (
            <View style={s0.benefitItem}>
              <Luggage size={15} strokeWidth={1.9} color={theme.icon} />
              <Text style={[s0.benefit, { color: theme.textSecondary }]} numberOfLines={1}>{baggageBenefit}</Text>
            </View>
          ) : null}
          {fareBenefit ? (
            <View style={s0.benefitItem}>
              <ShieldCheck size={15} strokeWidth={1.9} color={theme.icon} />
              <Text style={[s0.benefit, { color: theme.textSecondary }]} numberOfLines={1}>{fareBenefit}</Text>
            </View>
          ) : null}
        </View>
        <View style={[s0.actionColumn, s0.rightColumnContract]}>
          <Text accessibilityLabel={fare?.accessibilityLabel ?? "Price unavailable"} style={[s0.bigPrice, { color: theme.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {fare?.formatted ?? "—"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View details"
            style={s0.detailsButton}
            onPress={() =>
              router.push({
                pathname: "/flight-details",
                params: buildFlightDetailParams({ searchParams: params, result, fare, displayCurrencyContext }),
              })
            }
          >
            <Text style={s0.detailsButtonText} numberOfLines={1}>View details</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
function FlightJourneyRow({ label, leg }: { label: "OUTBOUND" | "RETURN"; leg: FlightCardLeg }) {
  const { theme } = useAppTheme();
  const stopLabel = leg.stops
    ? `${leg.stops} stop${leg.stops === 1 ? "" : "s"}`
    : "Nonstop";
  return (
    <View
      style={s0.journeyBlock}
      accessible
      accessibilityLabel={`${label.toLowerCase()}: ${clock(leg.departureTime)} ${leg.originAirport} to ${clock(leg.arrivalTime)} ${leg.destinationAirport}, ${leg.duration}, ${stopLabel}`}
    >
      <Text style={[s0.journeyLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={s0.journeyRow}>
        <View style={s0.timeTimelineRow}>
          <View style={s0.departureColumn}>
            <Text style={[s0.time, { color: theme.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{clock(leg.departureTime)}</Text>
          </View>
          <View style={s0.timelineTrack}>
            <View style={[s0.line, { backgroundColor: theme.textSecondary }]} />
            <PlaneTakeoff size={14} strokeWidth={2} color={ui.blue} />
            <View style={[s0.line, { backgroundColor: theme.textSecondary }]} />
          </View>
          <View style={[s0.arrivalColumn, s0.rightColumnContract]}>
            <Text style={[s0.time, { color: theme.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{clock(leg.arrivalTime)}</Text>
          </View>
        </View>
        <View style={s0.airportStopRow}>
          <View style={s0.departureColumn}>
            <Text style={[s0.sub, { color: theme.textSecondary }]} numberOfLines={1}>{leg.originAirport}</Text>
          </View>
          <View style={s0.timelineColumn}>
            <Text style={s0.nonstop} numberOfLines={1}>{leg.duration} · {stopLabel}</Text>
          </View>
          <View style={[s0.arrivalColumn, s0.rightColumnContract]}>
            <Text style={[s0.sub, { color: theme.textSecondary }]} numberOfLines={1}>{leg.destinationAirport}</Text>
          </View>
        </View>
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
  const canonical = useCanonicalSaved();
  const saved = canonical.items.some(item => item.type === "hotel" && ((item.payload as Record<string, unknown> | undefined)?.result as { id?: string } | undefined)?.id === result.id);
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
        <Pressable onPress={() => void canonical.toggleHotel(result, params)} style={s0.heart}>
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
  const { theme } = useAppTheme();
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
    <View pointerEvents="none" style={s0.loadingState}>
      <View style={s0.loadingMessage}>
        <ActivityIndicator color={ui.blue} />
        <Text
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          style={[s0.loadingText, product === "flight" && { color: theme.textPrimary }]}
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

function SkeletonLine({ style, flightResults = false }: { style?: object; flightResults?: boolean }) {
  const { theme } = useAppTheme();
  return <View style={[s0.skeletonLine, flightResults && { backgroundColor: theme.border }, style]} />;
}

function FlightLoadingSkeleton() {
  const { theme } = useAppTheme();
  const placeholder = { backgroundColor: theme.border };
  return (
    <View style={[s0.skeletonCard, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityElementsHidden>
      <View style={s0.skeletonTopRow}>
        <View style={[s0.skeletonBadge, placeholder]} />
        <View style={[s0.skeletonHeart, placeholder]} />
      </View>
      <View style={s0.skeletonIdentityRow}>
        <View style={[s0.skeletonLogo, placeholder]} />
        <SkeletonLine flightResults style={s0.skeletonName} />
      </View>
      <View style={s0.skeletonFlightRow}>
        <View style={s0.skeletonDeparture}>
          <SkeletonLine flightResults style={s0.skeletonTime} />
          <SkeletonLine flightResults style={s0.skeletonAirport} />
        </View>
        <View style={s0.skeletonRoute}>
          <SkeletonLine flightResults style={s0.skeletonDuration} />
          <SkeletonLine flightResults style={s0.skeletonRouteLine} />
          <SkeletonLine flightResults style={s0.skeletonStop} />
        </View>
        <View style={s0.skeletonArrival}>
          <SkeletonLine flightResults style={s0.skeletonTime} />
          <SkeletonLine flightResults style={s0.skeletonAirport} />
        </View>
        <View style={s0.skeletonPrice}>
          <SkeletonLine flightResults style={s0.skeletonPriceLine} />
          <SkeletonLine flightResults style={s0.skeletonPriceCaption} />
        </View>
      </View>
      <View style={[s0.skeletonBenefits, { borderTopColor: theme.border }]}>
        <View style={s0.skeletonBenefitLines}>
          <SkeletonLine flightResults style={s0.skeletonBenefitLine} />
          <SkeletonLine flightResults style={s0.skeletonBenefitLineShort} />
          <SkeletonLine flightResults style={s0.skeletonBenefitLine} />
        </View>
        <View style={[s0.skeletonButton, placeholder]} />
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
function PriceAlert({ product, plan, results, available = true }: { product: Product; plan?: SearchPlan; results?: FlightResult[]; available?: boolean }) {
  const { theme } = useAppTheme();
  const flight = product === "flight";
  const presentation = useMemo(() => flightAlertPresentation(product, Boolean(plan), results || []), [plan?.key, product, results]);
  const currency = presentation.currencies[0] || "";
  const [matchingAlert, setMatchingAlert] = useState<MobilePriceAlert | undefined>();
  const [loadingAlert, setLoadingAlert] = useState(flight);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetDraft, setTargetDraft] = useState("");
  const [targetError, setTargetError] = useState("");
  const isTracking = matchingAlert?.status === "ACTIVE";
  const unavailable = !presentation.enabled || (!available && !isTracking);
  const requireSignIn = useCallback(() => Alert.alert(
    "Sign in required",
    "Sign in to track prices for this route.",
    [{ text: "Sign in", onPress: () => router.push("/(tabs)/profile/sign-in") }, { text: "Cancel", style: "cancel" }],
  ), []);
  const reconcile = useCallback(async () => {
    if (!flight || !plan) return;
    setLoadingAlert(true);
    try {
      if (!await readSession().catch(() => null)) { setMatchingAlert(undefined); return; }
      const alerts = (await travelApi.priceAlerts()).alerts;
      setMatchingAlert(matchingFlightPriceAlert(alerts, plan));
    } catch (error) {
      if (error instanceof TravelApiError && error.status === 401) setMatchingAlert(undefined);
    } finally { setLoadingAlert(false); }
  }, [flight, plan?.key]);
  useFocusEffect(useCallback(() => { void reconcile(); }, [reconcile]));
  const handleToggle = async (next: boolean) => {
    if (pendingRef.current || loadingAlert || !plan) return;
    if (next) {
      if (unavailable) return;
      if (!await readSession().catch(() => null)) { requireSignIn(); return; }
      if (isTracking) return;
      if (!matchingAlert) { setTargetError(""); setTargetOpen(true); return; }
      pendingRef.current = true; setPending(true);
      try { setMatchingAlert((await travelApi.updatePriceAlertStatus(matchingAlert.id, "ACTIVE")).alert); }
      catch (error) {
        if (error instanceof TravelApiError && error.status === 401) requireSignIn();
        else Alert.alert("Unable to track prices", error instanceof TravelApiError ? error.message : "Please try again.");
      } finally { pendingRef.current = false; setPending(false); }
      return;
    }
    if (!isTracking || !matchingAlert) return;
    pendingRef.current = true; setPending(true);
    try { setMatchingAlert((await travelApi.updatePriceAlertStatus(matchingAlert.id, "PAUSED")).alert); }
    catch (error) {
      if (error instanceof TravelApiError && error.status === 401) requireSignIn();
      else Alert.alert("Unable to pause price tracking", error instanceof TravelApiError ? error.message : "Please try again.");
    } finally { pendingRef.current = false; setPending(false); }
  };
  const createAlert = async () => {
    if (pendingRef.current || !plan || !currency) return;
    const parsed = parseTargetPrice(targetDraft);
    if (parsed.error || parsed.value === undefined) { setTargetError(parsed.error || "Enter a target price."); return; }
    pendingRef.current = true; setPending(true); setTargetError("");
    try {
      const session = await readSession().catch(() => null);
      if (!session) { setTargetOpen(false); requireSignIn(); return; }
      const created = await travelApi.createPriceAlert(buildFlightPriceAlertPayload(plan, parsed.value, currency));
      setMatchingAlert(created.alert); setTargetOpen(false); setTargetDraft("");
    } catch (error) {
      if (error instanceof TravelApiError && error.status === 401) { setTargetOpen(false); requireSignIn(); }
      else if (error instanceof TravelApiError && error.status === 409) {
        await reconcile();
        setTargetError("An alert for this search already exists. Its current status has been refreshed.");
      } else setTargetError(error instanceof TravelApiError ? error.message : "Unable to create price alert. Try again.");
    } finally { pendingRef.current = false; setPending(false); }
  };
  if (flight) {
    return (
      <View
        accessibilityLabel="Flight price alert"
        style={[
          s0.flightAlert,
          { backgroundColor: theme.priceAlertSurface },
        ]}
      >
        <View style={[s0.flightAlertIcon, { backgroundColor: theme.surface, borderColor: theme.priceAlertBorder }]}>
          <Bell
            accessibilityElementsHidden
            accessible={false}
            color={theme.priceAlertAccent}
            size={20}
            strokeWidth={2.25}
            testID="flight-price-alert-bell"
          />
        </View>
        <View style={s0.flightAlertCopy}>
          <Text style={[s0.flightAlertTitle, { color: theme.textPrimary }]}>Track prices for this route</Text>
          <Text style={[s0.flightAlertSubtitle, { color: theme.textSecondary }]}>Get notified when prices drop.</Text>
        </View>
        <View style={s0.flightAlertSwitchTarget}>
          <Switch
            accessibilityLabel="Track prices"
            accessibilityRole="switch"
            accessibilityState={{ checked: isTracking, disabled: pending || loadingAlert || unavailable }}
            value={isTracking}
            disabled={pending || loadingAlert || unavailable}
            onValueChange={(next) => void handleToggle(next)}
            trackColor={{ false: theme.switchTrack, true: theme.switchTrackActive }}
            ios_backgroundColor={theme.switchTrack}
            thumbColor={theme.surface}
          />
        </View>
        <Modal visible={targetOpen} transparent animationType="slide" onRequestClose={() => !pending && setTargetOpen(false)} accessibilityViewIsModal>
          <KeyboardAvoidingView style={s0.alertModalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={[s0.alertSheet, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityLabel="Create flight price alert">
              <Text accessibilityRole="header" style={[s0.flightAlertTitle, { color: theme.textPrimary }]}>Track prices</Text>
              <Text style={[s0.flightAlertSubtitle, { color: theme.textSecondary }]}>Target price ({currency})</Text>
              <TextInput autoFocus accessibilityLabel={`Target price in ${currency}`} value={targetDraft} onChangeText={(value) => { setTargetDraft(value); setTargetError(""); }} keyboardType="decimal-pad" editable={!pending} style={[s0.alertInput, { color: theme.textPrimary, borderColor: theme.border }]} />
              {targetError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s0.alertError}>{targetError}</Text> : null}
              <Button label={pending ? "Creating…" : "Create alert"} onPress={() => void createAlert()} />
              <Button label="Cancel" outline onPress={() => setTargetOpen(false)} />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }
  return (
    <View style={s0.alert}>
      <View style={s0.alertCopy}>
        <Text style={s0.foundTitle}>Price alerts</Text>
        <Text style={s0.sub}>Track this search and get notified when prices drop.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Track prices"
        onPress={() => router.push("/price-alerts")}
        style={({ pressed }) => [s0.alertButton, pressed && s0.alertButtonPressed]}
      >
        <Bell accessibilityElementsHidden accessible={false} color={ui.blue} size={18} strokeWidth={2.25} />
        <Text style={s0.alertButtonText}>Track prices</Text>
      </Pressable>
    </View>
  );
}
export function BottomNav({ flightResults = false }: { flightResults?: boolean } = {}) {
  const { theme } = useAppTheme();
  const inset = useSafeAreaInsets();
  const items = [
    { icon: "compass", label: "Explore", accessibilityLabel: "Explore", route: "/(tabs)/explore" },
    { icon: "trip", label: "Trips", accessibilityLabel: "My Trips", route: "/(tabs)/trips" },
    { icon: "search", label: "Search", accessibilityLabel: "Search", route: "/flights" },
    { icon: "heart", label: "Saved", accessibilityLabel: "Saved", route: "/saved" },
    { icon: "person", label: "Profile", accessibilityLabel: "Profile", route: "/(tabs)/profile" },
  ] as const;
  return (
    <View style={[s0.nav, flightResults && { backgroundColor: theme.surface, borderTopColor: theme.border }, { paddingBottom: Math.max(inset.bottom, 8) }]}>
      {items.map(({ icon, label, accessibilityLabel, route }) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ selected: label === "Search" }}
          onPress={() => router.push(route)}
          style={({ pressed }) => [s0.navItem, pressed && s0.navItemPressed]}
        >
          <FlowIcon
            name={icon as never}
            color={label === "Search" ? ui.blue : flightResults ? theme.textSecondary : ui.muted}
          />
          <Text style={[s0.navText, flightResults && { color: theme.textSecondary }, label === "Search" && { color: ui.blue }]}>
            {label}
          </Text>
        </Pressable>
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
  flightHeader: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  flightHeaderMainRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  flightHeaderSide: { width: 52, flexShrink: 0 },
  flightHeaderBack: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  flightHeaderControlPressed: { opacity: 0.55 },
  flightHeaderRouteBlock: { flex: 1, minWidth: 0, alignItems: "center" },
  flightHeaderRoute: { minWidth: 0, textAlign: "center" },
  flightHeaderMetadataAlignmentRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },
  flightHeaderMetadataInset: { width: 52, flexShrink: 0 },
  flightHeaderMetadataScroller: { flex: 1, minWidth: 0 },
  flightHeaderMetadataRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    columnGap: 6,
  },
  flightHeaderMetadataText: { flexShrink: 0, fontSize: 12, lineHeight: 17 },
  flightHeaderMetadataSeparator: { flexShrink: 0, fontSize: 12, lineHeight: 17 },
  flightHeaderEdit: {
    width: 52,
    height: 44,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  flightHeaderEditText: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  filterRail: { height: 52, flexGrow: 0 },
  resultsScroll: { flex: 1 },
  flightResultsContent: { flexGrow: 1 },
  stickyFilterSurface: { backgroundColor: "white", zIndex: 1 },
  route: { fontSize: 20, lineHeight: 25, fontWeight: "900", color: ui.navy },
  sub: { fontSize: 12, color: ui.muted, lineHeight: 17 },
  filters: { paddingHorizontal: 14, paddingVertical: 7, gap: 8, alignItems: "center" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10, 24, 48, 0.42)" },
  sheet: { maxHeight: "82%", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, gap: 14, backgroundColor: "white" },
  sortSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 14, gap: 4, backgroundColor: "white" },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sheetScroll: { flexGrow: 0 },
  sheetContent: { gap: 22, paddingBottom: 4 },
  sortOptions: { paddingVertical: 2 },
  sortOption: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 2, paddingVertical: 8 },
  sortOptionPressed: { opacity: 0.62 },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: ui.blue },
  sortOptionCopy: { flex: 1, minWidth: 0, gap: 1 },
  sortOptionLabel: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  sortOptionDescription: { fontSize: 12, lineHeight: 17 },
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
  flightResultsBody: { paddingHorizontal: 14, gap: 8 },
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
  foundCopy: { flex: 1, minWidth: 0, gap: 2 },
  foundTitle: { fontSize: 16, fontWeight: "800", color: ui.navy },
  flightResultCount: { paddingHorizontal: 14, paddingTop: 10, fontSize: 16, lineHeight: 21, fontWeight: "800" },
  card: {
    width: "100%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 5,
    backgroundColor: "white",
    shadowColor: "#18305B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  airlineHeader: { minHeight: 20, flexDirection: "row", alignItems: "center", gap: 6 },
  favoriteButton: { width: 20, height: 20, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  favoritePressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  resultBadge: { height: 20, flexDirection: "row", alignItems: "center", paddingHorizontal: 7, borderRadius: 10, backgroundColor: "#EEF4FF" },
  resultBadgeText: { fontSize: 10, fontWeight: "800", color: ui.blue },
  resultBadgeTextGreen: { color: ui.green },
  flightMain: { width: "100%", alignItems: "stretch" },
  flightIdentityLayout: { width: "100%", minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  airlineLogoColumn: { width: 32, flexShrink: 0, alignItems: "center" },
  flightDetails: { flex: 1, minWidth: 0 },
  airlineName: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 18, color: ui.navy, fontWeight: "800" },
  journeyList: { marginTop: 3, gap: 4 },
  journeyBlock: { width: "100%", gap: 0 },
  journeyLabel: { fontSize: 9, lineHeight: 10, fontWeight: "800", letterSpacing: 0.7 },
  journeyRow: { width: "100%" },
  timeTimelineRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 6 },
  airportStopRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 6 },
  departureColumn: { flexBasis: 62, minWidth: 62, flexShrink: 0 },
  arrivalColumn: { flexBasis: 62, minWidth: 62, flexShrink: 0 },
  rightColumnContract: { alignItems: "flex-end" },
  time: { fontSize: 15, fontWeight: "900", color: ui.navy },
  timelineColumn: { flex: 1, minWidth: 46, alignItems: "center" },
  timelineTrack: { flex: 1, minWidth: 46, flexDirection: "row", alignItems: "center", gap: 2 },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: ui.muted,
  },
  nonstop: { fontSize: 11, color: ui.blue },
  bigPrice: { fontSize: 20, fontWeight: "900", color: ui.navy, textAlign: "right" },
  benefits: {
    paddingTop: 2,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  benefitList: { flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", gap: 5, alignSelf: "center" },
  actionColumn: { width: 112, maxWidth: "45%", flexShrink: 0, alignItems: "flex-end", gap: 3 },
  benefitItem: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 5 },
  benefit: { minWidth: 0, fontSize: 10.5, color: ui.muted, flex: 1 },
  detailsButton: { width: "100%", minHeight: 44, paddingHorizontal: 10, borderRadius: 9, backgroundColor: ui.blue, alignItems: "center", justifyContent: "center" },
  detailsButtonText: { color: "white", fontWeight: "800", fontSize: 12 },
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
    minHeight: 178,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 14,
    padding: 13,
    gap: 10,
    backgroundColor: "white",
  },
  skeletonTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skeletonIdentityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  skeletonBadge: { width: 92, height: 23, borderRadius: 12, backgroundColor: "#E7EBF1" },
  skeletonHeart: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#E7EBF1" },
  skeletonFlightRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  skeletonLogo: { width: 38, height: 38, borderRadius: 9, backgroundColor: "#E7EBF1" },
  skeletonDeparture: { flex: 1.15, minWidth: 0, gap: 5 },
  skeletonArrival: { flex: 0.9, minWidth: 0, gap: 5 },
  skeletonRoute: { flex: 1, minWidth: 38, maxWidth: 95, alignItems: "center", gap: 6 },
  skeletonPrice: { width: 52, flexShrink: 0, alignItems: "flex-end", gap: 6 },
  skeletonLine: { height: 7, borderRadius: 4, backgroundColor: "#E7EBF1" },
  skeletonName: { width: "54%" },
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
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  skeletonBenefitLines: { flex: 1, gap: 6 },
  skeletonBenefitLine: { width: "82%" },
  skeletonBenefitLineShort: { width: "64%" },
  skeletonButton: { width: 96, height: 44, borderRadius: 8, backgroundColor: "#E7EBF1" },
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
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 14,
    padding: 15,
    gap: 14,
    backgroundColor: "#FAFCFF",
  },
  alertCopy: { gap: 4 },
  flightAlert: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    overflow: "hidden",
  },
  flightAlertIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  flightAlertCopy: { flex: 1, minWidth: 0, gap: 2 },
  flightAlertTitle: { fontSize: 15, lineHeight: 19, fontWeight: "900" },
  flightAlertSubtitle: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
  flightAlertSwitchTarget: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  alertModalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.45)" },
  alertSheet: { padding: 20, gap: 12, borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  alertInput: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 18 },
  alertError: { color: "#A4262C" },
  alertButton: {
    width: "100%",
    minHeight: 44,
    borderWidth: 1,
    borderColor: ui.blue,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "white",
  },
  alertButtonPressed: { backgroundColor: "#EEF4FF" },
  alertButtonText: { color: ui.blue, fontSize: 14, fontWeight: "800" },
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
  navItem: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 3 },
  navItemPressed: { opacity: 0.72 },
  navText: { fontSize: 10, color: ui.muted, fontWeight: "700" },
});
