import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Image,
  Linking,
  KeyboardAvoidingView,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
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
  ArrowUp,
  ArrowLeft,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
import { flightEditSearchParams, flightSearchRouteParamPatch } from "../flow/flightSearchModel";
import { FlightEditSearchModal } from "./FlightEditSearchModal";
import { HotelEditSearchModal } from "./HotelEditSearchModal";
import {
  activeFlightFilterCount,
  emptyFlightFilters,
  filterAndSortFlights,
  flightFilterOptions,
  resolveFlightPriceComparisonContext,
  type FlightSort,
  type FlightFilters,
} from "./flightFilters";
import { FlightFilterSheet, type FlightFilterSectionName } from "./FlightFilterSheet";
import { FlightResultsQuickControls } from "./FlightResultsQuickControls";
import { FlightSortSheet } from "./FlightSortSheet";
import { readCurrencyPreference } from "../../storage/preferenceStorage";
import {
  convertAmount,
  displayPrice,
  resolveDisplayCurrencyContext,
  type DisplayCurrencyResolution,
  type DisplayPrice,
  type ExchangeRates,
} from "../currency/displayCurrency";
import { createHotelDisplayPrices, type HotelDisplayPriceSnapshot } from "./hotelDetailCurrency";
import { formatCabinClass, summarizeBaggage, summarizeFareRules } from "./flightCardSummaries";
import { useCanonicalSaved } from "../../storage/useCanonicalSaved";
import { AirlineLogo } from "./AirlineLogo";
import { useAppTheme } from "../../theme/AppTheme";
import { NativeBrandedSearchLoading } from "./NativeBrandedSearchLoading";
import { appFonts } from "../../theme/typography";
import { colors } from "../../theme/tokens";
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
  type DateStripPrice,
  type VerifiedDateFareMemory,
} from "./dateStripModel";
import {
  buildNearbyFarePayload,
  freshNearbyFare,
  getNearbyFareDates,
  nearbyFareCacheKey,
  preserveRoundTripDuration,
  prioritizeNearbyDates,
  runNearbyFareQueue,
  selectNearbyFareResult,
  type NearbyFareState,
} from "./nearbyFareModel";
import { flightResultCountLabel } from "./flightResultCount";
import { flightCardLegs, type FlightCardLeg } from "./flightCardLegs";
import { flightOperatingCarrierPresentation } from "./flightOperatingCarrier";
import { deriveFlightResultHighlights, type FlightResultHighlight } from "./flightResultHighlights";
import { readSession } from "../../storage/sessionStorage";
import {
  buildFlightPriceAlertPayload,
  flightAlertPresentation,
  matchingFlightPriceAlert,
  parseTargetPrice,
} from "../flow/flightPriceAlertModel";
import { buildHotelPriceAlertPayload, hotelAlertPresentation, matchingHotelPriceAlert } from "../flow/hotelPriceAlertModel";
import type { SearchPlan } from "../flow/travelSearchModel";
import { FlightResultsState } from "./FlightResultsState";
import { resolveFlightResultsState } from "./flightResultsStateModel";
import { signInHref } from "../auth/signInIntent";
import { flightInventoryCounts } from "./flightInventoryDiagnostics";
import { HotelFilterSheet, type HotelFilterSectionName } from "./HotelFilterSheet";
import { activeHotelFilterCount, buildHotelFilterOptions, emptyHotelFilters, filterHotels, type HotelFilters } from "./hotelFilters";
import { HotelCardAmenityList } from "./HotelCardAmenityList";
import { defaultHotelSort, sortHotelsForResults } from "./hotelSort";
import { HotelResultsQuickFilterSheet, type HotelResultsQuickFilterKind } from "./HotelResultsQuickFilterSheet";
import { hasHotelPrice } from "@/lib/hotels/hotelResultAvailability";
import { HOTEL_RESULTS_PAGE_SIZE, clampHotelResultsPage, getHotelResultsPageCount, paginateHotelResults } from "@/lib/hotels/hotelResultsPagination";
import { getResultsDisplayRange } from "@/lib/results/resultsDisplayRange";
import { FLIGHT_RESULTS_PAGE_SIZE, buildFlightPaginationItems, clampFlightResultsPage, getFlightResultsPageCount, paginateFlightResults } from "@/lib/flights/flightResultsPagination";
import { buildHotelFilterChips, hasGoogleMapsDiscovery } from "./hotelResultsPresentation";
import { HotelResultsPagination } from "./HotelResultsPagination";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { mobileLocales, type MobileLocale } from "../../localization/mobileLocalizationCatalog";
import { travelAccountMessage } from "../../localization/travelAccountMessages";
import { buildHotelResultsSummary } from "./hotelResultsSummary";
import { flightResultsCopy, flightResultsSummary } from "./flightResultsSummary";
import { providerLocalFlightDate } from "./flightArrivalDayOffset";
import { getHotelLocationFieldDisplay } from "@/lib/search/hotelLocationFieldDisplay";

