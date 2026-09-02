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
  Share,
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
  Armchair,
  ArrowLeft,
  Bell,
  ChevronDown,
  FileText,
  Luggage,
  MapPin,
  PlaneTakeoff,
  Share2,
  SlidersHorizontal,
  SquarePen,
} from "lucide-react-native";
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
  safeCanonicalHotelResult,
  validFlight,
} from "../flow/travelSearchModel";
import {
  acceptCanonicalResults,
  canonicalResultsWereSilentlyLost,
} from "../flow/canonicalResultAcceptance";
import { FlowIcon } from "../flow/FlowIcon";
import {
  Badge,
  Button,
  DateStrip,
  Empty,
  Pill,
  clock,
  money,
  s,
  ui,
} from "./SearchUi";
import { visualFlights, visualHotels } from "./visualFixtures";
import { useFeatureAvailability } from "../availability/FeatureAvailability";
import { flightEditSearchParams } from "../flow/flightSearchModel";
import { FlightEditSearchModal } from "./FlightEditSearchModal";
import { HotelEditSearchModal } from "./HotelEditSearchModal";
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
import { formatCabinClass, summarizeBaggage, summarizeFareRules } from "./flightCardSummaries";
import { useCanonicalSaved } from "../../storage/useCanonicalSaved";
import { AirlineLogo } from "./AirlineLogo";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { buildFlightDetailParams } from "./flightDetailNavigation";
import { withinFlightLoadingDeadline } from "./flightLoadingDeadline";
import { logFlightSearchCheckpoint, startFlightSearchEventLoopMonitor } from "./flightSearchDiagnostics";
import { flightProviderFarePresentation } from "./flightPriceBasis";
import { buildRecentSearch, recordRecentSearchBestEffort } from "../recent/recentSearch";
import {
  calendarIsoFromTimestamp,
  rememberVerifiedDateFares,
  verifiedDateFareContextKey,
  type DateStripPriceCandidate,
  type VerifiedDateFareMemory,
} from "./dateStripModel";
import { flightResultCountLabel } from "./flightResultCount";
import { flightCardLegs, type FlightCardLeg } from "./flightCardLegs";
import { flightOperatingCarrierPresentation } from "./flightOperatingCarrier";
import { deriveFlightResultHighlights, type FlightResultHighlight } from "./flightResultHighlights";
import { readSession, subscribeSession } from "../../storage/sessionStorage";
import {
  buildFlightPriceAlertPayload,
  flightAlertPresentation,
  matchingFlightPriceAlert,
  parseTargetPrice,
} from "../flow/flightPriceAlertModel";
import type { SearchPlan } from "../flow/travelSearchModel";
import { FlightResultsState } from "./FlightResultsState";
import { resolveFlightResultsState } from "./flightResultsStateModel";
import { signInHref } from "../auth/signInIntent";
import { normalizePreferredAirlineFilterValues } from "./preferredAirlineDefaults";
import { HotelFilterSheet, type HotelFilterSectionName } from "./HotelFilterSheet";
import { activeHotelFilterCount, buildHotelFilterOptions, emptyHotelFilters, filterHotels, type HotelFilters } from "./hotelFilters";
import { HotelCardAmenityList } from "./HotelCardAmenityList";
import { defaultHotelSort, sortHotelsForResults } from "./hotelSort";
import { HotelResultsQuickFilterSheet, type HotelResultsQuickFilterKind } from "./HotelResultsQuickFilterSheet";
import { hasHotelPrice } from "@/lib/hotels/hotelResultAvailability";