type Product = "flight" | "hotel";
type Status = "loading" | "ready" | "empty" | "error";
const flightSupportText = {
  light: "#465675",
  dark: "#B8C3D8",
} as const;
const flightResultsLightCanvas = "#F5F7FB";
const HOTEL_UTILITY_ICON_COLOR = "#334155";
const HOTEL_SAVED_HEART_COLOR = "#E11D48";
const HOTEL_GALLERY_CHEVRON_CONTRAST = "rgba(0,0,0,0.85)";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const hotelStayNightCount = (checkIn?: string, checkOut?: string) => {
  const start = Date.parse(`${checkIn ?? ""}T00:00:00Z`);
  const end = Date.parse(`${checkOut ?? ""}T00:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(1, Math.round((end - start) / 86_400_000)) : 1;
};
export function ApprovedResultsScreen({ product }: { product: Product }) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const insets = useSafeAreaInsets();
  const flightResults = product === "flight";
  const flightCanvasColor = theme.dark ? theme.background : flightResultsLightCanvas;
  const { availability } = useFeatureAvailability();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const plan = buildSearchPlan(product, params);
  const payload = plan.plan?.payload || {};
  const [results, setResults] = useState<(FlightResult | HotelResult)[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const searchSequence = useRef(0);
  const activeSearch = useRef<AbortController | null>(null);
  const requestInFlight = useRef(false);
  const activeExecutionKey = useRef<string | undefined>(undefined);
  const searchAbortTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resultsRef = useRef<(FlightResult | HotelResult)[]>([]);
  const [sort, setSort] = useState<FlightSort>("price");
  const [sortOpen, setSortOpen] = useState(false);
  const [filters, setFilters] = useState<FlightFilters>(emptyFlightFilters);
  const [serverFlightResultCount, setServerFlightResultCount] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editSearchOpen, setEditSearchOpen] = useState(false);
  const pendingFlightEditTargetKey = useRef<string | null>(null);
  const [hotelEditSearchOpen, setHotelEditSearchOpen] = useState(false);
  const [hotelEditPresentation, setHotelEditPresentation] = useState(0);
  const [filterSection, setFilterSection] = useState<FlightFilterSectionName>("all");
  const [hotelFilters, setHotelFilters] = useState<HotelFilters>(emptyHotelFilters);
  const [hotelFilterOpen, setHotelFilterOpen] = useState(false);
  const [hotelFilterSection, setHotelFilterSection] = useState<HotelFilterSectionName>("all");
  const [hotelQuickFilter, setHotelQuickFilter] = useState<HotelResultsQuickFilterKind | null>(null);
  const [hotelPage, setHotelPage] = useState(1);
  const [hotelPageChanging, setHotelPageChanging] = useState(false);
  const [hotelBackToTop, setHotelBackToTop] = useState(false);
  const hotelBackToTopVisibleRef = useRef(false);
  const hotelScrollRef = useRef<ScrollView>(null);
  const hotelResultsOffset = useRef(0);
  const hotelResultsBodyOffset = useRef(0);
  const hotelResultsSummaryOffset = useRef(0);
  const hotelFilterHeaderHeight = useRef(0);
  const [flightPage, setFlightPage] = useState(1);
  const [flightPageChanging, setFlightPageChanging] = useState(false);
  const flightResultsListRef = useRef<SectionList<FlightResult>>(null);
  const windowDimensions = useWindowDimensions();
  const previousHotelSearchKey = useRef<string | undefined>(undefined);
  const [currencyState, setCurrencyState] = useState<{ resolution: DisplayCurrencyResolution; rates: ExchangeRates } | null>(null);
  const [verifiedDateFareMemory, setVerifiedDateFareMemory] = useState<VerifiedDateFareMemory>();
  const [nearbyFares, setNearbyFares] = useState<NearbyFareState[]>([]);
  const [nearbyFareIdentity, setNearbyFareIdentity] = useState<string>();
  const [nearbyFareResume, setNearbyFareResume] = useState(0);
  const nearbyFareCache = useRef(new Map<string, NearbyFareState>());
  const nearbyFareRequests = useRef(new Map<string, AbortController>());
  const nearbyFareGeneration = useRef(0);
  const nearbyFareAppState = useRef(AppState.currentState);
  const flightDateStripScrollY = useRef(new Animated.Value(0)).current;
  const [flightDateStripHeaderHeight, setFlightDateStripHeaderHeight] = useState(88);
  const currencyRatesRef = useRef<ExchangeRates | null>(null);
  const previousComparisonCurrency = useRef<string | null>(null);
  const previousFlightSearchKey = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!flightResults || !plan.plan?.key) return;
    if (previousFlightSearchKey.current && previousFlightSearchKey.current !== plan.plan.key) {
      setFlightPage(1);
      setSort("price");
      setFilters(emptyFlightFilters());
      setSortOpen(false);
      setFilterOpen(false);
    }
    previousFlightSearchKey.current = plan.plan.key;
  }, [flightResults, plan.plan?.key]);
  useEffect(() => {
    if (flightResults || !plan.plan?.key) return;
    if (previousHotelSearchKey.current && previousHotelSearchKey.current !== plan.plan.key) {
      setHotelFilters(emptyHotelFilters());
      setHotelFilterOpen(false);
      setHotelQuickFilter(null);
      setHotelPage(1);
    }
    previousHotelSearchKey.current = plan.plan.key;
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
      if (product === "hotel" && "warningCategory" in response && response.warningCategory === "provider_unavailable") {
        setResults([]); resultsRef.current = []; setStatus("error");
        setMessage("Hotel search is temporarily unavailable. Please try again.");
        return;
      }
      const validationStartedAt = performance.now();
      const flightAcceptance = product === "flight"
        ? acceptCanonicalResults(response.results as FlightResult[], (result) => validFlight(result, plan.plan!))
        : undefined;
      const hotelAcceptance =
        product === "hotel"
          ? acceptCanonicalResults(
              response.results as HotelResult[],
              safeCanonicalHotelResult,
            )
          : undefined;
      const valid = product === "flight"
        ? flightAcceptance!.accepted
        : hotelAcceptance!.accepted;
      const clientValidationMs = performance.now() - validationStartedAt;
      if (product === "flight") {
        setServerFlightResultCount(flightAcceptance!.canonicalCount);
        logFlightSearchCheckpoint("flight-search:validated", { requestId, serverResultCount: flightAcceptance!.canonicalCount, acceptedResultCount: valid.length, rejectedResultIds: flightAcceptance!.rejectedIds, elapsedMs: performance.now() - clientStartedAt, platform: Platform.OS });
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
      setStatus(resultsRef.current.length ? "ready" : "error");
      setMessage(failureMessage);
    } finally {
      if (isLatest()) requestInFlight.current = false;
      if (stopEventLoopMonitor) {
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
    const executionKey = `${product}:${plan.plan?.key ?? "invalid"}:${retry}:${visualTest ? "visual" : "live"}`;
    if (searchAbortTimer.current) clearTimeout(searchAbortTimer.current);
    searchAbortTimer.current = undefined;
    if (activeExecutionKey.current !== executionKey) {
      activeExecutionKey.current = executionKey;
      void load();
    }
    return () => {
      searchAbortTimer.current = setTimeout(() => {
        if (activeExecutionKey.current !== executionKey) return;
        searchSequence.current += 1;
        activeSearch.current?.abort("screen-cleanup");
        activeExecutionKey.current = undefined;
      }, 0);
    };
  }, [load, plan.plan?.key, product, retry, visualTest]);
  useFocusEffect(useCallback(() => {
    setNearbyFareResume((value) => value + 1);
    return () => {
      nearbyFareGeneration.current += 1;
      nearbyFareRequests.current.forEach((controller) => controller.abort("screen-blur"));
      nearbyFareRequests.current.clear();
    };
  }, []));
  useEffect(() => {
    if (!flightResults) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = nearbyFareAppState.current;
      nearbyFareAppState.current = nextState;
      if (nextState !== "active") {
        nearbyFareGeneration.current += 1;
        nearbyFareRequests.current.forEach((controller) => controller.abort("app-background"));
        nearbyFareRequests.current.clear();
        return;
      }
      if (previousState !== "active") {
        setNearbyFareResume((value) => value + 1);
      }
    });
    return () => subscription.remove();
  }, [flightResults]);
  const submitFlightEditSearch = useCallback((nextParams: Record<string, string | undefined>) => {
    const nextPlan = buildSearchPlan("flight", nextParams);
    if (!nextPlan.plan) return;
    if (nextPlan.plan.key === plan.plan?.key) {
      pendingFlightEditTargetKey.current = null;
      setEditSearchOpen(false);
      return;
    }
    pendingFlightEditTargetKey.current = nextPlan.plan.key;
    router.setParams(flightSearchRouteParamPatch(nextParams));
  }, [plan.plan?.key]);
  const closeFlightEditSearch = useCallback(() => {
    pendingFlightEditTargetKey.current = null;
    setEditSearchOpen(false);
  }, []);
  useEffect(() => {
    const targetKey = pendingFlightEditTargetKey.current;
    if (!editSearchOpen || !targetKey || plan.plan?.key !== targetKey) return;
    pendingFlightEditTargetKey.current = null;
    setEditSearchOpen(false);
  }, [editSearchOpen, plan.plan?.key]);
  const edit = () => {
    if (product === "flight") {
      pendingFlightEditTargetKey.current = null;
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
  const flightSummary = useMemo(() => flightResultsSummary(payload, locale), [locale, plan.plan?.key]);
  useEffect(() => {
    const nextCurrency = currencyState ? flightPriceContext?.identity ?? "unavailable" : null;
    if (nextCurrency && previousComparisonCurrency.current && previousComparisonCurrency.current !== nextCurrency) {
      setFilters((current) => current.maximumPrice != null ? { ...current, maximumPrice: null } : current);
    }
    if (nextCurrency) previousComparisonCurrency.current = nextCurrency;
  }, [currencyState, flightPriceContext?.identity]);
  const activeFilterCount = activeFlightFilterCount(filters, flightOptions);
  useEffect(() => {
    if (!__DEV__ || !flightResults || status !== "ready") return;
    console.info("[flight-search:inventory]", flightInventoryCounts({
      serverResultCount: serverFlightResultCount,
      acceptedResultCount: results.length,
      displayedResultCount: sorted.length,
      activeFilterCount,
      filters,
    }));
  }, [activeFilterCount, filters, flightResults, results.length, serverFlightResultCount, sorted.length, status]);
  const activeHotelFilters = activeHotelFilterCount(hotelFilters, hotelOptions);
  const hotelFilterChips = useMemo(() => buildHotelFilterChips(hotelFilters, hotelOptions), [hotelFilters, hotelOptions]);
  const hotelPageCount = getHotelResultsPageCount(product === "hotel" ? sorted.length : 0);
  const clampedHotelPage = clampHotelResultsPage(hotelPage, hotelPageCount);
  const hotelPageResults = product === "hotel" ? paginateHotelResults(sorted as HotelResult[], clampedHotelPage) : [];
  const hotelRange = getResultsDisplayRange({ currentPage: clampedHotelPage, pageSize: HOTEL_RESULTS_PAGE_SIZE, totalResults: product === "hotel" ? sorted.length : 0 });
  const flightPageCount = getFlightResultsPageCount(product === "flight" ? sorted.length : 0);
  const clampedFlightPage = clampFlightResultsPage(flightPage, flightPageCount);
  const flightPageResults = product === "flight" ? paginateFlightResults(sorted as FlightResult[], clampedFlightPage) : [];
  const flightRange = getResultsDisplayRange({ currentPage: clampedFlightPage, pageSize: FLIGHT_RESULTS_PAGE_SIZE, totalResults: product === "flight" ? sorted.length : 0 });
  useEffect(() => { if (product === "hotel") setHotelPage(1); }, [hotelFilters, plan.plan?.key, product]);
  useEffect(() => { if (product === "hotel" && hotelPage !== clampedHotelPage) setHotelPage(clampedHotelPage); }, [clampedHotelPage, hotelPage, product]);
  useEffect(() => { if (product === "flight" && flightPage !== clampedFlightPage) setFlightPage(clampedFlightPage); }, [clampedFlightPage, flightPage, product]);
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
    if (filterOpen) return;
    setSortOpen(false);
    setFilterSection(section);
    setFilterOpen(true);
  };
  const openFlightSheet = (sheet: "sort" | FlightFilterSectionName) => {
    if (sheet === "sort") {
      if (sortOpen) return;
      setFilterOpen(false);
      setSortOpen(true);
      return;
    }
    openFlightFilters(sheet);
  };
  const openHotelFilters = (section: HotelFilterSectionName) => {
    setHotelFilterSection(section);
    setHotelFilterOpen(true);
  };
  const openHotelQuickFilter = (kind: HotelResultsQuickFilterKind) => setHotelQuickFilter(kind);
  const closeHotelQuickFilter = () => setHotelQuickFilter(null);
  const updateHotelResultsOffset = useCallback(() => {
    hotelResultsOffset.current = Math.max(
      0,
      hotelResultsBodyOffset.current
        + hotelResultsSummaryOffset.current
        - hotelFilterHeaderHeight.current,
    );
  }, []);
  const handleHotelScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const visible = event.nativeEvent.contentOffset.y > 600;
    if (visible === hotelBackToTopVisibleRef.current) return;
    hotelBackToTopVisibleRef.current = visible;
    setHotelBackToTop(visible);
  }, []);
  const changeHotelPage = (page: number) => {
    if (hotelPageChanging || page === clampedHotelPage) return;
    setHotelPageChanging(true); setHotelPage(clampHotelResultsPage(page, hotelPageCount));
    requestAnimationFrame(() => { hotelScrollRef.current?.scrollTo({ y: hotelResultsOffset.current, animated: true }); setHotelPageChanging(false); });
  };
  const changeFlightPage = (page: number) => {
    const nextPage = clampFlightResultsPage(page, flightPageCount);
    if (flightPageChanging || nextPage === clampedFlightPage) return;
    setFlightPageChanging(true);
    setFlightPage(nextPage);
    requestAnimationFrame(() => {
      flightResultsListRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, viewPosition: 0 });
      setFlightPageChanging(false);
    });
  };
  const handleFlightFiltersChange = useCallback((next: FlightFilters) => {
    setFlightPage(1);
    setFilters(next);
  }, []);
  const clearFlightFilters = useCallback(() => {
    setFlightPage(1);
    setFilters(emptyFlightFilters());
  }, []);
  const canonicalHotelDestination = String(payload.destination || "");
  const hotelDestinationDisplay = getHotelLocationFieldDisplay(canonicalHotelDestination, locale);
  const hotelSummary = buildHotelResultsSummary({
    destination: hotelDestinationDisplay.primary || canonicalHotelDestination.trim(),
    checkIn: String(payload.checkIn || ""),
    checkOut: String(payload.checkOut || ""),
    guests: Number(payload.guests) || 1,
    rooms: Number(payload.rooms) || 1,
    locale,
  });
  const flightDate = String(payload.departureDate);
  const flightDisplayPrices = useMemo(() => {
    if (product !== "flight" || !currencyState) return new Map<string, DisplayPrice>();
    return new Map((results as FlightResult[]).map((result) => [
      result.id,
      displayPrice(result.price, result.currency, currencyState.resolution.resolvedCurrency, currencyState.rates),
    ]));
  }, [currencyState, product, results]);
  const hotelDisplayPrices = useMemo(() => {
    if (product !== "hotel" || !currencyState) return new Map<string, HotelDisplayPriceSnapshot>();
    return new Map((results as HotelResult[]).flatMap((result) =>
      Number.isFinite(result.pricePerNight) && Number.isFinite(result.totalPrice) && typeof result.currency === "string"
        ? [[result.id, createHotelDisplayPrices(result.pricePerNight!, result.totalPrice!, result.currency, currencyState.resolution.resolvedCurrency, currencyState.rates)] as const]
        : [],
    ));
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
  const flightDateStripPriceByDate = useMemo<Record<string, DateStripPrice>>(() => (
    (nearbyFareIdentity === plan.plan?.key ? nearbyFares : []).reduce<Record<string, DateStripPrice>>((fares, state) => {
      if (state.status !== "success" || !currencyState) return fares;
      const displayed = displayPrice(state.amount, state.currency, currencyState.resolution.resolvedCurrency, currencyState.rates);
      if (displayed) fares[state.date] = displayed;
      return fares;
    }, verifiedFareContextKey && verifiedDateFareMemory?.contextKey === verifiedFareContextKey
      ? { ...verifiedDateFareMemory.priceByDate } : {})
  ), [currencyState, nearbyFareIdentity, nearbyFares, plan.plan?.key, verifiedDateFareMemory, verifiedFareContextKey]);
  const nearbyFareStateByDate = useMemo(() => Object.fromEntries(
    (nearbyFareIdentity === plan.plan?.key ? nearbyFares : []).map((fare) => [fare.date, fare]),
  ), [nearbyFareIdentity, nearbyFares, plan.plan?.key]);

  useEffect(() => {
    const generation = ++nearbyFareGeneration.current;
    nearbyFareRequests.current.forEach((controller) => controller.abort("search-context-changed"));
    nearbyFareRequests.current.clear();
    const supported = product === "flight"
      && (payload.tripType === "one-way" || payload.tripType === "round-trip")
      && typeof payload.departureDate === "string";
    if (!supported || visualTest || !currencyState || (status !== "ready" && status !== "empty")) {
      setNearbyFares([]);
      setNearbyFareIdentity(undefined);
      return;
    }

    let active = true;
    const dates = getNearbyFareDates(String(payload.departureDate));
    const displayCurrency = currencyState.resolution.resolvedCurrency;
    const selectedResult = selectNearbyFareResult(results as FlightResult[], normalizeFlightPrice);
    if (selectedResult) {
      nearbyFareCache.current.set(nearbyFareCacheKey(payload, flightDate, displayCurrency), {
        date: flightDate, status: "success", amount: selectedResult.price,
        currency: selectedResult.currency, fetchedAt: Date.now(),
      });
    } else {
      nearbyFareCache.current.set(nearbyFareCacheKey(payload, flightDate, displayCurrency), {
        date: flightDate, status: "unavailable", fetchedAt: Date.now(),
      });
    }
    const initial = dates.map((date) => freshNearbyFare(
      nearbyFareCache.current, nearbyFareCacheKey(payload, date, displayCurrency),
    ) ?? { date, status: "loading" as const });
    setNearbyFareIdentity(plan.plan?.key);
    setNearbyFares(initial);
    const pending = prioritizeNearbyDates(dates, flightDate).filter((date) =>
      !freshNearbyFare(nearbyFareCache.current, nearbyFareCacheKey(payload, date, displayCurrency)));
    const isCurrent = () => active && nearbyFareGeneration.current === generation;

    void runNearbyFareQueue(pending, async (date) => {
      if (!isCurrent()) return;
      const key = nearbyFareCacheKey(payload, date, displayCurrency);
      const controller = new AbortController();
      nearbyFareRequests.current.set(key, controller);
      try {
        const response = await travelApi.searchFlights(buildNearbyFarePayload(payload, date), {
          signal: controller.signal,
          requestId: `mobile-nearby-${generation}-${date}`,
        });
        if (!isCurrent()) return;
        const lowest = selectNearbyFareResult(response.results as FlightResult[], normalizeFlightPrice);
        const next: NearbyFareState = lowest
          ? { date, status: "success", amount: lowest.price, currency: lowest.currency, fetchedAt: Date.now() }
          : { date, status: "unavailable", fetchedAt: Date.now() };
        nearbyFareCache.current.set(key, next);
        setNearbyFares((current) => current.map((fare) => fare.date === date ? next : fare));
      } catch {
        if (!isCurrent() || controller.signal.aborted) return;
        const next: NearbyFareState = { date, status: "error", fetchedAt: Date.now() };
        nearbyFareCache.current.set(key, next);
        setNearbyFares((current) => current.map((fare) => fare.date === date ? next : fare));
      } finally {
        if (nearbyFareRequests.current.get(key) === controller) nearbyFareRequests.current.delete(key);
      }
    }, isCurrent);

    return () => {
      active = false;
      nearbyFareRequests.current.forEach((controller) => controller.abort("search-context-changed"));
      nearbyFareRequests.current.clear();
    };
  }, [currencyState, flightDate, nearbyFareResume, normalizeFlightPrice, plan.plan?.key, product, results, status, visualTest]);

  const selectNearbyDate = useCallback((nextDepartureDate: string) => {
    if (nextDepartureDate === flightDate) return;
    const returnDate = payload.tripType === "round-trip" && typeof payload.returnDate === "string"
      ? preserveRoundTripDuration(flightDate, payload.returnDate, nextDepartureDate)
      : undefined;
    router.setParams({ departureDate: nextDepartureDate, ...(returnDate ? { returnDate } : {}) });
  }, [flightDate, payload.returnDate, payload.tripType]);
  const flightDateStrip = (
    payload.tripType === "one-way" || payload.tripType === "round-trip" ? <DateStrip
            date={flightDate}
            priceByDate={flightDateStripPriceByDate}
            fareStateByDate={nearbyFareStateByDate}
            flightResults
            nearbyIntelligence={status === "ready" && (payload.tripType === "one-way" || payload.tripType === "round-trip")}
            displayCurrency={currencyState?.resolution.resolvedCurrency}
            searchIdentity={plan.plan?.key}
            onSelect={selectNearbyDate}
          /> : null
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
  const filterRail = (product === "flight" ? (
    <FlightResultsQuickControls
      sort={sort}
      activeFilterCount={activeFilterCount}
      airlineCount={filters.airlines.length}
      airportCount={filters.fromAirports.length + filters.toAirports.length}
      stopsActive={filters.maxStops != null}
      openSheetKind={sortOpen ? "sort" : filterOpen ? filterSection : null}
      openSheet={openFlightSheet}
    />
  ) : (
    <ScrollView horizontal style={[s0.hotelFilterRail, { backgroundColor: theme.dark ? theme.surface : "#FFFFFF" }]} showsHorizontalScrollIndicator={false} alwaysBounceHorizontal={false} contentContainerStyle={s0.hotelFilterContent}>
            <>
              <HotelResultsShortcut label="Filter" accessibilityLabel="Filters" count={activeHotelFilters || undefined} icon expanded={hotelFilterOpen} onPress={() => openHotelFilters("all")} />
              {hotelOptions.price ? <HotelResultsShortcut label="Price" count={((hotelFilters.minimumPrice !== null && hotelFilters.minimumPrice > hotelOptions.price.minimum) || (hotelFilters.maximumPrice !== null && hotelFilters.maximumPrice < hotelOptions.price.maximum)) ? 1 : undefined} expanded={hotelQuickFilter === "price"} onPress={() => openHotelQuickFilter("price")} /> : null}
              <HotelResultsShortcut label="Stars" count={hotelFilters.starRatings.length || undefined} expanded={hotelQuickFilter === "stars"} onPress={() => openHotelQuickFilter("stars")} />
              <HotelResultsShortcut label="Facilities" count={hotelFilters.facilities.length || undefined} expanded={hotelQuickFilter === "facilities"} onPress={() => openHotelQuickFilter("facilities")} />
              {hotelOptions.roomTypes.length >= 2 ? <HotelResultsShortcut label="Room & bed" count={hotelFilters.roomTypes.length || undefined} expanded={hotelQuickFilter === "roomTypes"} onPress={() => openHotelQuickFilter("roomTypes")} /> : null}
            </>
    </ScrollView>
  ));
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
                <>
                  {hotelFilterChips.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s0.hotelFilterChips}>{hotelFilterChips.map(chip=><Pressable key={chip.key} accessibilityRole="button" accessibilityLabel={`Remove ${chip.label} filter`} onPress={()=>setHotelFilters(chip.remove(hotelFilters))} style={[s0.hotelFilterChip,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={{color:theme.textPrimary}}>{chip.label} ×</Text></Pressable>)}</ScrollView> : null}
                  {hasGoogleMapsDiscovery(results as HotelResult[]) ? <View style={[s0.hotelAttribution,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={{color:theme.textSecondary}}>Hotel discovery data provided by Google Maps</Text></View> : null}
                  {plan.plan ? <PriceAlert product="hotel" plan={plan.plan} hotelResults={results as HotelResult[]} available={availability.priceAlerts} compact /> : null}
                  {hotelRange ? <HotelResultsSummaryRow
                    count={sorted.length}
                    range={hotelRange}
                    onLayout={({ nativeEvent }) => {
                      hotelResultsSummaryOffset.current = nativeEvent.layout.y;
                      updateHotelResultsOffset();
                    }}
                  /> : null}
                </>
              ) : null}
              {status === "ready" && product === "hotel" && results.length > 0 && sorted.length === 0 ? (
                <View>{hotelFilterChips.length ? <ScrollView horizontal contentContainerStyle={s0.hotelFilterChips}>{hotelFilterChips.map(chip=><Pressable key={chip.key} accessibilityRole="button" accessibilityLabel={`Remove ${chip.label} filter`} onPress={()=>setHotelFilters(chip.remove(hotelFilters))} style={[s0.hotelFilterChip,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={{color:theme.textPrimary}}>{chip.label} ×</Text></Pressable>)}</ScrollView>:null}<View style={s0.hotelFilteredEmpty}><Text accessibilityRole="header" style={[s0.foundTitle,{color:theme.textPrimary}]}>No stays match these filters.</Text><Pressable accessibilityRole="button" onPress={()=>setHotelFilters(emptyHotelFilters())}><Text style={s0.hotelClearFilters}>Clear filters</Text></Pressable></View></View>
              ) : null}
              {!flightState && product === "hotel" && hotelPageResults.map((x, i) =>
                (
                  <HotelCard
                    key={x.id}
                    result={x as HotelResult}
                    showCheapestBadge={(clampedHotelPage - 1) * HOTEL_RESULTS_PAGE_SIZE + i === 0 && hasHotelPrice(x as HotelResult)}
                    params={params}
                    displayPrices={hotelDisplayPrices.get(x.id)}
                    displayCurrencyContext={currencyState?.resolution}
                  />
                ),
              )}
              {product === "hotel" && sorted.length ? <HotelResultsPagination page={clampedHotelPage} pages={hotelPageCount} disabled={hotelPageChanging} onPage={changeHotelPage}/> : null}
    </>
  );
  if (status === "loading") return <NativeBrandedSearchLoading product={product} />;
  return (
    <SafeAreaView style={[s0.safe, { backgroundColor: flightResults ? flightCanvasColor : theme.background }]} edges={["top"]}>
      {flightResults ? (
        <FlightResultsHeader
          route={flightSummary.route}
          secondaryLine={flightSummary.secondaryLine}
          onEdit={edit}
          backgroundColor={flightCanvasColor}
        />
      ) : null}
      {product === "flight" ? (
        <Animated.SectionList
          ref={flightResultsListRef}
          style={[s0.resultsScroll, { backgroundColor: flightCanvasColor }]}
          sections={[{ data: !flightState ? flightPageResults : [] }]}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={animatedFlightDateStrip}
          renderSectionHeader={() => (
            <View style={[s0.flightFilterSectionHeader, { backgroundColor: flightCanvasColor }]}>
              {filterRail}
              {status === "ready" && !flightState && plan.plan ? (
                <View style={s0.flightResultsIntro}>
                  <PriceAlert product="flight" plan={plan.plan} results={results as FlightResult[]} available={availability.priceAlerts} compact />
                  {flightRange ? <FlightResultsSummaryRow count={sorted.length} range={flightRange} /> : null}
                </View>
              ) : null}
            </View>
          )}
          stickySectionHeadersEnabled
          renderItem={({ item, index }) => (
            <>
              <View style={s0.flightCardItem}>
                <FlightCard
                  result={item}
                  displayPrice={flightDisplayPrices.get(item.id)}
                  displayCurrencyContext={currencyState?.resolution}
                  highlight={flightHighlights.get(item.id)}
                  params={params}
                  locale={locale}
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
          ) : !flightState && sorted.length ? <FlightResultsPagination page={clampedFlightPage} pages={flightPageCount} disabled={flightPageChanging} onPage={changeFlightPage} /> : null}
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
          <HotelResultsHeader destination={hotelSummary.destination} secondaryLine={hotelSummary.secondaryLine} onEdit={edit}/>
          <ScrollView
            ref={hotelScrollRef}
            style={s0.resultsScroll}
            alwaysBounceVertical={false}
            bounces={false}
            contentContainerStyle={s0.hotelResultsContent}
            overScrollMode="never"
            stickyHeaderIndices={[0]}
            scrollEventThrottle={16}
            onScroll={handleHotelScroll}
          >
            <View
              onLayout={({ nativeEvent }) => {
                hotelFilterHeaderHeight.current = nativeEvent.layout.height;
                updateHotelResultsOffset();
              }}
              style={[s0.hotelFilterSectionHeader, { backgroundColor: theme.background }]}
            >
              {filterRail}
            </View>
            <View
              onLayout={({ nativeEvent }) => {
                hotelResultsBodyOffset.current = nativeEvent.layout.y;
                updateHotelResultsOffset();
              }}
              style={[s0.body, { paddingBottom: Math.max(insets.bottom + 16, 16) }]}
            >
              {resultContent}
            </View>
          </ScrollView>
          {hotelBackToTop ? <Pressable accessibilityRole="button" accessibilityLabel="Back to top" onPress={()=>hotelScrollRef.current?.scrollTo({y:0,animated:true})} style={[s0.hotelBackToTop,{bottom:Math.max(insets.bottom + 16,16),backgroundColor:theme.surface,borderColor:theme.border}]}><ArrowUp size={21} color={theme.icon}/></Pressable>:null}
        </>
      )}
      {product === "flight" ? (
        <>
          <FlightSortSheet visible={sortOpen} sort={sort} onApply={(next) => { setFlightPage(1); setSort(next); setSortOpen(false); }} onClose={() => setSortOpen(false)} />
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
          onClose={() => setHotelEditSearchOpen(false)}
        />
      ) : null}
      {flightResults ? (
        <FlightEditSearchModal
          visible={editSearchOpen}
          params={flightEditSearchParams(params)}
          onClose={closeFlightEditSearch}
          onSubmit={submitFlightEditSearch}
        />
      ) : null}
      {flightResults ? <BottomNav flightResults /> : null}
    </SafeAreaView>
  );
}

function FlightResultsHeader({
  route,
  secondaryLine,
  onEdit,
  backgroundColor,
}: {
  route: string;
  secondaryLine: string;
  onEdit: () => void;
  backgroundColor: string;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityLabel="Flight search summary"
      style={[
        s0.flightHeader,
        {
          backgroundColor,
          paddingLeft: Math.max(insets.left + 6, 6),
          paddingRight: Math.max(insets.right + 10, 10),
        },
      ]}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit flight search. ${route}. ${secondaryLine}`}
          onPress={onEdit}
          style={[
            s0.flightRouteSummaryCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.dark ? theme.border : "#D8E1EC",
            },
          ]}
        >
          <View style={s0.flightRouteSummaryCopy}><Text numberOfLines={1} style={[s0.flightRouteSummaryText, { color: theme.textPrimary }]}>{route}</Text><Text numberOfLines={1} ellipsizeMode="tail" style={[s0.flightRouteSummarySecondary, { color: theme.textSecondary }]}>{secondaryLine}</Text></View>
          <View accessible={false} accessibilityElementsHidden style={s0.flightRouteSummaryEdit}><SquarePen size={16} strokeWidth={2.1} color={theme.icon} /></View>
        </Pressable>
      </View>
    </View>
  );
}
function HotelResultsHeader({
  destination,
  secondaryLine,
  onEdit,
}: {
  destination: string;
  secondaryLine: string;
  onEdit: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View
      accessibilityLabel="Hotel search summary"
      style={[s0.hotelHeader, { backgroundColor: theme.background }]}
    >
      <View style={s0.hotelHeaderMainRow}>
        <View style={s0.hotelHeaderSide}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [s0.hotelHeaderBack, pressed && s0.hotelHeaderControlPressed]}
          >
            <ArrowLeft size={25} strokeWidth={2} color={theme.icon} />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit hotel search. ${destination}. ${secondaryLine}`}
          onPress={onEdit}
          style={({ pressed }) => [
            s0.hotelSummaryCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.dark ? theme.border : "#D8E1EC",
            },
            pressed && s0.hotelSummaryCardPressed,
          ]}
        >
          <View style={s0.hotelSummaryText}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[s0.hotelSummaryDestination, { color: theme.textPrimary }]}
            >
              {destination}
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[s0.hotelSummarySecondary, { color: theme.textSecondary }]}
            >
              {secondaryLine}
            </Text>
          </View>
          <View
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={s0.hotelSummaryEditSlot}
          >
            <SquarePen size={16} strokeWidth={2.2} color={theme.icon} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
const HotelResultsShortcut = ({ label, accessibilityLabel, icon = false, count, expanded = false, onPress }: {
  label: string; accessibilityLabel?: string; icon?: boolean; count?: number; expanded?: boolean; onPress: () => void;
}) => {
  const { theme } = useAppTheme();
  const active = Boolean(count);
  const accent = theme.dark ? "#8FB5FF" : "#004BB8";
  const foreground = theme.dark ? theme.textPrimary : "#142033";
  const chevron = theme.dark ? theme.textSecondary : "#64748B";
  const border = theme.dark ? theme.border : "#D8E1EC";
  const surface = theme.dark ? theme.surface : "#FFFFFF";
  const countBackground = theme.dark ? "#142B55" : "rgba(0,75,184,0.08)";
  const controlAccessibilityLabel = `${accessibilityLabel ?? label}${active ? ", selected" : ""}${count ? `, ${count} active` : ""}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={controlAccessibilityLabel}
      accessibilityState={{ expanded, selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        s0.hotelShortcut,
        { borderColor: border, backgroundColor: pressed && !theme.dark ? "#F8FAFC" : surface },
      ]}
    >
      {icon ? <SlidersHorizontal accessible={false} size={16} strokeWidth={2.2} color={accent} /> : null}
      <Text numberOfLines={1} style={[s0.hotelShortcutLabel, { color: foreground }]}>{label}</Text>
      {count ? <View style={[s0.hotelShortcutCount, { backgroundColor: countBackground }]}><Text style={[s0.hotelShortcutCountText, { color: accent }]}>{count}</Text></View> : null}
      <ChevronDown accessible={false} size={14} strokeWidth={1.9} color={chevron} style={expanded ? s0.hotelShortcutChevronExpanded : undefined} />
    </Pressable>
  );
};

function FlightCard({ result, displayPrice: fare, displayCurrencyContext, highlight, params, locale, logInitialMount }: { result: FlightResult; displayPrice?: DisplayPrice; displayCurrencyContext?: DisplayCurrencyResolution; highlight?: FlightResultHighlight; params: Record<string, string | string[]>; locale: MobileLocale; logInitialMount: boolean }) {
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
  const fareRulesSummary = summarizeFareRules(result.refundInfo) ?? "Review booking rules";
  const baggageAccessibility = result.baggageInfo?.trim() || baggageSummary;
  const fareRulesAccessibility = result.refundInfo?.trim() || fareRulesSummary;
  const providerFare = flightProviderFarePresentation(fare);
  const labels = flightResultsCopy(locale);
  const fareAccessibility = `${fare?.accessibilityLabel ?? "price unavailable"}${fare?.converted === true ? ", estimated price" : ""}${providerFare ? `, provider price ${providerFare.accessibilityLabel}` : ""}`;
  const openDetails = () => router.push({ pathname: "/flight-details", params: buildFlightDetailParams({ searchParams: params, result, fare, displayCurrencyContext }) });
  const accessibleLeg = (direction: "outbound" | "return", leg: FlightCardLeg) => `${direction}, ${clock(leg.departureTime)} ${leg.originAirport} to ${clock(leg.arrivalTime)} ${leg.destinationAirport}, ${leg.duration}, ${leg.stops ? `${leg.stops} stop${leg.stops === 1 ? "" : "s"}` : "nonstop"}`;
  const cardAccessibilityLabel = `View flight details for ${result.airlineName}, ${accessibleLeg("outbound", outbound)}${returnLeg ? `, ${accessibleLeg("return", returnLeg)}` : ""}, ${fareAccessibility}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={cardAccessibilityLabel}
      accessibilityHint="Opens Kurioticket flight details"
      onPress={openDetails}
      style={({ pressed }) => [
        s0.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.dark ? theme.border : "#D8E1EC",
          shadowColor: theme.dark ? "#000000" : "#18305B",
        },
        pressed && s0.flightCardPressed,
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
          <FlightJourneyRow label="OUTBOUND" leg={outbound} locale={locale} />
          {returnLeg ? <FlightJourneyRow label="RETURN" leg={returnLeg} locale={locale} /> : null}
        </View>
      </View>
      <View style={[s0.flightCardFooter, { borderTopColor: theme.border }]}>
        <View style={s0.flightLowerSection}>
          <View
            accessible
            accessibilityLabel={`${labels.baggage}: ${baggageAccessibility}. ${labels.cabin}: ${cabinSummary}. ${labels.fareRule}: ${fareRulesAccessibility}.`}
            style={s0.flightMetadataRegion}
          >
            <View style={s0.flightMetadataItem}>
              <Luggage accessible={false} size={13} strokeWidth={2} color={supportTextColor}/>
              <Text numberOfLines={1} ellipsizeMode="tail" style={[s0.flightMetadataText,{color:supportTextColor}]}>{labels.baggage}: {baggageSummary}</Text>
            </View>
            <View style={s0.flightMetadataItem}>
              <Armchair accessible={false} size={13} strokeWidth={2} color={supportTextColor}/>
              <Text numberOfLines={1} ellipsizeMode="tail" style={[s0.flightMetadataText,{color:supportTextColor}]}>{labels.cabin}: {cabinSummary}</Text>
            </View>
            <View style={s0.flightMetadataItem}>
              <FileText accessible={false} size={13} strokeWidth={2} color={supportTextColor}/>
              <Text numberOfLines={1} ellipsizeMode="tail" style={[s0.flightMetadataText,{color:supportTextColor}]}>{labels.fareRules}: {labels.review}</Text>
            </View>
          </View>
          <View style={s0.flightCommercialRegion}>
            <Text accessible={false} style={[s0.bigPrice, { color: theme.textPrimary }]} numberOfLines={1}>
              {fare?.formatted ?? "—"}
            </Text>
            {fare?.converted === true ? (
              <Text accessible={false} style={[s0.estimatedPrice, { color: supportTextColor }]}>ESTIMATED PRICE</Text>
            ) : null}
            {providerFare ? (
              <Text accessible={false} style={[s0.providerPrice, { color: supportTextColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76}>
                Provider price: {providerFare.formatted}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
function FlightJourneyRow({ label, leg, locale }: { label: "OUTBOUND" | "RETURN"; leg: FlightCardLeg; locale: MobileLocale }) {
  const { theme } = useAppTheme();
  const supportTextColor = theme.dark ? flightSupportText.dark : flightSupportText.light;
  const stopLabel = leg.stops
    ? `${leg.stops} stop${leg.stops === 1 ? "" : "s"}`
    : "Nonstop";
  const intlLocale = mobileLocales.find((option) => option.code === locale)?.intl ?? "en-US";
  const departureDate = providerLocalFlightDate(leg.departureTime, intlLocale);
  const arrivalDate = providerLocalFlightDate(leg.arrivalTime, intlLocale);
  return (
    <View
      style={s0.journeyBlock}
      accessible
      accessibilityLabel={`${label.toLowerCase()}: ${clock(leg.departureTime)} ${leg.originAirport}${departureDate ? `, ${departureDate}` : ""} to ${clock(leg.arrivalTime)} ${leg.destinationAirport}${arrivalDate ? `, ${arrivalDate}` : ""}, ${leg.duration}, ${stopLabel}`}
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
          {departureDate ? <Text style={[s0.airportDate, { color: supportTextColor }]} numberOfLines={1}>{departureDate}</Text> : null}
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
          {arrivalDate ? <Text style={[s0.airportDate, { color: supportTextColor }]} numberOfLines={1}>{arrivalDate}</Text> : null}
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
  displayPrices,
  displayCurrencyContext,
}: {
  result: HotelResult;
  showCheapestBadge: boolean;
  params: Record<string, string | string[]>;
  displayPrices?: HotelDisplayPriceSnapshot;
  displayCurrencyContext?: DisplayCurrencyResolution;
}) {
  const canonical = useCanonicalSaved();
  const saved = canonical.items.some(item => item.type === "hotel" && ((item.payload as Record<string, unknown> | undefined)?.result as { id?: string } | undefined)?.id === result.id);
  const compact = useWindowDimensions().width < 430;
  const gallery = useMemo(() => [...new Set([...(result.imageUrls ?? []), result.imageUrl].filter((uri): uri is string => typeof uri === "string" && /^https?:\/\//i.test(uri)))], [result.imageUrl, result.imageUrls]);
  const [failedImages,setFailedImages]=useState<string[]>([]);
  const usableGallery=gallery.filter(uri=>!failedImages.includes(uri));
  const [activeImage,setActiveImage]=useState(0);
  useEffect(()=>{if(activeImage>=usableGallery.length)setActiveImage(0);},[activeImage,usableGallery.length]);
  const score = result.reviewScore == null
    ? null
    : result.reviewScore * (10 / (result.reviewScale || 10));
  const classificationStars = result.classificationStars || 0;
  const hasPrice = hasHotelPrice(result);
  const mealPlan=result.catalogueProfile?.mealPlan?.trim();
  const policy=[result.catalogueProfile?.cancellationPolicy,result.catalogueProfile?.paymentPolicy].filter((value):value is string=>Boolean(value?.trim()));
  const shareHotel = () => {
    const message = hasPrice
      ? `${result.name} — ${result.location} — ${displayPrices?.nightly?.formatted ?? money(result.currency, result.pricePerNight)}/night`
      : `${result.name} — ${result.location} — Price unavailable`;
    void Share.share({ message }).catch(() => undefined);
  };
  return (
    <View style={s0.hotelCard}>
      <View style={[s0.hotelImageWrap, compact && s0.hotelImageWrapCompact]}>
        {usableGallery[activeImage] ? (
          <Image source={{ uri: usableGallery[activeImage] }} onError={()=>setFailedImages(values=>[...values,usableGallery[activeImage]])} style={s0.hotelImage} />
        ) : (
          <View accessibilityLabel="Hotel image unavailable" style={[s0.hotelImage,s0.hotelImageUnavailable]}><Text style={s0.hotelImageUnavailableText}>Image unavailable</Text></View>
        )}
        {usableGallery.length>1?<>
          <Pressable accessibilityRole="button" accessibilityLabel={`Previous photo of ${result.name}`} onPress={()=>setActiveImage(index=>(index-1+usableGallery.length)%usableGallery.length)} style={[s0.galleryControl,s0.galleryPrevious]}>
            <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[s0.galleryChevronStack,s0.galleryIconPrevious]}>
              <ChevronLeft accessible={false} color={HOTEL_GALLERY_CHEVRON_CONTRAST} size={20} strokeWidth={4} style={s0.galleryChevronUnderlay}/>
              <ChevronLeft accessible={false} color="white" size={20} strokeWidth={2.2}/>
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Next photo of ${result.name}`} onPress={()=>setActiveImage(index=>(index+1)%usableGallery.length)} style={[s0.galleryControl,s0.galleryNext]}>
            <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[s0.galleryChevronStack,s0.galleryIconNext]}>
              <ChevronRight accessible={false} color={HOTEL_GALLERY_CHEVRON_CONTRAST} size={20} strokeWidth={4} style={s0.galleryChevronUnderlay}/>
              <ChevronRight accessible={false} color="white" size={20} strokeWidth={2.2}/>
            </View>
          </Pressable>
        </>:null}
        {usableGallery.length ? <View style={s0.overlay}>
          <Text style={s0.overlayText}>
            {activeImage+1} / {usableGallery.length}
          </Text>
        </View>:null}
      </View>
      <View style={[s0.hotelCopy, compact && s0.hotelCopyCompact]}>
        <View style={s0.hotelTitleRow}>
          <Text numberOfLines={2} style={s0.hotelName}>{result.name}</Text>
        </View>
        <View style={[s0.hotelActions, compact && s0.hotelActionsCompact]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? `Remove ${result.name} from saved` : `Save ${result.name}`}
            accessibilityState={{ selected: saved }}
            disabled={!hasPrice && !saved}
            onPress={() => void canonical.toggleHotel(result, params)}
            style={[s0.hotelAction, s0.hotelSaveAction]}
          >
            <Heart
              accessible={false}
              size={20}
              color={saved ? HOTEL_SAVED_HEART_COLOR : HOTEL_UTILITY_ICON_COLOR}
              fill={saved ? HOTEL_SAVED_HEART_COLOR : "none"}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Share ${result.name}`}
            onPress={shareHotel}
            style={[s0.hotelAction, s0.hotelShareAction]}
          >
            <Share2 accessible={false} size={20} color={HOTEL_UTILITY_ICON_COLOR} />
          </Pressable>
        </View>
        {showCheapestBadge && hasPrice ? (
          <View style={s0.hotelBadge}><Badge green>Cheapest</Badge></View>
        ) : null}
        {classificationStars > 0 ? <Text accessibilityLabel={`${classificationStars} star hotel`} style={s0.stars}>
          {"★".repeat(classificationStars)}
        </Text> : null}
        <View style={s0.hotelLocation}>
          <MapPin accessible={false} size={14} strokeWidth={2} color={colors.blue} />
          <Text numberOfLines={1} ellipsizeMode="tail" style={s0.hotelLocationText}>{result.location}</Text>
        </View>
        {score == null ? null : (
          <Text style={s0.review}>
            <Text style={s0.score}>{score.toFixed(1)}</Text>{" "}
            {score >= 9 ? "Exceptional" : score >= 8 ? "Excellent" : "Good"}
            {result.reviewCount ? `  ·  ${result.reviewCount.toLocaleString()} reviews` : ""}
          </Text>
        )}
        <HotelCardAmenityList amenities={result.amenities} />
        {mealPlan && !(/^breakfast/i.test(mealPlan)&&result.amenities.some(item=>/breakfast/i.test(item)))?<Text numberOfLines={1} style={s0.hotelTerm}>{mealPlan.charAt(0).toUpperCase()+mealPlan.slice(1).toLowerCase()}</Text>:null}
        {policy.map(item=><Text key={item} numberOfLines={1} style={s0.hotelTerm}>{item}</Text>)}
        {result.sourceAttributions?.map(item=>{const safe=typeof item.providerUri==="string"&&/^https?:\/\//i.test(item.providerUri);return <Pressable key={`${item.provider}-${item.providerUri??""}`} disabled={!safe} onPress={()=>safe&&void Linking.openURL(item.providerUri!)}><Text numberOfLines={1} style={s0.hotelAttributionLink}>Source: {item.provider}</Text></Pressable>;})}
        <View style={s0.hotelPrice}>
          <View style={s0.hotelPriceCopy}>
            <Text accessibilityLabel={displayPrices?.nightly?.accessibilityLabel} style={s0.hotelNightlyPrice}>
              {hasPrice ? displayPrices?.nightly?.formatted ?? money(result.currency, result.pricePerNight) : "Price unavailable"}
            </Text>
            {hasPrice ? <Text style={s0.hotelPerNight}>per night</Text> : <Text style={s0.hotelPerNight}>No live rate</Text>}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View hotel for ${result.name}`}
            style={({ pressed }) => [s0.hotelDealButton, pressed && s0.hotelDealButtonPressed]}
            onPress={() =>
              router.push({
                pathname: "/hotel-details",
                params: {
                  result: JSON.stringify(result),
                  ...Object.fromEntries(
                    Object.entries(params).map(([k, v]) => [k, one(v) || ""]),
                  ),
                  hotelDisplayPrices: displayPrices ? JSON.stringify(displayPrices) : "",
                  displayCurrencyContext: displayCurrencyContext ? JSON.stringify(displayCurrencyContext) : "",
                },
              })
            }
          >
            <Text style={s0.hotelDealButtonText}>View hotel</Text>
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