type Product = "flight" | "hotel";
type Status = "loading" | "ready" | "empty" | "error";
type FlightLoadingPhase = "searching" | "skeleton";
export const FLIGHT_LOADING_SKELETON_DELAY_MS = 1000;
const flightSupportText = {
  light: "#465675",
  dark: "#B8C3D8",
} as const;
const flightResultsLightCanvas = "#F5F7FB";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const sameStringArray = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);
const hotelStayNightCount = (checkIn?: string, checkOut?: string) => {
  const start = Date.parse(`${checkIn ?? ""}T00:00:00Z`);
  const end = Date.parse(`${checkOut ?? ""}T00:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(1, Math.round((end - start) / 86_400_000)) : 1;
};
export function ApprovedResultsScreen({ product }: { product: Product }) {
  const { theme } = useAppTheme();
  const { top: topSafeAreaInset } = useSafeAreaInsets();
  const flightResults = product === "flight";
  const flightCanvasColor = theme.dark ? theme.background : flightResultsLightCanvas;
  const { availability } = useFeatureAvailability();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const plan = buildSearchPlan(product, params);
  const [results, setResults] = useState<(FlightResult | HotelResult)[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [flightLoadingPhase, setFlightLoadingPhase] = useState<FlightLoadingPhase>("searching");
  const [flightLoadingIdentity, setFlightLoadingIdentity] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const searchSequence = useRef(0);
  const activeSearch = useRef<AbortController | null>(null);
  const requestInFlight = useRef(false);
  const resultsRef = useRef<(FlightResult | HotelResult)[]>([]);
  const [sort, setSort] = useState<FlightSort>("best");
  const [sortOpen, setSortOpen] = useState(false);
  const [filters, setFilters] = useState<FlightFilters>(emptyFlightFilters);
  const [filtersFlightSearchKey, setFiltersFlightSearchKey] = useState(() => flightResults ? plan.plan?.key : undefined);
  const [preferredAirlineCodes, setPreferredAirlineCodes] = useState<string[] | null>(null);
  const [preferredAirlineSessionRevision, setPreferredAirlineSessionRevision] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editSearchOpen, setEditSearchOpen] = useState(false);
  const [hotelEditSearchOpen, setHotelEditSearchOpen] = useState(false);
  const [hotelEditPresentation, setHotelEditPresentation] = useState(0);
  const [filterSection, setFilterSection] = useState<FlightFilterSectionName>("all");
  const [hotelFilters, setHotelFilters] = useState<HotelFilters>(emptyHotelFilters);
  const [hotelFilterOpen, setHotelFilterOpen] = useState(false);
  const [hotelFilterSection, setHotelFilterSection] = useState<HotelFilterSectionName>("all");
  const [hotelQuickFilter, setHotelQuickFilter] = useState<HotelResultsQuickFilterKind | null>(null);
  const windowDimensions = useWindowDimensions();
  const previousHotelSearchKey = useRef<string | undefined>(undefined);
  const [currencyState, setCurrencyState] = useState<{ resolution: DisplayCurrencyResolution; rates: ExchangeRates } | null>(null);
  const [verifiedDateFareMemory, setVerifiedDateFareMemory] = useState<VerifiedDateFareMemory>();
  const flightDateStripScrollY = useRef(new Animated.Value(0)).current;
  const [flightDateStripHeaderHeight, setFlightDateStripHeaderHeight] = useState(88);
  const currencyRatesRef = useRef<ExchangeRates | null>(null);
  const previousComparisonCurrency = useRef<string | null>(null);
  const previousFlightSearchKey = useRef<string | undefined>(undefined);
  const preferredAirlineDefaultAttemptedSearchKey = useRef<string | undefined>(undefined);
  const preferredAirlineFilterTouchedSearchKey = useRef<string | undefined>(undefined);
  const preferredAirlineSessionUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => subscribeSession(() => {
    setPreferredAirlineSessionRevision((revision) => revision + 1);
  }), []);
  useEffect(() => {
    if (!flightResults || !plan.plan?.key) return;
    if (previousFlightSearchKey.current && previousFlightSearchKey.current !== plan.plan.key) {
      setSort("best");
      setFilters(emptyFlightFilters());
      setSortOpen(false);
      setFilterOpen(false);
      setFiltersFlightSearchKey(plan.plan.key);
      preferredAirlineDefaultAttemptedSearchKey.current = undefined;
      preferredAirlineFilterTouchedSearchKey.current = undefined;
    }
    previousFlightSearchKey.current = plan.plan.key;
  }, [flightResults, plan.plan?.key]);
  useEffect(() => {
    if (flightResults || !plan.plan?.key) return;
    if (previousHotelSearchKey.current && previousHotelSearchKey.current !== plan.plan.key) {
      setHotelFilters(emptyHotelFilters());
      setHotelFilterOpen(false);
      setHotelQuickFilter(null);
    }
    previousHotelSearchKey.current = plan.plan.key;
  }, [flightResults, plan.plan?.key]);
  useEffect(() => {
    if (!flightResults) return;
    let active = true;

    void readSession().then((session) => {
      if (!active) return;
      const sessionUserId = session?.user.id ?? null;
      if (preferredAirlineSessionUserId.current !== sessionUserId) {
        preferredAirlineSessionUserId.current = sessionUserId;
        preferredAirlineDefaultAttemptedSearchKey.current = undefined;
      }
      if (!session) {
        setPreferredAirlineCodes([]);
        return;
      }
      void travelApi.travelPreferences().then((response) => {
        if (active) setPreferredAirlineCodes(
          Array.isArray(response.preferences?.preferredAirlines) ? response.preferences.preferredAirlines : [],
        );
      }).catch(() => {
        // Flight results keep today's behavior if travel preferences are unavailable.
        if (active) setPreferredAirlineCodes([]);
      });
    }).catch(() => {
      if (active) setPreferredAirlineCodes([]);
    });

    return () => { active = false; };
  }, [flightResults, preferredAirlineSessionRevision]);
  useEffect(() => {
    if (!flightResults || status !== "loading") return;
    const presentationIdentity = `${plan.plan?.key || "invalid"}:${retry}`;
    setFlightLoadingIdentity(presentationIdentity);
    setFlightLoadingPhase("searching");
    const skeletonTimer = setTimeout(() => {
      setFlightLoadingPhase("skeleton");
    }, FLIGHT_LOADING_SKELETON_DELAY_MS);
    return () => clearTimeout(skeletonTimer);
  }, [flightResults, plan.plan?.key, retry, status]);
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
    if (product === "flight") {
      logFlightSearchCheckpoint("flight-search:start", {
        requestId,
        origin: String(plan.plan.payload.origin || ""),
        destination: String(plan.plan.payload.destination || ""),
        tripType: String(plan.plan.payload.tripType || ""),
        platform: Platform.OS,
      });
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
      const hotelAcceptance =
        product === "hotel"
          ? acceptCanonicalResults(
              response.results as HotelResult[],
              safeCanonicalHotelResult,
            )
          : undefined;
      const valid = product === "flight"
        ? (response.results as FlightResult[]).filter((x) => validFlight(x, plan.plan!))
        : hotelAcceptance!.accepted;
      const clientValidationMs = performance.now() - validationStartedAt;
      if (product === "flight") {
        logFlightSearchCheckpoint("flight-search:validated", { requestId, resultCount: valid.length, elapsedMs: performance.now() - clientStartedAt, platform: Platform.OS });
        logFlightSearchCheckpoint("flight-search:derived-ready", { requestId, resultCount: valid.length, elapsedMs: performance.now() - clientStartedAt, platform: Platform.OS });
      }
      if (hotelAcceptance?.rejectedIds.length) {
        console.warn("[travel-search] canonical hotel results failed client safety checks", {
          requestId,
          canonicalCount: hotelAcceptance.canonicalCount,
          acceptedCount: hotelAcceptance.accepted.length,
          rejectedIds: hotelAcceptance.rejectedIds,
        });
      }
      if (hotelAcceptance && canonicalResultsWereSilentlyLost(hotelAcceptance)) {
        setResults([]);
        resultsRef.current = [];
        setStatus("error");
        setMessage("The canonical search returned inventory that this app could not render safely.");
        return;
      }
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
    if (product === "flight" && status === "ready") {
      logFlightSearchCheckpoint("flight-search:render-ready", { resultCount: results.length, platform: Platform.OS });
    }
  }, [product, results.length, status]);
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
    if (product === "flight") {
      setEditSearchOpen(true);
      return;
    }
    setHotelEditPresentation((presentation) => presentation + 1);
    setHotelEditSearchOpen(true);
  };
  const normalizeFlightPrice = useCallback((result: FlightResult) => currencyState
    ? convertAmount(result.price, result.currency, currencyState.resolution.resolvedCurrency, currencyState.rates)
    : result.price, [currencyState]);
  const flightPriceContext = useMemo(() => product === "flight" && currencyState
    ? resolveFlightPriceComparisonContext(results as FlightResult[], currencyState.resolution.resolvedCurrency, normalizeFlightPrice)
    : null, [currencyState, normalizeFlightPrice, product, results]);
  const hotelOptions = useMemo(() => buildHotelFilterOptions(
    product === "hotel" ? results as HotelResult[] : [],
    String(plan.plan?.payload.destination || ""),
    currencyState?.rates ?? {},
  ), [currencyState?.rates, plan.plan?.payload.destination, product, results]);
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
    return sortHotelsForResults(
      filterHotels(results as HotelResult[], hotelFilters, hotelOptions),
      defaultHotelSort,
      currencyState?.rates,
    );
  }, [results, filters, hotelFilters, hotelOptions, sort, product, flightPriceContext, normalizeFlightPrice, currencyState?.rates]);
  const flightHighlights = useMemo(() => product === "flight"
    ? deriveFlightResultHighlights(sorted as FlightResult[], normalizeFlightPrice)
    : new Map<string, FlightResultHighlight>(), [normalizeFlightPrice, product, sorted]);
  const flightOptions = useMemo(() => flightFilterOptions(results as FlightResult[], flightPriceContext), [flightPriceContext, results]);
  useEffect(() => {
    const searchKey = plan.plan?.key;
    if (
      !flightResults ||
      status !== "ready" ||
      !searchKey ||
      filtersFlightSearchKey !== searchKey ||
      preferredAirlineCodes === null ||
      flightOptions.airlines.length === 0 ||
      preferredAirlineFilterTouchedSearchKey.current === searchKey ||
      preferredAirlineDefaultAttemptedSearchKey.current === searchKey
    ) return;

    preferredAirlineDefaultAttemptedSearchKey.current = searchKey;
    if (filters.airlines.length > 0) return;
    const preferredAirlines = normalizePreferredAirlineFilterValues(
      preferredAirlineCodes,
      flightOptions.airlines,
    );
    if (preferredAirlines.length === 0) return;
    setFilters((current) => (
      preferredAirlineFilterTouchedSearchKey.current === searchKey || current.airlines.length > 0
        ? current
        : { ...current, airlines: preferredAirlines }
    ));
  }, [filters.airlines.length, filtersFlightSearchKey, flightOptions.airlines, flightResults, plan.plan?.key, preferredAirlineCodes, status]);
  useEffect(() => {
    const nextCurrency = currencyState ? flightPriceContext?.identity ?? "unavailable" : null;
    if (nextCurrency && previousComparisonCurrency.current && previousComparisonCurrency.current !== nextCurrency) {
      setFilters((current) => current.maximumPrice != null ? { ...current, maximumPrice: null } : current);
    }
    if (nextCurrency) previousComparisonCurrency.current = nextCurrency;
  }, [currencyState, flightPriceContext?.identity]);
  const activeFilterCount = activeFlightFilterCount(filters, flightOptions);
  const activeHotelFilters = activeHotelFilterCount(hotelFilters, hotelOptions);
  const flightState = product === "flight" ? resolveFlightResultsState({
    status,
    rawResultCount: results.length,
    displayedResultCount: sorted.length,
  }) : null;
  const terminalFlightState = flightState === "loading" ? null : flightState;
  const retrySearch = useCallback(() => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setRetry((x) => x + 1);
  }, []);
  const openFlightFilters = (section: FlightFilterSectionName) => {
    setFilterSection(section);
    setFilterOpen(true);
  };
  const openHotelFilters = (section: HotelFilterSectionName) => {
    setHotelFilterSection(section);
    setHotelFilterOpen(true);
  };
  const openHotelQuickFilter = (kind: HotelResultsQuickFilterKind) => setHotelQuickFilter(kind);
  const closeHotelQuickFilter = () => setHotelQuickFilter(null);
  const handleFlightFiltersChange = useCallback((next: FlightFilters) => {
    const searchKey = plan.plan?.key;
    if (searchKey && !sameStringArray(filters.airlines, next.airlines)) {
      preferredAirlineFilterTouchedSearchKey.current = searchKey;
      preferredAirlineDefaultAttemptedSearchKey.current = searchKey;
    }
    setFilters(next);
  }, [filters.airlines, plan.plan?.key]);
  const clearFlightFilters = useCallback(() => {
    const searchKey = plan.plan?.key;
    if (searchKey) {
      preferredAirlineFilterTouchedSearchKey.current = searchKey;
      preferredAirlineDefaultAttemptedSearchKey.current = searchKey;
    }
    setFilters(emptyFlightFilters());
  }, [plan.plan?.key]);
  const payload = plan.plan?.payload || {};
  const currentFlightLoadingIdentity = `${plan.plan?.key || "invalid"}:${retry}`;
  const visibleFlightLoadingPhase = flightLoadingIdentity === currentFlightLoadingIdentity
    ? flightLoadingPhase
    : "searching";
  const flightDate = String(payload.departureDate);
  const flightDisplayPrices = useMemo(() => {
    if (product !== "flight" || !currencyState) return new Map<string, DisplayPrice>();
    return new Map((results as FlightResult[]).map((result) => [
      result.id,
      displayPrice(result.price, result.currency, currencyState.resolution.resolvedCurrency, currencyState.rates),
    ]));
  }, [currencyState, product, results]);
  const verifiedFareContextKey = useMemo(() => {
    if (product !== "flight" || !plan.plan || !currencyState) return undefined;
    return verifiedDateFareContextKey(plan.plan.payload, currencyState.resolution.resolvedCurrency);
  }, [currencyState, plan.plan, product]);
  const currentVerifiedDateFares = useMemo<DateStripPriceCandidate[]>(() => {
    if (product !== "flight" || status !== "ready" || !results.length || !currencyState) return [];
    return (results as FlightResult[]).flatMap((result) => {
      const departureDate = calendarIsoFromTimestamp(result.departureTime);
      const displayed = flightDisplayPrices.get(result.id);
      return departureDate === flightDate && displayed && Number.isFinite(displayed.amount) ? [{
        date: departureDate,
        amount: displayed.amount,
        formatted: displayed.formatted,
        accessibilityLabel: displayed.formatted,
      }] : [];
    });
  }, [currencyState, flightDate, flightDisplayPrices, product, results, status]);
  useEffect(() => {
    if (!verifiedFareContextKey) {
      setVerifiedDateFareMemory(undefined);
      return;
    }
    setVerifiedDateFareMemory((memory) => rememberVerifiedDateFares(
      memory,
      verifiedFareContextKey,
      currentVerifiedDateFares,
    ));
  }, [currentVerifiedDateFares, verifiedFareContextKey]);
  const flightDateStripPriceByDate = useMemo(() => (
    verifiedFareContextKey && verifiedDateFareMemory?.contextKey === verifiedFareContextKey
      ? verifiedDateFareMemory.priceByDate
      : {}
  ), [verifiedDateFareMemory, verifiedFareContextKey]);
  const flightDateStrip = (
    <DateStrip
            date={flightDate}
            priceByDate={flightDateStripPriceByDate}
            flightResults
            nearbyIntelligence={status === "ready" && (payload.tripType === "one-way" || payload.tripType === "round-trip")}
            displayCurrency={currencyState?.resolution.resolvedCurrency}
            onSelect={(v) => router.setParams({ departureDate: v })}
          />
  );
  const flightDateStripOpacity = flightDateStripScrollY.interpolate({
    inputRange: [0, flightDateStripHeaderHeight],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const animatedFlightDateStrip = (
    <Animated.View
      onLayout={({ nativeEvent }) => {
        const measuredHeight = nativeEvent.layout.height;
        if (measuredHeight > 0 && measuredHeight !== flightDateStripHeaderHeight) {
          setFlightDateStripHeaderHeight(measuredHeight);
        }
      }}
      style={{ opacity: flightDateStripOpacity }}
    >
      {flightDateStrip}
    </Animated.View>
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
            {product === "flight" ? <Pill
              label={activeFilterCount ? `Filter · ${activeFilterCount}` : "Filter"}
              active={product === "flight" ? activeFilterCount > 0 : activeHotelFilters > 0}
              flightResultsIcon="filters"
              onPress={() => openFlightFilters("all")}
            /> : <>
              <HotelResultsShortcut label="Filter" count={activeHotelFilters || undefined} icon onPress={() => openHotelFilters("all")} />
              {hotelOptions.price ? <HotelResultsShortcut label="Price" count={((hotelFilters.minimumPrice !== null && hotelFilters.minimumPrice > hotelOptions.price.minimum) || (hotelFilters.maximumPrice !== null && hotelFilters.maximumPrice < hotelOptions.price.maximum)) ? 1 : undefined} expanded={hotelQuickFilter === "price"} onPress={() => openHotelQuickFilter("price")} /> : null}
              <HotelResultsShortcut label="Stars" count={hotelFilters.starRatings.length || undefined} expanded={hotelQuickFilter === "stars"} onPress={() => openHotelQuickFilter("stars")} />
              <HotelResultsShortcut label="Amenities" count={hotelFilters.facilities.length || undefined} expanded={hotelQuickFilter === "amenities"} onPress={() => openHotelQuickFilter("amenities")} />
            </>}
            {(product === "flight"
              ? ["Airlines", "Stops"]
              : []
            ).map((x) => (
              <Pill
                key={x}
                label={x}
                active={product === "flight" && (
                  x === "Stops" ? filters.maxStops != null :
                  x === "Airlines" ? filters.airlines.length > 0 : false
                )}
                flightResultsChevron={product === "flight"}
                onPress={() => openFlightFilters(x.toLowerCase() as "stops" | "airlines")}
              />
            ))}
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
              {status === "ready" && product === "hotel" && sorted.length > 0 ? (
                <Text
                  accessibilityRole="header"
                  style={[s0.hotelResultCount, { color: theme.textPrimary }]}
                >
                  {sorted.length} properties found
                </Text>
              ) : null}
              {status === "ready" && product === "hotel" && results.length > 0 && sorted.length === 0 ? (
                <View style={s0.hotelFilteredEmpty}><Text accessibilityRole="header" style={[s0.foundTitle,{color:theme.textPrimary}]}>No stays match these filters.</Text><Pressable accessibilityRole="button" onPress={()=>setHotelFilters(emptyHotelFilters())}><Text style={s0.hotelClearFilters}>Clear filters</Text></Pressable></View>
              ) : null}
              {!flightState && product === "hotel" && sorted.map((x, i) =>
                (
                  <HotelCard
                    key={x.id}
                    result={x as HotelResult}
                    showCheapestBadge={i === 0 && hasHotelPrice(x as HotelResult)}
                    params={params}
                  />
                ),
              )}
              {status === "ready" && product === "hotel" && availability.priceAlerts ? <PriceAlert product={product} /> : null}
    </>
  );
  return (
    <SafeAreaView style={[s0.safe, { backgroundColor: flightResults ? flightCanvasColor : theme.background }]} edges={["top"]}>
      {flightResults ? (
        <FlightResultsHeader
          route={`${String(payload.origin || "").toUpperCase()} ${payload.tripType === "one-way" ? "→" : "⇄"} ${String(payload.destination || "").toUpperCase()}`}
          onEdit={edit}
          backgroundColor={flightCanvasColor}
        />
      ) : (
        <HotelResultsHeader
          destination={String(payload.destination || "")}
          onEdit={edit}
        />
      )}
      {product === "flight" ? (
        <Animated.SectionList
          style={[s0.resultsScroll, { backgroundColor: flightCanvasColor }]}
          sections={[{ data: !flightState ? sorted as FlightResult[] : [] }]}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={status === "loading" ? (
            <View style={[s0.body, s0.flightResultsBody]}>
              <FlightLoadingExperience
                phase={visibleFlightLoadingPhase}
                origin={String(payload.origin || "").toUpperCase()}
                destination={String(payload.destination || "").toUpperCase()}
                roundTrip={payload.tripType === "round-trip"}
              />
            </View>
          ) : animatedFlightDateStrip}
          renderSectionHeader={() => status === "loading" ? null : (
            <View style={[s0.flightFilterSectionHeader, { backgroundColor: flightCanvasColor }]}>
              {filterRail}
            </View>
          )}
          stickySectionHeadersEnabled
          renderItem={({ item, index }) => (
            <>
              {index === 0 && status === "ready" && !flightState && plan.plan ? (
                <View style={s0.flightPriceAlertItem}>
                  <PriceAlert product={product} plan={plan.plan} results={results as FlightResult[]} available={availability.priceAlerts} />
                </View>
              ) : null}
              {index === 0 && status === "ready" && !flightState ? (
                <Text accessibilityRole="header" style={[s0.flightResultCount, { color: theme.textPrimary }]}>
                  {flightResultCountLabel(sorted.length)}
                </Text>
              ) : null}
              <View style={s0.flightCardItem}>
                <FlightCard
                  result={item}
                  displayPrice={flightDisplayPrices.get(item.id)}
                  displayCurrencyContext={currencyState?.resolution}
                  highlight={flightHighlights.get(item.id)}
                  params={params}
                  logInitialMount={index === 0}
                />
              </View>
            </>
          )}
          ListEmptyComponent={null}
          ListFooterComponent={terminalFlightState ? (
            <View style={[s0.body, s0.flightResultsBody]}>
              <FlightResultsState
                state={terminalFlightState}
                onRetry={retrySearch}
                onEditSearch={edit}
                onClearFilters={clearFlightFilters}
                onAdjustFilters={() => openFlightFilters("all")}
              />
            </View>
          ) : !flightState && sorted.length ? <View style={[s0.body, s0.flightResultsBody]}>{resultContent}</View> : null}
          alwaysBounceVertical={false}
          bounces={false}
          overScrollMode="never"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: flightDateStripScrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          contentContainerStyle={s0.flightResultsContent}
          initialNumToRender={6}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          windowSize={7}
        />
      ) : (
        <>
          {filterRail}
          <ScrollView alwaysBounceVertical={false} bounces={false} contentContainerStyle={[s0.body, s0.hotelResultsContent]} overScrollMode="never">{resultContent}</ScrollView>
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
            onChange={handleFlightFiltersChange}
            onClose={() => setFilterOpen(false)}
          />
        </>
      ) : (
        <>
          <HotelFilterSheet visible={hotelFilterOpen} section={hotelFilterSection} filters={hotelFilters} options={hotelOptions} displayCurrency={currencyState?.resolution.resolvedCurrency ?? "USD"} rates={currencyState?.rates ?? {}} stayNights={hotelStayNightCount(one(params.checkIn),one(params.checkOut))} totalCount={results.length} matchingCount={sorted.length} onChange={setHotelFilters} onClose={()=>setHotelFilterOpen(false)}/>
          {hotelQuickFilter ? <HotelResultsQuickFilterSheet kind={hotelQuickFilter} filters={hotelFilters} options={hotelOptions} displayCurrency={currencyState?.resolution.resolvedCurrency ?? "USD"} rates={currencyState?.rates ?? {}} stayNights={hotelStayNightCount(one(params.checkIn),one(params.checkOut))} onChange={setHotelFilters} onClose={closeHotelQuickFilter} /> : null}
        </>
      )}
      {!flightResults ? (
        <HotelEditSearchModal
          key={hotelEditPresentation}
          visible={hotelEditSearchOpen}
          params={params}
          topInset={topSafeAreaInset}
          onClose={() => setHotelEditSearchOpen(false)}
        />
      ) : null}
      {flightResults ? (
        <FlightEditSearchModal
          visible={editSearchOpen}
          params={flightEditSearchParams(params)}
          onClose={() => setEditSearchOpen(false)}
        />
      ) : null}
      <BottomNav flightResults={flightResults} />
    </SafeAreaView>
  );
}

function FlightResultsHeader({
  route,
  onEdit,
  backgroundColor,
}: {
  route: string;
  onEdit: () => void;
  backgroundColor: string;
}) {
  const { theme } = useAppTheme();
  return (
    <View
      accessibilityLabel="Flight search summary"
      style={[s0.flightHeader, { backgroundColor }]}
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
        <View
          style={[
            s0.flightRouteSummaryCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.dark ? theme.border : "#D8E1EC",
            },
          ]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={[s0.flightRouteSummaryText, { color: theme.textPrimary }]}
          >
            {route}
          </Text>
        </View>
        <View style={s0.flightHeaderSide}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit search"
            onPress={onEdit}
            style={({ pressed }) => [
              s0.flightRouteSummaryEdit,
              pressed && s0.flightHeaderControlPressed,
            ]}
          >
            <SquarePen
              accessible={false}
              accessibilityElementsHidden
              size={18}
              strokeWidth={2.1}
              color={theme.icon}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
function HotelResultsHeader({
  destination,
  onEdit,
}: {
  destination: string;
  onEdit: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View
      accessibilityLabel="Hotel search summary"
      style={[s0.flightHeader, s0.hotelHeader, { backgroundColor: theme.background }]}
    >
      <View style={s0.flightHeaderMainRow}>
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
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[s0.route, s0.flightHeaderRoute, { color: theme.textPrimary }]}
          >
            {destination}
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

const HotelResultsShortcut = ({ label, icon = false, count, expanded = false, onPress }: {
  label: string; icon?: boolean; count?: number; expanded?: boolean; onPress: () => void;
}) => {
  const { theme } = useAppTheme();
  const accessibilityLabel = icon && count ? `Filter, ${count} active filters` : label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ pressed }) => [
        s0.hotelShortcut,
        { borderColor: theme.border, backgroundColor: theme.surface },
        pressed && s0.hotelShortcutPressed,
      ]}
    >
      {icon ? <SlidersHorizontal size={15} color={theme.icon} /> : null}
      <Text style={[s0.hotelShortcutLabel, { color: theme.textPrimary }]}>{label}</Text>
      {count ? <View style={s0.hotelShortcutCount}><Text style={s0.hotelShortcutCountText}>{count}</Text></View> : null}
      {!icon ? <ChevronDown size={14} color={theme.icon} style={expanded ? { transform: [{ rotate: "180deg" }] } : undefined} /> : null}
    </Pressable>
  );
};

function FlightCard({ result, displayPrice: fare, displayCurrencyContext, highlight, params, logInitialMount }: { result: FlightResult; displayPrice?: DisplayPrice; displayCurrencyContext?: DisplayCurrencyResolution; highlight?: FlightResultHighlight; params: Record<string, string | string[]>; logInitialMount: boolean }) {
  const { theme } = useAppTheme();
  const supportTextColor = theme.dark ? flightSupportText.dark : flightSupportText.light;
  useEffect(() => {
    if (logInitialMount) {
      logFlightSearchCheckpoint("flight-search:initial-card-mounted", { platform: Platform.OS });
    }
  }, [logInitialMount]);
  const roundTrip = one(params.tripType) === "round-trip";
  const { outbound, returnLeg } = flightCardLegs(result, roundTrip);
  const operatingCarrierPresentation = flightOperatingCarrierPresentation(result);
  const flightNumber = result.flightNumber?.trim();
  const highlightLabel = highlight === "Best" ? "Best value" : highlight;
  const highlightUsesGreen = highlight === "Best" || highlight === "Cheapest";
  const highlightBackgroundColor = highlightUsesGreen
    ? theme.dark ? "#153D2A" : "#E3F6EA"
    : theme.dark ? "#173568" : "#EEF4FF";
  const highlightTextColor = highlightUsesGreen
    ? theme.dark ? "#8BE0B0" : "#157347"
    : theme.dark ? "#8FB5FF" : ui.blue;
  const baggageSummary = summarizeBaggage(result.baggageInfo) ?? "Review policy";
  const cabinSummary = formatCabinClass(result.cabinClass);
  const fareRulesSummary = summarizeFareRules(result.refundInfo) ?? "Review before booking";
  const baggageAccessibility = result.baggageInfo?.trim() || baggageSummary;
  const fareRulesAccessibility = result.refundInfo?.trim() || fareRulesSummary;
  const providerFare = flightProviderFarePresentation(fare);
  const fareAccessibility = `${fare?.accessibilityLabel ?? "price unavailable"}${fare?.converted === true ? ", estimated price" : ""}${providerFare ? `, provider price ${providerFare.accessibilityLabel}` : ""}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${result.airlineName}${flightNumber ? `, ${flightNumber}` : ""}${operatingCarrierPresentation ? `, ${operatingCarrierPresentation.accessibilityText}` : ""} flight, ${result.originAirport} to ${result.destinationAirport}, ${fareAccessibility}`}
      accessibilityHint="Opens flight details"
      onPress={() =>
        router.push({
          pathname: "/flight-details",
          params: buildFlightDetailParams({ searchParams: params, result, fare, displayCurrencyContext }),
        })
      }
      style={({ pressed }) => [
        s0.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.dark ? theme.border : "#D8E1EC",
          shadowColor: theme.dark ? "#000000" : "#18305B",
        },
        pressed && s0.cardPressed,
      ]}
    >
      <View style={s0.flightMain}>
        <View style={s0.flightIdentityLayout}>
          <View style={s0.airlineLogoColumn}>
            <AirlineLogo
              airlineName={result.airlineName}
              logoUrl={result.airlineLogo}
              variant="result-card"
              allowRemoteSvg={process.env.EXPO_PUBLIC_DISABLE_REMOTE_AIRLINE_SVG !== "1"}
            />
          </View>
          <View style={s0.flightDetails}>
            <View style={s0.airlineHeader}>
              <View
                style={s0.airlineCopy}
                accessibilityLabel={`${result.airlineName}${flightNumber ? `, ${flightNumber}` : ""}${operatingCarrierPresentation ? `, ${operatingCarrierPresentation.accessibilityText}` : ""}`}
              >
                <Text style={[s0.airlineName, { color: theme.textPrimary }]} numberOfLines={2} ellipsizeMode="tail">
                  {result.airlineName}
                </Text>
                {flightNumber ? (
                  <Text style={[s0.flightNumber, { color: supportTextColor }]} numberOfLines={1} ellipsizeMode="tail">
                    {flightNumber}
                  </Text>
                ) : null}
                {operatingCarrierPresentation ? (
                  <Text style={[s0.operatingCarrierText, { color: supportTextColor }]} numberOfLines={1} ellipsizeMode="tail">
                    {operatingCarrierPresentation.text}
                  </Text>
                ) : null}
              </View>
              {highlight ? (
                <View style={s0.identityActions}>
                  <View
                    accessible
                    accessibilityLabel={`${highlightLabel} flight result`}
                    style={[s0.resultBadge, { backgroundColor: highlightBackgroundColor }]}
                  >
                    <Text numberOfLines={1} style={[s0.resultBadgeText, { color: highlightTextColor }]}>{highlightLabel}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View style={s0.journeyList}>
          <FlightJourneyRow label="OUTBOUND" leg={outbound} />
          {returnLeg ? <FlightJourneyRow label="RETURN" leg={returnLeg} /> : null}
        </View>
      </View>
      <View style={s0.fareRow}>
        <View style={s0.fareCopy}>
          <Text accessible={false} style={[s0.bigPrice, { color: theme.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {fare?.formatted ?? "—"}
          </Text>
          {fare?.converted === true ? (
            <Text accessible={false} style={[s0.estimatedPrice, { color: supportTextColor }]}>ESTIMATED PRICE</Text>
          ) : null}
          {providerFare ? (
            <Text accessible={false} style={[s0.providerPrice, { color: supportTextColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              Provider price: {providerFare.formatted}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={[s0.metadataDivider, { backgroundColor: theme.border }]} />
      <View style={s0.metadataFooterContainer}>
        <View
          accessible
          accessibilityLabel={`Baggage: ${baggageAccessibility}. Cabin: ${cabinSummary}. Fare rules: ${fareRulesAccessibility}.`}
          style={s0.metadataRow}
        >
          <View accessible={false} style={s0.metadataItem}>
            <Luggage accessible={false} size={13} strokeWidth={2} color={supportTextColor} />
            <Text accessible={false} numberOfLines={1} ellipsizeMode="tail" style={[s0.metadataText, { color: supportTextColor }]}>
              {baggageSummary}
            </Text>
          </View>
          <View accessible={false} style={s0.metadataItem}>
            <Armchair accessible={false} size={13} strokeWidth={2} color={supportTextColor} />
            <Text accessible={false} numberOfLines={1} ellipsizeMode="tail" style={[s0.metadataText, { color: supportTextColor }]}>
              {cabinSummary}
            </Text>
          </View>
          <View accessible={false} style={s0.metadataItem}>
            <FileText accessible={false} size={13} strokeWidth={2} color={supportTextColor} />
            <Text accessible={false} numberOfLines={1} ellipsizeMode="tail" style={[s0.metadataText, { color: supportTextColor }]}>
              Fare rules
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
function FlightJourneyRow({ label, leg }: { label: "OUTBOUND" | "RETURN"; leg: FlightCardLeg }) {
  const { theme } = useAppTheme();
  const supportTextColor = theme.dark ? flightSupportText.dark : flightSupportText.light;
  const stopLabel = leg.stops
    ? `${leg.stops} stop${leg.stops === 1 ? "" : "s"}`
    : "Nonstop";
  return (
    <View
      style={s0.journeyBlock}
      accessible
      accessibilityLabel={`${label.toLowerCase()}: ${clock(leg.departureTime)} ${leg.originAirport} to ${clock(leg.arrivalTime)} ${leg.destinationAirport}, ${leg.duration}, ${stopLabel}`}
    >
      <Text style={[s0.journeyLabel, { color: theme.dark ? "#8FB5FF" : ui.blue }]}>{label}</Text>
      <View style={s0.journeyPrimaryRow}>
        <View style={s0.departureColumn}>
          <Text style={[s0.time, { color: theme.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{clock(leg.departureTime)}</Text>
        </View>
        <View style={s0.timelineColumn} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={[s0.journeyDuration, { color: theme.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{leg.duration}</Text>
        </View>
        <View style={[s0.arrivalColumn, s0.rightColumnContract]}>
          <Text style={[s0.time, { color: theme.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{clock(leg.arrivalTime)}</Text>
        </View>
      </View>
      <View style={s0.journeyRouteRow}>
        <View style={s0.departureColumn}>
          <Text style={[s0.airportCode, { color: theme.textPrimary }]} numberOfLines={1}>{leg.originAirport}</Text>
        </View>
        <View style={s0.timelineColumn} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={s0.routeTrack}>
            <View style={[s0.routeDot, { backgroundColor: theme.textSecondary }]} />
            <View style={[s0.line, { backgroundColor: theme.border }]} />
            <PlaneTakeoff accessible={false} size={14} strokeWidth={2} color={theme.dark ? "#8FB5FF" : ui.blue} />
            <View style={[s0.line, { backgroundColor: theme.border }]} />
            <View style={[s0.routeDot, { backgroundColor: theme.textSecondary }]} />
          </View>
        </View>
        <View style={[s0.arrivalColumn, s0.rightColumnContract]}>
          <Text style={[s0.airportCode, { color: theme.textPrimary }]} numberOfLines={1}>{leg.destinationAirport}</Text>
        </View>
      </View>
      <View style={s0.journeyStopRow}>
        <View style={s0.departureColumn} />
        <View style={s0.timelineColumn} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={[s0.stopLabel, { color: supportTextColor }]} numberOfLines={1}>{stopLabel}</Text>
        </View>
        <View style={s0.arrivalColumn} />
      </View>
    </View>
  );
}
function HotelCard({
  result,
  showCheapestBadge,
  params,
}: {
  result: HotelResult;
  showCheapestBadge: boolean;
  params: Record<string, string | string[]>;
}) {
  const canonical = useCanonicalSaved();
  const saved = canonical.items.some(item => item.type === "hotel" && ((item.payload as Record<string, unknown> | undefined)?.result as { id?: string } | undefined)?.id === result.id);
  const compact = useWindowDimensions().width < 430;
  const score = result.reviewScore == null
    ? null
    : result.reviewScore * (10 / (result.reviewScale || 10));
  const classificationStars = result.classificationStars || Math.round(result.rating);
  const shareHotel = () => {
    const message = `${result.name} — ${result.location} — ${money(result.currency, result.pricePerNight)}/night`;
    void Share.share({ message }).catch(() => undefined);
  };
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
      </View>
      <View style={[s0.hotelCopy, compact && s0.hotelCopyCompact]}>
        <View style={s0.hotelTitleRow}>
          <Text numberOfLines={2} style={s0.hotelName}>{result.name}</Text>
          <View style={s0.hotelActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={saved ? `Remove ${result.name} from saved` : `Save ${result.name}`}
              accessibilityState={{ selected: saved }}
              onPress={() => void canonical.toggleHotel(result, params)}
              style={s0.hotelAction}
            >
              <Heart accessible={false} size={20} color={ui.blue} fill={saved ? ui.blue : "none"} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Share ${result.name}`}
              onPress={shareHotel}
              style={s0.hotelAction}
            >
              <Share2 accessible={false} size={20} color={ui.blue} />
            </Pressable>
          </View>
        </View>
        {showCheapestBadge ? (
          <View style={s0.hotelBadge}><Badge green>Cheapest</Badge></View>
        ) : null}
        <Text accessibilityLabel={`${classificationStars} star hotel`} style={s0.stars}>
          {"★".repeat(classificationStars)}
        </Text>
        <View style={s0.hotelLocation}>
          <MapPin accessible={false} size={14} strokeWidth={2} color={ui.muted} />
          <Text numberOfLines={1} style={s0.sub}>{result.location}</Text>
        </View>
        {score == null ? null : (
          <Text style={s0.review}>
            <Text style={s0.score}>{score.toFixed(1)}</Text>{" "}
            {score >= 9 ? "Exceptional" : score >= 8 ? "Excellent" : "Good"}
            {result.reviewCount ? `  ·  ${result.reviewCount.toLocaleString()} reviews` : ""}
          </Text>
        )}
        <HotelCardAmenityList amenities={result.amenities} />
        <View style={s0.hotelPrice}>
          <View style={s0.hotelPriceCopy}>
            <Text style={s0.hotelNightlyPrice}>
              {money(result.currency, result.pricePerNight)}
            </Text>
            <Text style={s0.hotelPerNight}>per night</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View deal for ${result.name}`}
            style={s0.hotelDealButton}
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
          >
            <Text style={s0.hotelDealButtonText}>View deal</Text>
          </Pressable>
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

function FlightLoadingExperience({ phase, origin, destination, roundTrip }: {
  phase: FlightLoadingPhase;
  origin: string;
  destination: string;
  roundTrip: boolean;
}) {
  const { theme } = useAppTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const searching = phase === "searching";
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });
  const planeTranslateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });
  return (
    <View
      pointerEvents="none"
      accessibilityRole="progressbar"
      accessibilityLabel={searching ? "Searching for flights" : "Almost done loading flights"}
      accessibilityLiveRegion="polite"
      style={s0.flightLoadingExperience}
    >
      <View style={s0.flightLoadingStatus}>
        <View style={s0.flightLoadingRouteCodes}>
          <Text style={[s0.flightLoadingRouteCode, { color: theme.textPrimary }]}>{origin}</Text>
          <Text style={[s0.flightLoadingRouteCode, { color: theme.textPrimary }]}>{destination}</Text>
        </View>
        <View style={s0.flightLoadingRouteLine}>
          <View style={[s0.flightLoadingRouteDot, { backgroundColor: theme.textSecondary }]} />
          <View style={[s0.flightLoadingRouteTrack, { backgroundColor: theme.border }]} />
          <Animated.View style={{ transform: [{ translateX: planeTranslateX }] }}>
            <PlaneTakeoff size={22} color={ui.blue} strokeWidth={1.8} />
          </Animated.View>
          <View style={[s0.flightLoadingRouteTrack, { backgroundColor: theme.border }]} />
          <View style={[s0.flightLoadingRouteDot, { backgroundColor: theme.textSecondary }]} />
        </View>
        <View style={s0.flightLoadingCopy}>
          <Text accessibilityRole="header" style={[s0.flightLoadingTitle, { color: theme.textPrimary }]}>
            {searching ? `Searching for flights to ${destination}…` : "Comparing the best options…"}
          </Text>
          <Text style={[s0.flightLoadingBody, { color: theme.textSecondary }]}>
            {searching ? "Checking airlines, schedules and fares…" : "Reviewing fares and journey times…"}
          </Text>
        </View>
      </View>
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[s0.skeletonList, { opacity }]}
      >
        {[0, 1, 2].map((item) => <FlightLoadingSkeleton key={item} roundTrip={roundTrip} />)}
      </Animated.View>
    </View>
  );
}

function SkeletonLine({ style, flightResults = false }: { style?: object; flightResults?: boolean }) {
  const { theme } = useAppTheme();
  return <View style={[s0.skeletonLine, flightResults && { backgroundColor: theme.border }, style]} />;
}

function FlightLoadingSkeleton({ roundTrip = false }: { roundTrip?: boolean }) {
  const { theme } = useAppTheme();
  const placeholder = { backgroundColor: theme.border };
  return (
    <View style={[s0.skeletonCard, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityElementsHidden>
      <View style={s0.skeletonIdentityLayout}>
        <View style={[s0.skeletonLogo, placeholder]} />
        <View style={s0.skeletonIdentityContent}>
          <View style={s0.skeletonIdentityHeader}>
            <View style={s0.skeletonIdentityCopy}>
              <SkeletonLine flightResults style={s0.skeletonName} />
              <SkeletonLine flightResults style={s0.skeletonFlightNumber} />
            </View>
            <View style={s0.skeletonIdentityActions}>
              <View style={[s0.skeletonBadge, placeholder]} />
            </View>
          </View>
        </View>
      </View>
      <View style={s0.skeletonJourneyList}>
        <View style={s0.skeletonJourneyBlock}>
          <SkeletonLine flightResults style={s0.skeletonJourneyLabel} />
          <View style={s0.skeletonJourneyPrimaryRow}>
            <SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonTime]} />
            <View style={s0.skeletonTimelineColumn}><SkeletonLine flightResults style={s0.skeletonDuration} /></View>
            <SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonTime]} />
          </View>
          <View style={s0.skeletonJourneyRouteRow}>
            <SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonAirport]} />
            <View style={s0.skeletonTimelineColumn}><SkeletonLine flightResults style={s0.skeletonRouteLine} /></View>
            <SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonAirport]} />
          </View>
          <View style={s0.skeletonJourneyStopRow}>
            <View style={s0.skeletonSideColumn} />
            <View style={s0.skeletonTimelineColumn}><SkeletonLine flightResults style={s0.skeletonStop} /></View>
            <View style={s0.skeletonSideColumn} />
          </View>
        </View>
        {roundTrip ? (
          <View style={s0.skeletonJourneyBlock}>
            <SkeletonLine flightResults style={s0.skeletonJourneyLabel} />
            <View style={s0.skeletonJourneyPrimaryRow}>
              <SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonTime]} />
              <View style={s0.skeletonTimelineColumn}><SkeletonLine flightResults style={s0.skeletonDuration} /></View>
              <SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonTime]} />
            </View>
            <View style={s0.skeletonJourneyRouteRow}>
              <SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonAirport]} />
              <View style={s0.skeletonTimelineColumn}><SkeletonLine flightResults style={s0.skeletonRouteLine} /></View>
              <SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonAirport]} />
            </View>
            <View style={s0.skeletonJourneyStopRow}>
              <View style={s0.skeletonSideColumn} />
              <View style={s0.skeletonTimelineColumn}><SkeletonLine flightResults style={s0.skeletonStop} /></View>
              <View style={s0.skeletonSideColumn} />
            </View>
          </View>
        ) : null}
      </View>
      <View style={s0.skeletonFareRow}>
        <View style={s0.skeletonFareCopy}>
          <SkeletonLine flightResults style={s0.skeletonPriceLine} />
          <SkeletonLine flightResults style={s0.skeletonEstimatedPriceLine} />
          <SkeletonLine flightResults style={s0.skeletonProviderPriceLine} />
        </View>
      </View>
      <View style={[s0.skeletonMetadataDivider, { backgroundColor: theme.border }]} />
      <View style={s0.skeletonMetadataRow}>
        <SkeletonLine flightResults style={s0.skeletonMetadataLine} />
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
    [{ text: "Sign in", onPress: () => router.push(signInHref("/(tabs)/profile")) }, { text: "Cancel", style: "cancel" }],
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
    const supportTextColor = theme.dark ? flightSupportText.dark : flightSupportText.light;
    const inactiveSwitchTrackColor = theme.dark ? theme.switchTrack : ui.border;
    return (
      <View
        accessibilityLabel="Flight price alert"
        style={[
          s0.flightAlert,
          { backgroundColor: theme.surface, borderColor: theme.priceAlertBorder },
        ]}
      >
        <View style={s0.flightAlertCopy}>
          <Text style={[s0.flightAlertTitle, { color: theme.textPrimary }]}>Track this flight price</Text>
          <Text style={[s0.flightAlertSubtitle, { color: supportTextColor }]} numberOfLines={1} ellipsizeMode="tail">Get notified when fares change</Text>
        </View>
        <View style={s0.flightAlertSwitchTarget}>
          <Switch
            accessibilityLabel="Track prices"
            accessibilityRole="switch"
            accessibilityState={{ checked: isTracking, disabled: pending || loadingAlert || unavailable }}
            value={isTracking}
            disabled={pending || loadingAlert || unavailable}
            onValueChange={(next) => void handleToggle(next)}
            trackColor={{ false: inactiveSwitchTrackColor, true: theme.switchTrackActive }}
            ios_backgroundColor={inactiveSwitchTrackColor}
            thumbColor={theme.surface}
          />
        </View>
        <Modal visible={targetOpen} transparent animationType="slide" onRequestClose={() => !pending && setTargetOpen(false)} accessibilityViewIsModal>
          <KeyboardAvoidingView style={s0.alertModalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={[s0.alertSheet, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityLabel="Create flight price alert">
              <Text accessibilityRole="header" style={[s0.flightAlertTitle, { color: theme.textPrimary }]}>Track prices</Text>
              <Text style={[s0.flightAlertSubtitle, { color: theme.textSecondary }]}>Target price ({currency})</Text>
              <TextInput autoFocus accessibilityLabel={`Target price in ${currency}`} value={targetDraft} onChangeText={(value) => { setTargetDraft(value); setTargetError(""); }} placeholderTextColor={theme.textSecondary} keyboardType="decimal-pad" editable={!pending} style={[s0.alertInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }]} />
              {targetError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s0.alertError, theme.dark && { color: "#FF9C9C" }]}>{targetError}</Text> : null}
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
  flightRouteSummaryCard: {
    flex: 1,
    minWidth: 0,
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "stretch",
    justifyContent: "center",
    overflow: "hidden",
  },
  flightRouteSummaryText: {
    width: "100%",
    paddingHorizontal: 14,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: appFonts.bold,
    textAlign: "center",
  },
  flightRouteSummaryEdit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  flightHeaderRouteBlock: { flex: 1, minWidth: 0, alignItems: "center" },
  flightHeaderRoute: { minWidth: 0, textAlign: "center", fontFamily: appFonts.black },
  flightHeaderEdit: {
    width: 52,
    height: 44,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  flightHeaderEditText: { fontSize: 13, lineHeight: 18, fontWeight: "700", fontFamily: appFonts.bold },
  hotelHeader: { marginBottom: 12 },
  filterRail: { height: 44, flexGrow: 0 },
  flightFilterSectionHeader: { paddingTop: 8 },
  resultsScroll: { flex: 1 },
  flightResultsContent: { flexGrow: 1 },
  route: { fontSize: 20, lineHeight: 25, fontWeight: "900", color: ui.navy },
  sub: { fontSize: 12, color: ui.muted, lineHeight: 17 },
  filters: { paddingHorizontal: 14, paddingVertical: 3, gap: 8, alignItems: "center" },
  hotelShortcut: { height: 38, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 19, paddingHorizontal: 12 },
  hotelShortcutPressed: { opacity: 0.72 },
  hotelShortcutLabel: { fontSize: 13, fontWeight: "700", fontFamily: appFonts.bold },
  hotelShortcutCount: { minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", backgroundColor: ui.blue },
  hotelShortcutCountText: { color: "white", fontSize: 11, fontWeight: "800", fontFamily: appFonts.extraBold },
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
  hotelResultsContent: { paddingTop: 12 },
  flightResultsBody: { paddingHorizontal: 14, gap: 8 },
  flightPriceAlertItem: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  flightCardItem: { paddingHorizontal: 14, paddingBottom: 8 },
  notice: {
    backgroundColor: "#F2F6FF",
    color: ui.navy,
    padding: 10,
    borderRadius: 8,
  },
  foundTitle: { fontSize: 16, fontWeight: "800", color: ui.navy },
  hotelResultCount: { fontSize: 16, lineHeight: 21, fontWeight: "700", fontFamily: appFonts.bold },
  hotelFilteredEmpty: { alignItems: "center", gap: 10, paddingVertical: 28 },
  hotelClearFilters: { color: ui.blue, fontSize: 15, fontWeight: "800" },
  flightResultCount: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 5, fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts.bold },
  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 5,
    shadowColor: "#18305B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardPressed: { opacity: 0.94 },
  airlineHeader: { width: "100%", minWidth: 0, flexDirection: "row", alignItems: "flex-start" },
  airlineCopy: { flex: 1, minWidth: 0 },
  identityActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexShrink: 0, gap: 0, transform: [{ translateY: -3 }] },
  resultBadge: { height: 24, flexDirection: "row", alignItems: "center", paddingHorizontal: 9, borderRadius: 12 },
  resultBadgeText: { fontSize: 10, lineHeight: 13, fontWeight: "800", fontFamily: appFonts.extraBold },
  flightMain: { width: "100%", alignItems: "stretch" },
  flightIdentityLayout: { width: "100%", minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  airlineLogoColumn: { width: 42, flexShrink: 0, alignItems: "center" },
  flightDetails: { flex: 1, minWidth: 0 },
  airlineName: { fontSize: 14, lineHeight: 18, color: ui.navy, fontWeight: "700", fontFamily: appFonts.bold },
  flightNumber: { marginTop: 1, fontSize: 11, lineHeight: 14, fontWeight: "500", fontFamily: appFonts.medium },
  operatingCarrierText: { fontSize: 11, lineHeight: 15, fontWeight: "500", fontFamily: appFonts.medium },
  journeyList: { width: "100%", marginTop: 10, gap: 10 },
  journeyBlock: { width: "100%" },
  journeyLabel: { fontSize: 10, lineHeight: 12, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: 0.8 },
  journeyPrimaryRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  journeyRouteRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  journeyStopRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  departureColumn: { flexBasis: 72, minWidth: 72, flexShrink: 0 },
  arrivalColumn: { flexBasis: 72, minWidth: 72, flexShrink: 0 },
  rightColumnContract: { alignItems: "flex-end" },
  time: { fontSize: 15, lineHeight: 19, fontWeight: "800", fontFamily: appFonts.extraBold, color: ui.navy },
  airportCode: { fontSize: 11, lineHeight: 14, fontWeight: "700", fontFamily: appFonts.bold },
  timelineColumn: { flex: 1, minWidth: 46, alignItems: "center" },
  journeyDuration: { maxWidth: "100%", fontSize: 11, lineHeight: 14, fontWeight: "600", fontFamily: appFonts.semibold, textAlign: "center" },
  stopLabel: { maxWidth: "100%", fontSize: 10, lineHeight: 13, fontWeight: "500", fontFamily: appFonts.medium, textAlign: "center" },
  routeTrack: { width: "100%", minWidth: 46, flexDirection: "row", alignItems: "center", gap: 2 },
  routeDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  line: {
    flex: 1,
    height: 1.5,
    backgroundColor: ui.muted,
  },
  bigPrice: { fontSize: 20, lineHeight: 25, fontWeight: "900", fontFamily: appFonts.black, color: ui.navy, textAlign: "right" },
  fareRow: { width: "100%", paddingTop: 0, flexDirection: "row", justifyContent: "flex-end" },
  fareCopy: { maxWidth: "100%", minWidth: 0, alignItems: "flex-end" },
  estimatedPrice: { fontSize: 10, lineHeight: 13, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: 0.7, textAlign: "right" },
  providerPrice: { marginTop: 1, fontSize: 11, lineHeight: 14, fontWeight: "500", fontFamily: appFonts.medium, textAlign: "right" },
  metadataDivider: { width: "100%", height: StyleSheet.hairlineWidth, marginTop: 6, marginBottom: 4 },
  metadataFooterContainer: { width: "100%", alignItems: "center" },
  metadataRow: { width: "100%", flexDirection: "row", alignItems: "center", paddingTop: 1, paddingBottom: 2 },
  metadataItem: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 2 },
  metadataText: { flexShrink: 1, minWidth: 0, fontSize: 13, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium },
  hotelCard: {
    minHeight: 260,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 13,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: "white",
  },
  hotelCardCompact: { minHeight: 292 },
  hotelImageWrap: { width: "39%", alignSelf: "stretch", position: "relative" },
  hotelImageWrapCompact: { width: "38%" },
  hotelImage: { ...StyleSheet.absoluteFillObject, backgroundColor: "#E9EDF3" },
  overlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,.72)",
    padding: 6,
    borderRadius: 5,
  },
  overlayText: { color: "white", fontSize: 10, fontWeight: "700" },
  hotelBadge: { alignSelf: "flex-start" },
  hotelCopy: { flex: 1, minWidth: 0, padding: 12, gap: 4 },
  hotelCopyCompact: { padding: 10 },
  hotelTitleRow: { flexDirection: "row", alignItems: "flex-start", minWidth: 0 },
  hotelActions: { flexDirection: "row", flexShrink: 0, marginRight: -8, marginTop: -8 },
  hotelAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  hotelName: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: appFonts.bold,
    color: ui.navy,
    lineHeight: 20,
  },
  stars: { color: "#FFB800", fontSize: 14 },
  hotelLocation: { flexDirection: "row", alignItems: "center", gap: 5, minWidth: 0 },
  review: { fontSize: 11, color: ui.navy },
  score: { backgroundColor: ui.blue, color: "white", fontWeight: "900" },
  hotelPrice: {
    marginTop: "auto",
    alignItems: "flex-end",
    paddingTop: 8,
  },
  hotelPriceCopy: { minWidth: 0, alignItems: "flex-end" },
  hotelNightlyPrice: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    fontFamily: appFonts.bold,
    color: ui.navy,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  hotelPerNight: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    fontFamily: appFonts.medium,
    color: ui.muted,
    textAlign: "right",
  },
  hotelDealButton: {
    minHeight: 40,
    minWidth: 104,
    marginTop: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: ui.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  hotelDealButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
    color: "white",
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
  flightLoadingExperience: { width: "100%", gap: 14 },
  flightLoadingStatus: { width: "100%", paddingHorizontal: 16, paddingTop: 4, gap: 5 },
  flightLoadingRouteCodes: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  flightLoadingRouteCode: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  flightLoadingRouteLine: { flexDirection: "row", alignItems: "center", paddingHorizontal: 3, gap: 7 },
  flightLoadingRouteDot: { width: 6, height: 6, borderRadius: 3 },
  flightLoadingRouteTrack: { flex: 1, height: 1 },
  flightLoadingCopy: { alignItems: "center", gap: 2, paddingTop: 5, minHeight: 48 },
  flightLoadingTitle: { fontSize: 17, lineHeight: 22, fontWeight: "800", textAlign: "center" },
  flightLoadingBody: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  skeletonList: { width: "100%", gap: 14 },
  skeletonCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 5,
  },
  skeletonIdentityLayout: { width: "100%", flexDirection: "row", alignItems: "center", gap: 8 },
  skeletonIdentityContent: { flex: 1, minWidth: 0 },
  skeletonIdentityHeader: { width: "100%", flexDirection: "row", alignItems: "center", gap: 8 },
  skeletonIdentityCopy: { flex: 1, minWidth: 0 },
  skeletonIdentityActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexShrink: 0, gap: 8 },
  skeletonBadge: { width: 60, height: 22, borderRadius: 11 },
  skeletonJourneyList: { width: "100%", marginTop: 10, gap: 10 },
  skeletonJourneyBlock: { width: "100%" },
  skeletonJourneyLabel: { width: 60, height: 7, borderRadius: 4 },
  skeletonJourneyPrimaryRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  skeletonJourneyRouteRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  skeletonJourneyStopRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  skeletonSideColumn: { flexBasis: 72, minWidth: 72, flexShrink: 0 },
  skeletonTimelineColumn: { flex: 1, minWidth: 46, alignItems: "center" },
  skeletonLogo: { width: 42, height: 42, borderRadius: 10, flexShrink: 0 },
  skeletonLine: { height: 7, borderRadius: 4, backgroundColor: "#E7EBF1" },
  skeletonName: { width: 110, height: 11 },
  skeletonFlightNumber: { width: 48, height: 7, marginTop: 4 },
  skeletonTime: { width: "70%", height: 14 },
  skeletonAirport: { width: "48%" },
  skeletonDuration: { width: "65%", height: 6 },
  skeletonRouteLine: { width: "100%", height: 2 },
  skeletonStop: { width: "52%", height: 6 },
  skeletonPriceLine: { width: 100, height: 16 },
  skeletonEstimatedPriceLine: { width: 54, height: 7, marginTop: 3 },
  skeletonProviderPriceLine: { width: 82, height: 8, marginTop: 2 },
  skeletonFareRow: { width: "100%", paddingTop: 10, flexDirection: "row", justifyContent: "flex-end" },
  skeletonFareCopy: { alignItems: "flex-end" },
  skeletonMetadataDivider: { width: "100%", height: StyleSheet.hairlineWidth, marginTop: 6, marginBottom: 4 },
  skeletonMetadataRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "flex-start" },
  skeletonMetadataLine: { width: "68%", height: 7 },
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
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    overflow: "hidden",
  },
  flightAlertCopy: { flex: 1, minWidth: 0, gap: 1 },
  flightAlertTitle: { fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts.bold },
  flightAlertSubtitle: { fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium },
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