function SkeletonLine({ style, flightResults = false }: { style?: object; flightResults?: boolean }) {
  const { theme } = useAppTheme();
  return <View style={[s0.skeletonLine, flightResults && { backgroundColor: theme.border }, style]} />;
}

function FlightLoadingSkeleton({ roundTrip = false }: { roundTrip?: boolean }) {
  const { theme } = useAppTheme();
  const placeholder = { backgroundColor: theme.border };
  return (
    <View style={[s0.skeletonCard, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityElementsHidden>
      <View style={s0.skeletonIdentityLayout}><View style={[s0.skeletonLogo, placeholder]} /><View style={s0.skeletonIdentityContent}><View style={s0.skeletonIdentityHeader}><View style={s0.skeletonIdentityCopy}><SkeletonLine flightResults style={s0.skeletonName} /><SkeletonLine flightResults style={s0.skeletonFlightNumber} /></View><View style={s0.skeletonIdentityActions}><View style={[s0.skeletonBadge, placeholder]} /></View></View></View></View>
      <View style={s0.skeletonJourneyList}>
        <View style={s0.skeletonJourneyBlock}><SkeletonLine flightResults style={s0.skeletonJourneyLabel} /><View style={s0.skeletonJourneyPrimaryRow}><SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonTime]} /><View style={s0.skeletonTimelineColumn}><SkeletonLine flightResults style={s0.skeletonDuration} /></View><SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonTime]} /></View><View style={s0.skeletonJourneyRouteRow}><SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonAirport]} /><View style={s0.skeletonTimelineColumn}><SkeletonLine flightResults style={s0.skeletonRouteLine} /></View><SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonAirport]} /></View><View style={s0.skeletonJourneyStopRow}><View style={s0.skeletonSideColumn} /><View style={s0.skeletonTimelineColumn}><SkeletonLine flightResults style={s0.skeletonStop} /></View><View style={s0.skeletonSideColumn} /></View></View>
        {roundTrip ? <View style={s0.skeletonJourneyBlock}><SkeletonLine flightResults style={s0.skeletonJourneyLabel} /><View style={s0.skeletonJourneyPrimaryRow}><SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonTime]} /><View style={s0.skeletonTimelineColumn}><SkeletonLine flightResults style={s0.skeletonDuration} /></View><SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonTime]} /></View><View style={s0.skeletonJourneyRouteRow}><SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonAirport]} /><View style={s0.skeletonTimelineColumn}><SkeletonLine flightResults style={s0.skeletonRouteLine} /></View><SkeletonLine flightResults style={[s0.skeletonSideColumn, s0.skeletonAirport]} /></View><View style={s0.skeletonJourneyStopRow}><View style={s0.skeletonSideColumn} /><View style={s0.skeletonTimelineColumn}><SkeletonLine flightResults style={s0.skeletonStop} /></View><View style={s0.skeletonSideColumn} /></View></View> : null}
      </View>
      <View style={s0.skeletonFareRow}><View style={s0.skeletonFareCopy}><SkeletonLine flightResults style={s0.skeletonPriceLine} /><SkeletonLine flightResults style={s0.skeletonEstimatedPriceLine} /><SkeletonLine flightResults style={s0.skeletonProviderPriceLine} /></View></View>
      <View style={[s0.skeletonMetadataDivider, { backgroundColor: theme.border }]} /><View style={s0.skeletonMetadataRow}><SkeletonLine flightResults style={s0.skeletonMetadataLine} /></View>
    </View>
  );
}

function HotelLoadingSkeleton() {
  return <View style={s0.hotelSkeletonCard} accessibilityElementsHidden><View style={s0.hotelSkeletonImage} /><View style={s0.hotelSkeletonCopy}><SkeletonLine style={s0.hotelSkeletonTitle} /><SkeletonLine style={s0.hotelSkeletonMeta} /><SkeletonLine style={s0.hotelSkeletonReview} /><SkeletonLine style={s0.hotelSkeletonDetail} /><View style={s0.hotelSkeletonFooter}><SkeletonLine style={s0.hotelSkeletonPrice} /><View style={s0.skeletonButton} /></View></View></View>;
}
function FlightResultsSummaryRow({ count, range }: { count: number; range: { start: number; end: number } }) {
  const { theme } = useAppTheme();
  return (
    <View accessibilityLabel="Flight results summary" style={s0.flightResultsSummaryRow}>
      <View style={s0.flightResultsCountColumn}>
        <Text accessibilityRole="header" style={[s0.flightResultCount, { color: theme.textPrimary }]}>{flightResultCountLabel(count)}</Text>
        <Text accessibilityLabel={`Showing results ${range.start} through ${range.end} of ${count}`} style={[s0.flightResultRange, { color: theme.textSecondary }]}>{range.start}–{range.end}</Text>
      </View>
    </View>
  );
}

function FlightResultsPagination({ page, pages, disabled, onPage }: { page: number; pages: number; disabled: boolean; onPage: (page: number) => void }) {
  const { theme } = useAppTheme();
  if (pages <= 1) return null;
  const items = buildFlightPaginationItems(page, pages, true);
  const target = (label: string, accessibilityLabel: string, targetPage: number, targetDisabled: boolean) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: targetDisabled }}
      disabled={targetDisabled}
      onPress={() => onPage(targetPage)}
      style={({ pressed }) => [s0.flightPaginationDirection, pressed && !targetDisabled && s0.flightPaginationPressed]}
    >
      <Text style={[s0.flightPaginationDirectionText, { color: targetDisabled ? theme.textSecondary : theme.textPrimary }, targetDisabled && s0.flightPaginationDisabled]}>{label}</Text>
    </Pressable>
  );
  return (
    <View accessibilityLabel="Flight results pages" style={s0.flightPagination}>
      {target("Previous", "Previous flight results page", page - 1, disabled || page === 1)}
      <View style={s0.flightPaginationPages}>
        {items.map((item, index) => item === "ellipsis" ? <Text key={`ellipsis-${index}`} style={[s0.flightPaginationEllipsis, { color: theme.textSecondary }]}>…</Text> : (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`Flight results page ${item}`}
            accessibilityState={{ selected: item === page, disabled }}
            disabled={disabled}
            onPress={() => onPage(item)}
            style={({ pressed }) => [s0.flightPaginationPage, item === page && s0.flightPaginationPageCurrent, pressed && !disabled && s0.flightPaginationPressed]}
          >
            <Text style={[s0.flightPaginationPageText, { color: item === page ? "#FFFFFF" : theme.textPrimary }]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      {target("Next", "Next flight results page", page + 1, disabled || page === pages)}
    </View>
  );
}

const hotelResultCountLabel = (count: number) => `${count} ${count === 1 ? "Result" : "Results"} found`;

function HotelResultsSummaryRow({ count, range, onLayout }: {
  count: number;
  range: { start: number; end: number };
  onLayout: (event: { nativeEvent: { layout: { y: number } } }) => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View accessibilityLabel="Hotel results summary" onLayout={onLayout} style={s0.hotelResultsSummaryRow}>
      <View style={s0.flightResultsCountColumn}>
        <Text accessibilityRole="header" style={[s0.flightResultCount, { color: theme.textPrimary }]}>{hotelResultCountLabel(count)}</Text>
        <Text accessibilityLabel={`Showing results ${range.start} through ${range.end}`} style={[s0.flightResultRange, { color: theme.textSecondary }]}>{range.start}–{range.end}</Text>
      </View>
    </View>
  );
}

function PriceAlert({ product, plan, results, hotelResults, available = true, compact = false }: { product: Product; plan?: SearchPlan; results?: FlightResult[]; hotelResults?: HotelResult[]; available?: boolean; compact?: boolean }) {
  const { theme } = useAppTheme();
  const { locale, t } = useMobileLocalization();
  const message = useCallback((key: Parameters<typeof travelAccountMessage>[1]) => travelAccountMessage(locale, key), [locale]);
  const flight = product === "flight";
  const presentation = useMemo(() => flightAlertPresentation(product, Boolean(plan), results || []), [plan?.key, product, results]);
  const hotelPresentation = useMemo(() => hotelAlertPresentation(product, plan, hotelResults || []), [plan?.key, product, hotelResults]);
  const activePresentation = flight ? presentation : hotelPresentation;
  const currency = activePresentation.currencies[0] || "";
  const [matchingAlertState, setMatchingAlertState] = useState<{ planKey: string; alert: MobilePriceAlert }>();
  const [loadingAlert, setLoadingAlert] = useState(product === "flight" || product === "hotel");
  const reconciliationRef = useRef(0);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetDraft, setTargetDraft] = useState("");
  const [targetError, setTargetError] = useState("");
  const matchingAlert = matchingAlertState && matchingAlertState.planKey === plan?.key ? matchingAlertState.alert : undefined;
  const setCurrentMatchingAlert = useCallback((alert: MobilePriceAlert | undefined) => {
    setMatchingAlertState(alert && plan ? { planKey: plan.key, alert } : undefined);
  }, [plan?.key]);
  const isTracking = matchingAlert?.status === "ACTIVE";
  const unavailable = !activePresentation.enabled || (!available && !isTracking);
  const requireSignIn = useCallback(() => Alert.alert(message("signInRequired"), message("signInAlertBody"), [{ text: t("signIn"), onPress: () => router.push(signInHref("/(tabs)/profile")) }, { text: t("cancel"), style: "cancel" }]), [message, t]);
  const reconcile = useCallback(async () => {
    if (!plan || (product !== "flight" && product !== "hotel")) return;
    const reconciliation = ++reconciliationRef.current;
    setLoadingAlert(true);
    try {
      if (!await readSession().catch(() => null)) {
        if (reconciliation === reconciliationRef.current) setCurrentMatchingAlert(undefined);
        return;
      }
      const alerts = (await travelApi.priceAlerts()).alerts;
      if (reconciliation === reconciliationRef.current) setCurrentMatchingAlert(flight ? matchingFlightPriceAlert(alerts, plan) : matchingHotelPriceAlert(alerts, plan));
    } catch (error) {
      if (reconciliation === reconciliationRef.current && error instanceof TravelApiError && error.status === 401) setCurrentMatchingAlert(undefined);
    } finally {
      if (reconciliation === reconciliationRef.current) setLoadingAlert(false);
    }
  }, [flight, plan?.key, product, setCurrentMatchingAlert]);
  useFocusEffect(useCallback(() => { void reconcile(); }, [reconcile]));
  const handleToggle = async (next: boolean) => {
    if (pendingRef.current || loadingAlert || !plan) return;
    if (next) {
      if (unavailable) return;
      if (!await readSession().catch(() => null)) { requireSignIn(); return; }
      if (isTracking) return;
      if (!matchingAlert) { setTargetError(""); setTargetOpen(true); return; }
      pendingRef.current = true; setPending(true);
      try { setCurrentMatchingAlert((await travelApi.updatePriceAlertStatus(matchingAlert.id, "ACTIVE")).alert); }
      catch (error) { if (error instanceof TravelApiError && error.status === 401) { if (!flight) setCurrentMatchingAlert(undefined); requireSignIn(); } else Alert.alert("Unable to track prices", error instanceof TravelApiError ? error.message : "Please try again."); }
      finally { pendingRef.current = false; setPending(false); }
      return;
    }
    if (!isTracking || !matchingAlert) return;
    pendingRef.current = true; setPending(true);
    try { setCurrentMatchingAlert((await travelApi.updatePriceAlertStatus(matchingAlert.id, "PAUSED")).alert); }
    catch (error) { if (error instanceof TravelApiError && error.status === 401) { if (!flight) setCurrentMatchingAlert(undefined); requireSignIn(); } else Alert.alert("Unable to pause price tracking", error instanceof TravelApiError ? error.message : "Please try again."); }
    finally { pendingRef.current = false; setPending(false); }
  };
  const createAlert = async () => {
    if (pendingRef.current || !plan || !currency) return;
    const parsed = parseTargetPrice(targetDraft);
    if (parsed.error || parsed.value === undefined) { setTargetError(parsed.error || "Enter a target price."); return; }
    pendingRef.current = true; setPending(true); setTargetError("");
    try {
      const session = await readSession().catch(() => null);
      if (!session) { setTargetOpen(false); requireSignIn(); return; }
      const created = await travelApi.createPriceAlert(flight ? buildFlightPriceAlertPayload(plan, parsed.value, currency) : buildHotelPriceAlertPayload(plan, parsed.value, currency));
      setCurrentMatchingAlert(created.alert); setTargetOpen(false); setTargetDraft("");
    } catch (error) {
      if (error instanceof TravelApiError && error.status === 401) { setTargetOpen(false); requireSignIn(); }
      else if (error instanceof TravelApiError && error.status === 409) { await reconcile(); setTargetError("An alert for this search already exists."); }
      else setTargetError(error instanceof TravelApiError ? error.message : "Unable to create price alert. Try again.");
    } finally { pendingRef.current = false; setPending(false); }
  };
  if (flight) {
    const toggleDisabled = pending || loadingAlert || unavailable;
    return <View accessibilityLabel="Flight price alert" style={[compact ? s0.flightAlertToggleCard : s0.flightAlert,{ backgroundColor: theme.dark ? theme.surface : "#F8FAFF", borderColor: theme.priceAlertBorder }]}>{compact ? <Bell accessible={false} size={17} strokeWidth={2} color={theme.dark ? "#8FB5FF" : ui.blue}/> : null}<View style={s0.flightAlertCopy}><Text numberOfLines={1} ellipsizeMode="tail" style={[compact ? s0.flightAlertCompactTitle : s0.flightAlertTitle, { color: theme.textPrimary }]}>Track this flight price</Text></View><View style={s0.flightAlertSwitchSlot}>{toggleDisabled && (pending || loadingAlert) ? <ActivityIndicator accessible={false} size="small" color={theme.dark ? "#8FB5FF" : ui.blue}/> : null}<Switch accessibilityRole="switch" accessibilityLabel="Track this flight price" accessibilityState={{ checked: isTracking, disabled: toggleDisabled, busy: pending || loadingAlert }} disabled={toggleDisabled} value={isTracking} onValueChange={(next) => void handleToggle(next)} trackColor={{ false: theme.dark ? "#465269" : "#CBD5E1", true: theme.switchTrackActive }} thumbColor={isTracking ? "#FFFFFF" : theme.dark ? "#D9E1EF" : "#FFFFFF"} ios_backgroundColor={theme.dark ? "#465269" : "#CBD5E1"}/></View><Modal visible={targetOpen} transparent animationType="slide" onRequestClose={() => !pending && setTargetOpen(false)} accessibilityViewIsModal><KeyboardAvoidingView style={s0.alertModalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}><View style={[s0.alertSheet, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityLabel="Create flight price alert"><Text accessibilityRole="header" style={[s0.flightAlertTitle, { color: theme.textPrimary }]}>Track prices</Text><Text style={[s0.flightAlertSubtitle, { color: theme.textSecondary }]}>Target price ({currency})</Text><TextInput autoFocus accessibilityLabel={`Target price in ${currency}`} value={targetDraft} onChangeText={(value) => { setTargetDraft(value); setTargetError(""); }} placeholderTextColor={theme.textSecondary} keyboardType="decimal-pad" editable={!pending} style={[s0.alertInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }]} />{targetError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s0.alertError, theme.dark && { color: "#FF9C9C" }]}>{targetError}</Text> : null}<Button label={pending ? "Creating…" : "Create alert"} onPress={() => void createAlert()} /><Button label="Cancel" outline onPress={() => setTargetOpen(false)} /></View></KeyboardAvoidingView></Modal></View>;
  }
  if (product !== "hotel" || !plan) return null;
  if (!activePresentation.enabled) return null;
  const toggleDisabled = pending || loadingAlert || unavailable;
  return <View accessibilityLabel={message("hotelAlertTitle")} style={[s0.flightAlertCompact, { backgroundColor: theme.surface, borderColor: theme.priceAlertBorder }]}><Bell accessible={false} size={17} strokeWidth={2} color={theme.dark ? "#8FB5FF" : ui.blue}/><View style={s0.flightAlertCopy}><Text numberOfLines={1} ellipsizeMode="tail" style={[s0.flightAlertCompactTitle, { color: theme.textPrimary }]}>{message("hotelAlertTitle")}</Text></View><View style={s0.hotelAlertSwitchSlot}>{toggleDisabled && (pending || loadingAlert) ? <ActivityIndicator accessible={false} size="small" color={theme.dark ? "#8FB5FF" : ui.blue}/> : null}{/* Native UISwitch artwork sits high in its iOS layout box; offset only its Hotel rendering to optically align with the Bell and title. */}<Switch style={Platform.OS === "ios" ? s0.hotelAlertSwitchIos : undefined} accessibilityRole="switch" accessibilityLabel="Track this stay price" accessibilityState={{ checked: isTracking, disabled: toggleDisabled, busy: pending || loadingAlert }} disabled={toggleDisabled} value={isTracking} onValueChange={(next) => void handleToggle(next)} trackColor={{ false: theme.dark ? "#465269" : "#CBD5E1", true: theme.switchTrackActive }} thumbColor={isTracking ? "#FFFFFF" : theme.dark ? "#D9E1EF" : "#FFFFFF"} ios_backgroundColor={theme.dark ? "#465269" : "#CBD5E1"}/></View><Modal visible={targetOpen} transparent animationType="slide" onRequestClose={() => !pending && setTargetOpen(false)} accessibilityViewIsModal><KeyboardAvoidingView style={s0.alertModalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}><View style={[s0.alertSheet, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityLabel={message("hotelAlertTitle")}><Text accessibilityRole="header" style={[s0.flightAlertTitle, { color: theme.textPrimary }]}>{message("hotelAlertTitle")}</Text><Text style={[s0.flightAlertSubtitle, { color: theme.textSecondary }]}>{message("targetTotal")} ({currency})</Text><TextInput autoFocus accessibilityLabel={`${message("targetTotal")} ${currency}`} value={targetDraft} onChangeText={(value) => { setTargetDraft(value); setTargetError(""); }} keyboardType="decimal-pad" editable={!pending} style={[s0.alertInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }]} />{targetError ? <Text accessibilityRole="alert" style={s0.alertError}>{targetError}</Text> : null}<Button label={pending ? message("creating") : message("createAlert")} onPress={() => void createAlert()} /><Button label={t("cancel")} outline onPress={() => setTargetOpen(false)} /></View></KeyboardAvoidingView></Modal></View>;
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
  return <View style={[s0.nav, flightResults && { backgroundColor: theme.surface, borderTopColor: theme.border }, { paddingBottom: Math.max(inset.bottom, 8) }]}>{items.map(({ icon, label, accessibilityLabel, route }) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected: label === "Search" }} onPress={() => router.push(route)} style={({ pressed }) => [s0.navItem, pressed && s0.navItemPressed]}><FlowIcon name={icon as never} color={label === "Search" ? ui.blue : flightResults ? theme.textSecondary : ui.muted}/><Text style={[s0.navText, flightResults && { color: theme.textSecondary }, label === "Search" && { color: ui.blue }]}>{label}</Text></Pressable>)}</View>;
}
const s0 = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },
  flightHeader: { paddingTop: 12, paddingBottom: 8 },
  flightHeaderMainRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 6 },
  flightHeaderSide: { width: 44, flexShrink: 0 },
  flightHeaderBack: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  flightHeaderControlPressed: { opacity: 0.55 },
  flightRouteSummaryCard: { flex: 1, minWidth: 0, minHeight: 62, borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  flightRouteSummaryCopy: { flex: 1, minWidth: 0, justifyContent: "center", paddingLeft: 14, paddingVertical: 9 },
  flightRouteSummaryText: { fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts.bold },
  flightRouteSummarySecondary: { marginTop: 3, fontSize: 10.5, lineHeight: 14, fontWeight: "500", fontFamily: appFonts.medium },
  flightRouteSummaryEdit: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  hotelHeader: { paddingTop: 12, paddingHorizontal: 12, paddingBottom: 12 },
  hotelHeaderMainRow: { width: "100%", flexDirection: "row", alignItems: "center" },
  hotelHeaderSide: { width: 52, flexShrink: 0 },
  hotelHeaderBack: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  hotelHeaderControlPressed: { opacity: 0.55 },
  hotelSummaryCard: { flex: 1, minWidth: 0, minHeight: 64, borderWidth: 1, borderRadius: 13, paddingLeft: 16, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  hotelSummaryCardPressed: { opacity: 0.76 },
  hotelSummaryText: { flex: 1, minWidth: 0, justifyContent: "center" },
  hotelSummaryDestination: { fontSize: 16, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold },
  hotelSummarySecondary: { marginTop: 3, fontSize: 12.5, lineHeight: 17, fontWeight: "600", fontFamily: appFonts.semibold },
  hotelSummaryEditSlot: { width: 44, height: 44, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  hotelBackToTop:{position:"absolute",right:16,width:44,height:44,borderRadius:22,borderWidth:1,alignItems:"center",justifyContent:"center",zIndex:19,elevation:4},
  filterRail: { height: 44, flexGrow: 0 },
  hotelFilterRail: { height: 48, flexGrow: 0 },
  hotelFilterContent: { paddingHorizontal: 16, paddingBottom: 4, gap: 8, alignItems: "center", flexWrap: "nowrap" },
  hotelFilterSectionHeader: { paddingBottom: 12 },
  flightFilterSectionHeader: { paddingTop: 8 },
  resultsScroll: { flex: 1 },
  flightResultsContent: { flexGrow: 1 },
  route: { fontSize: 20, lineHeight: 25, fontWeight: "900", color: ui.navy },
  sub: { fontSize: 12, color: ui.muted, lineHeight: 17 },
  filters: { paddingHorizontal: 14, paddingVertical: 3, gap: 8, alignItems: "center" },
  hotelShortcut: { height: 44, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 11, paddingHorizontal: 14 },
  hotelShortcutLabel: { fontSize: 14, lineHeight: 18, fontWeight: "600", fontFamily: appFonts.semibold },
  hotelShortcutCount: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  hotelShortcutCountText: { fontSize: 11, lineHeight: 14, fontWeight: "600", fontFamily: appFonts.semibold },
  hotelShortcutChevronExpanded: { transform: [{ rotate: "180deg" }] },
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
  hotelResultsContent: { flexGrow: 1 },
  hotelFilterChips:{gap:8,paddingVertical:6},
  hotelFilterChip:{minHeight:44,borderRadius:18,borderWidth:1,paddingHorizontal:12,alignItems:"center",justifyContent:"center"},
  hotelAttribution:{borderWidth:1,borderRadius:10,padding:10},
  flightResultsBody: { paddingHorizontal: 14, gap: 8 },
  flightCardItem: { paddingHorizontal: 14, paddingBottom: 8 },
  flightResultsIntro: { gap: 2 },
  notice: { backgroundColor: "#F2F6FF", color: ui.navy, padding: 10, borderRadius: 8 },
  foundTitle: { fontSize: 16, fontWeight: "800", color: ui.navy },
  hotelResultsSummaryRow: { gap: 8 },
  hotelFilteredEmpty: { alignItems: "center", gap: 10, paddingVertical: 28 },
  hotelClearFilters: { color: ui.blue, fontSize: 15, fontWeight: "800" },
  flightResultsSummaryRow: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10, alignItems: "stretch" },
  flightResultsCountColumn: { minWidth: 0, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  flightResultCount: { fontSize: 13, lineHeight: 17, fontWeight: "700", fontFamily: appFonts.bold },
  flightResultRange: { marginTop: 1, fontSize: 10.5, lineHeight: 14, fontWeight: "500", fontFamily: appFonts.medium },
  flightPagination: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 104, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  flightPaginationPages: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 },
  flightPaginationDirection: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  flightPaginationDirectionText: { fontSize: 12, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold },
  flightPaginationDisabled: { opacity: 0.48 },
  flightPaginationPage: { minWidth: 44, minHeight: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  flightPaginationPageCurrent: { backgroundColor: ui.blue },
  flightPaginationPageText: { fontSize: 13, lineHeight: 17, fontWeight: "700", fontFamily: appFonts.bold },
  flightPaginationEllipsis: { minWidth: 18, textAlign: "center", fontSize: 14 },
  flightPaginationPressed: { opacity: 0.58 },
  card: { width: "100%", borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, gap: 5, shadowColor: "#18305B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  cardPressed: { opacity: 0.94 },
  airlineHeader: { width: "100%", minWidth: 0, flexDirection: "row", alignItems: "flex-start" },
  airlineCopy: { flex: 1, minWidth: 0 },
  identityActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexShrink: 0, gap: 0, transform: [{ translateY: -3 }] },
  resultBadge: { height: 24, flexDirection: "row", alignItems: "center", paddingHorizontal: 9, borderRadius: 12 },
  resultBadgeText: { fontSize: 10, lineHeight: 13, fontWeight: "800", fontFamily: appFonts.extraBold },
  flightMain: { width: "100%", alignItems: "stretch" },
  flightIdentityLayout: { width: "100%", minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  airlineLogoColumn: { width: 38, flexShrink: 0, alignItems: "center" },
  flightDetails: { flex: 1, minWidth: 0 },
  airlineName: { fontSize: 13, lineHeight: 17, color: ui.navy, fontWeight: "700", fontFamily: appFonts.bold },
  flightNumber: { marginTop: 1, fontSize: 11, lineHeight: 14, fontWeight: "500", fontFamily: appFonts.medium },
  operatingCarrierText: { fontSize: 11, lineHeight: 15, fontWeight: "500", fontFamily: appFonts.medium },
  journeyList: { width: "100%", marginTop: 8, gap: 10 },
  journeyBlock: { width: "100%" },
  journeyLabel: { fontSize: 10, lineHeight: 12, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: 0.8 },
  journeyPrimaryRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  journeyRouteRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  journeyStopRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  departureColumn: { flexBasis: 72, minWidth: 72, flexShrink: 0 },
  arrivalColumn: { flexBasis: 72, minWidth: 72, flexShrink: 0 },
  rightColumnContract: { alignItems: "flex-end" },
  time: { fontSize: 14, lineHeight: 18, fontWeight: "800", fontFamily: appFonts.extraBold, color: ui.navy },
  airportCode: { fontSize: 11, lineHeight: 14, fontWeight: "700", fontFamily: appFonts.bold },
  airportDate: { marginTop: 1, fontSize: 9.5, lineHeight: 12, fontWeight: "500", fontFamily: appFonts.medium },
  timelineColumn: { flex: 1, minWidth: 46, alignItems: "center" },
  journeyDuration: { maxWidth: "100%", fontSize: 11, lineHeight: 14, fontWeight: "600", fontFamily: appFonts.semibold, textAlign: "center" },
  stopLabel: { maxWidth: "100%", fontSize: 10, lineHeight: 13, fontWeight: "500", fontFamily: appFonts.medium, textAlign: "center" },
  routeTrack: { width: "100%", minWidth: 46, flexDirection: "row", alignItems: "center", gap: 2 },
  routeDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  line: { flex: 1, height: 1.5, backgroundColor: ui.muted },
  bigPrice: { maxWidth: "100%", minWidth: 0, flexShrink: 1, fontSize: 19, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold, color: ui.navy, textAlign: "right", fontVariant: ["tabular-nums"] },
  fareRow: { width: "100%", paddingTop: 0, flexDirection: "row", justifyContent: "flex-end" },
  fareCopy: { width: "100%", maxWidth: "100%", minWidth: 0, alignItems: "flex-end" },
  estimatedPrice: { fontSize: 10, lineHeight: 13, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: 0.7, textAlign: "right" },
  providerPrice: { maxWidth: "100%", minWidth: 0, flexShrink: 1, marginTop: 1, fontSize: 11, lineHeight: 14, fontWeight: "500", fontFamily: appFonts.medium, textAlign: "right", fontVariant: ["tabular-nums"] },
  flightCardPressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  flightCardFooter: { width: "100%", marginTop: 5, paddingTop: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#D8E1EC" },
  flightLowerSection: { width: "100%", minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  flightMetadataRegion: { flex: 1, minWidth: 0, paddingTop: 1, gap: 4 },
  flightMetadataItem: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 3 },
  flightMetadataText: { flexShrink: 1, minWidth: 0, fontSize: 9.5, lineHeight: 13, fontWeight: "500", fontFamily: appFonts.medium },
  flightCommercialRegion: { width: "44%", minWidth: 104, maxWidth: 132, flexShrink: 0, alignItems: "flex-end", gap: 1 },
  metadataDivider: { width: "100%", height: StyleSheet.hairlineWidth, marginTop: 6, marginBottom: 4 },
  metadataFooterContainer: { width: "100%", alignItems: "center" },
  metadataRow: { width: "100%", flexDirection: "row", alignItems: "center", paddingTop: 1, paddingBottom: 2 },
  metadataItem: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 2 },
  metadataText: { flexShrink: 1, minWidth: 0, fontSize: 11.5, lineHeight: 15, fontWeight: "500", fontFamily: appFonts.medium },
  hotelCard: { minHeight: 260, borderWidth: 1, borderColor: ui.border, borderRadius: 13, overflow: "hidden", flexDirection: "row", backgroundColor: "white" },
  hotelImageWrap: { width: "39%", alignSelf: "stretch", position: "relative" },
  hotelImageWrapCompact: { width: "38%" },
  hotelImage: { ...StyleSheet.absoluteFillObject, backgroundColor: "#E9EDF3" },
  hotelImageUnavailable:{alignItems:"center",justifyContent:"center",paddingHorizontal:8},
  hotelImageUnavailableText:{fontSize:12,color:ui.muted,textAlign:"center"},
  galleryControl:{position:"absolute",top:"50%",width:44,height:44,transform:[{translateY:-22}],alignItems:"center",justifyContent:"center"},
  galleryPrevious:{left:0},
  galleryNext:{right:0},
  galleryIconPrevious:{transform:[{translateX:-6}]},
  galleryIconNext:{transform:[{translateX:6}]},
  galleryChevronStack:{width:20,height:20},
  galleryChevronUnderlay:{position:"absolute",left:0,top:0},
  overlay: { position: "absolute", bottom: 10, left: 10, backgroundColor: "rgba(0,0,0,.72)", padding: 6, borderRadius: 5 },
  overlayText: { color: "white", fontSize: 10, fontWeight: "700" },
  hotelBadge: { alignSelf: "flex-start" },
  hotelCopy: { position: "relative", flex: 1, minWidth: 0, padding: 12, gap: 4 },
  hotelCopyCompact: { padding: 10 },
  hotelTitleRow: { minWidth: 0, paddingRight: 80 },
  hotelActions: { position: "absolute", zIndex: 2, top: 4, right: 4, flexDirection: "row", flexShrink: 0, gap: 0 },
  hotelActionsCompact: { top: 2, right: 2 },
  hotelAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  hotelSaveAction: { alignItems: "flex-end", paddingRight: 4 },
  hotelShareAction: { alignItems: "flex-start", paddingLeft: 4 },
  hotelName: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: "700", fontFamily: appFonts.bold, color: ui.navy, lineHeight: 20 },
  stars: { color: "#FFB800", fontSize: 14 },
  hotelLocation: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0 },
  hotelLocationText: { flexShrink: 1, minWidth: 0, color: colors.blue, fontSize: 12, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold },
  review: { fontSize: 11, color: ui.navy },
  score: { backgroundColor: ui.blue, color: "white", fontWeight: "900" },
  hotelTerm:{fontSize:11,lineHeight:15,color:ui.navy},
  hotelAttributionLink:{fontSize:10,lineHeight:14,color:colors.blue,textDecorationLine:"underline"},
  hotelPrice: { marginTop: "auto", alignItems: "flex-end", paddingTop: 8 },
  hotelPriceCopy: { minWidth: 0, alignItems: "flex-end" },
  hotelNightlyPrice: { fontSize: 18, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold, color: ui.navy, textAlign: "right", fontVariant: ["tabular-nums"] },
  hotelPerNight: { marginTop: 1, fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium, color: ui.muted, textAlign: "right" },
  hotelDealButton: { minHeight: 40, minWidth: 104, marginTop: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  hotelDealButtonPressed: { backgroundColor: "#003B91" },
  hotelDealButtonText: { fontSize: 14, lineHeight: 18, fontWeight: "600", fontFamily: appFonts.semibold, color: "white" },
  loadingState: { width: "100%", gap: 14 },
  loadingMessage: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  loadingText: { fontSize: 13, lineHeight: 18, color: ui.navy, fontWeight: "700" },
  flightLoadingExperience: { width: "100%", gap: 14 },
  flightLoadingStatus: { width: "100%", alignItems: "center", paddingHorizontal: 16, paddingTop: 4, gap: 6 },
  flightLoadingBrand: { width: 172, height: 44 },
  flightLoadingCopy: { alignItems: "center", gap: 4, minHeight: 64 },
  flightLoadingTitle: { fontSize: 17, lineHeight: 22, fontWeight: "800", textAlign: "center" },
  flightLoadingRoute: { fontSize: 14, lineHeight: 18, fontWeight: "800", textAlign: "center" },
  flightLoadingBody: { fontSize: 12, lineHeight: 17, textAlign: "center" },
  skeletonList: { width: "100%", gap: 14 },
  skeletonCard: { width: "100%", borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, gap: 5 },
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
  hotelSkeletonCard: { width: "100%", height: 234, borderWidth: 1, borderColor: ui.border, borderRadius: 13, overflow: "hidden", flexDirection: "row", backgroundColor: "white" },
  hotelSkeletonImage: { width: "39%", height: "100%", backgroundColor: "#E7EBF1" },
  hotelSkeletonCopy: { flex: 1, padding: 12, gap: 12 },
  hotelSkeletonTitle: { width: "82%", height: 15 },
  hotelSkeletonMeta: { width: "62%" },
  hotelSkeletonReview: { width: "74%" },
  hotelSkeletonDetail: { width: "88%" },
  hotelSkeletonFooter: { marginTop: "auto", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  hotelSkeletonPrice: { width: 58, height: 16 },
  flightAlert: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 0, flexDirection: "row", alignItems: "center", gap: 4, overflow: "hidden" },
  flightAlertCompact: { width: "100%", minHeight: 48, borderRadius: 11, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 8 },
  flightAlertToggleCard: { minHeight: 48, marginHorizontal: 14, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 9 },
  flightAlertCopy: { flex: 1, minWidth: 0, gap: 1 },
  flightAlertCompactTitle: { fontSize: 12.5, lineHeight: 16, fontWeight: "700", fontFamily: appFonts.bold },
  flightAlertTitle: { fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts.bold },
  flightAlertSubtitle: { fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium },
  flightAlertSwitchSlot: { minWidth: 51, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  hotelAlertSwitchSlot: { minWidth: 51, minHeight: 44, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  hotelAlertSwitchIos: { transform: [{ translateY: 8 }] },
  alertModalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.45)" },
  alertSheet: { padding: 20, gap: 12, borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  alertInput: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 18 },
  alertError: { color: "#A4262C" },
  alertButton: { width: "100%", minHeight: 44, borderWidth: 1, borderColor: ui.blue, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "white" },
  alertButtonPressed: { backgroundColor: "#EEF4FF" },
  alertButtonText: { color: ui.blue, fontSize: 14, fontWeight: "800" },
  nav: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", borderTopWidth: 1, borderTopColor: ui.border, paddingTop: 9, backgroundColor: "white" },
  navItem: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 3 },
  navItemPressed: { opacity: 0.72 },
  navText: { fontSize: 10, color: ui.muted, fontWeight: "700" },
});
