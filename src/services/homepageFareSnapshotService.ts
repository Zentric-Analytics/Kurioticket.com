import { HomepageFareSnapshotStatus, Prisma } from "@/generated/prisma/client";

import {
  DEFAULT_HOME_DISCOVERY_REGION,
  GLOBAL_HOME_DISCOVERY_REGION,
  HOME_DISCOVERY_VISIBLE_CARD_COUNT,
  getGlobalHomeDiscoveryFareCandidates,
  getGlobalHomeDiscoveryPriceRoutes,
  getHomeDiscoveryFareCandidates,
  getRegionalHomeDiscoveryFareCandidates,
  type HomeDiscoveryFareCandidate,
} from "@/data/homeDiscovery";
import { popularDestinationsByMarket } from "@/data/marketHomeContent";
import { HOMEPAGE_REFRESH_MARKET_CODES } from "@/lib/market/resolveMarket";
import { getOptionalPrisma } from "@/lib/prisma";
import type {
  FlightSearchParams,
  NormalizedFlightResult,
  ProviderResult,
} from "@/lib/types";
import { searchDuffelFlights } from "@/services/travel/providers/duffelProvider";

const AIRPORT_OR_CITY_CODE_PATTERN = /^[A-Z]{3}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const DEFAULT_TRIP_TYPE = "one-way";
const DEFAULT_CABIN_CLASS = "economy";
const DEFAULT_TRAVELERS = 1;
const DEFAULT_CURRENCY = "USD";
const ACTIVE_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
const UNAVAILABLE_SNAPSHOT_TTL_MS = 6 * 60 * 60 * 1000;
const FAILED_SNAPSHOT_TTL_MS = 60 * 60 * 1000;
const PROVIDER_NAME = "Duffel";
const NEAR_EXPIRY_REFRESH_WINDOW_MS = 6 * 60 * 60 * 1000;

export const HOMEPAGE_FARE_SMART_REFRESH_DEFAULTS = {
  popularVisibleTarget: 8,
  discoverVisibleTarget: HOME_DISCOVERY_VISIBLE_CARD_COUNT,
  discoverBackupFreshTarget: 3,
  maxRouteAttemptsPerRun: 288,
  maxProviderCallsPerRun: 288,
  maxRouteAttemptsPerMarket: 36,
  maxDateCandidatesPerRoute: 3,
  lastKnownGoodTtlHours: 168,
} as const;

const HOMEPAGE_FARE_REFRESH_MARKETS = HOMEPAGE_REFRESH_MARKET_CODES;

type HomepageFareRefreshMarket = (typeof HOMEPAGE_FARE_REFRESH_MARKETS)[number];

const SAFE_HOMEPAGE_FARE_ERROR_CATEGORIES = {
  provider_no_inventory: "no_inventory",
  provider_route_unavailable: "route_unavailable",
  provider_timeout: "timeout",
  provider_network_error: "network",
  provider_auth_error: "auth",
  provider_server_error: "server",
  provider_invalid_response: "invalid_response",
  provider_failed: "failed",
  provider_skipped: "skipped",
  no_fare_returned: "unavailable",
  refresh_error: "failed",
} as const;

type SafeHomepageFareErrorReason =
  keyof typeof SAFE_HOMEPAGE_FARE_ERROR_CATEGORIES;

type SafeHomepageFareErrorCategory =
  (typeof SAFE_HOMEPAGE_FARE_ERROR_CATEGORIES)[SafeHomepageFareErrorReason];

export const HOMEPAGE_FARE_DEFAULT_ORIGIN = "JFK";
export const HOMEPAGE_FARE_DEFAULT_CURRENCY = DEFAULT_CURRENCY;

export const PHASE_3A_POPULAR_HOMEPAGE_FARE_ROUTES = [
  { id: "dubai", label: "Dubai", destination: "DXB" },
  { id: "london", label: "London", destination: "LHR" },
  { id: "paris", label: "Paris", destination: "CDG" },
  { id: "bali", label: "Bali", destination: "DPS" },
  { id: "new-york", label: "New York", destination: "EWR" },
] as const;

export type HomepageFareRoute = {
  id: string;
  market?: string;
  origin: string;
  destination: string;
  label?: string;
};

export type HomepageFareSnapshotStatusValue =
  | "fresh"
  | "last_known_good"
  | "expired"
  | "unavailable"
  | "failed"
  | "missing";

export type HomepageFareSnapshotStatusRoute = {
  id: string;
  market: string;
  label: string;
  origin: string;
  destination: string;
  originCity?: string;
  destinationCity?: string;
  section: "popular" | "discovery" | "backup" | "fallback";
  price?: number;
  currency?: string;
  providerNativePrice?: number;
  providerNativeCurrency?: string;
  provider?: string;
  status: HomepageFareSnapshotStatusValue;
  providerBacked: boolean;
  searchedAt?: string;
  expiresAt?: string;
  errorReason?: SafeHomepageFareErrorReason;
  errorCategory?: SafeHomepageFareErrorCategory;
  replacementCandidateUsed?: string;
  publicPriceDiagnosis?: HomepageFarePublicPriceDiagnosis;
};


export type HomepageFarePublicPriceDiagnosis =
  | "fresh_available"
  | "last_known_good_used"
  | "last_known_good_failed_safety_check"
  | "fresh_missing"
  | "last_known_good_missing"
  | "exact_route_mismatch"
  | "provider_failed"
  | "provider_unavailable"
  | "no_provider_backed_fare_ever"
  | "price_invalid";

export type HomepageFareSnapshotStatusSummary = Record<
  HomepageFareSnapshotStatusValue,
  number
> & {
  total: number;
};

export type HomepageFareSnapshotHealthStatus =
  | "healthy"
  | "warning"
  | "attention";

export type HomepageFareSnapshotHealth = {
  status: HomepageFareSnapshotHealthStatus;
  label: string;
  message: string;
};

export type HomepageFareGlobalReadinessStatus = "ready" | "partial" | "not_ready";

export type HomepageFareMarketReadinessStatus =
  | "ready"
  | "underfilled"
  | "provider_exhausted"
  | "budget_exhausted"
  | "cooldown";

export type HomepageFareDisplayReadiness = HomepageFareSnapshotHealth & {
  globalReadinessStatus: HomepageFareGlobalReadinessStatus;
  popularFresh: number;
  popularTarget: number;
  discoverFresh: number;
  discoverVisibleTarget: number;
  discoverDisplayedFresh: number;
  discoverBackupFresh: number;
  publicFreshTarget: number;
};

export type HomepageFareCandidatePoolHealth = HomepageFareSnapshotStatusSummary;

export type HomepageFareRefreshBudget = {
  popularVisibleTarget: number;
  discoverVisibleTarget: number;
  discoverBackupFreshTarget: number;
  maxRouteAttemptsPerRun: number;
  maxProviderCallsPerRun: number;
  maxRouteAttemptsPerMarket: number;
  maxDateCandidatesPerRoute: number;
  lastKnownGoodTtlHours: number;
};

export type HomepageFareSnapshotStatusResponse = {
  routes: HomepageFareSnapshotStatusRoute[];
  summary: HomepageFareSnapshotStatusSummary;
  health: HomepageFareSnapshotHealth;
  displayReadiness: HomepageFareDisplayReadiness;
  candidatePoolHealth: HomepageFareCandidatePoolHealth;
  refreshBudget: HomepageFareRefreshBudget;
  globalReadinessStatus: HomepageFareGlobalReadinessStatus;
  requiredMarkets: string[];
  marketTargets: Record<string, HomepageFareMarketTarget>;
  marketTargetMet: Record<string, boolean>;
  underfilledMarkets: HomepageFareUnderfilledMarket[];
  readyMarkets: string[];
  marketReadinessSummary: HomepageFareMarketReadinessSummary[];
  popularFreshByMarket: Record<string, number>;
  discoveryFreshByMarket: Record<string, number>;
  backupFreshByMarket: Record<string, number>;
  lastKnownGoodByMarket: Record<string, number>;
  publicPriceDiagnostics: Record<HomepageFarePublicPriceDiagnosis, number>;
  timeoutByMarket: Record<string, number>;
  candidatePoolSizeByMarket: Record<string, number>;
  routeAttemptsByMarket: Record<string, number>;
  providerCallsByMarket: Record<string, number>;
  failedByMarket: Record<string, number>;
  unavailableByMarket: Record<string, number>;
  skippedCooldownByMarket: Record<string, number>;
  replacementCandidatesUsedByMarket: Record<string, number>;
  lastRefreshAt?: string;
  cronConfigured: boolean;
  nextExpectedCronRefresh?: string;
};

export type HomepageFareSearch = {
  tripType: "one-way";
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  travelers: 1;
  adults: 1;
  children: 0;
  infants: 0;
  cabinClass: "economy";
  currency: string;
};

export type HomepageFareSnapshotResponseEntry = {
  id: string;
  code: string;
  price?: number;
  currency?: string;
  providerBacked: boolean;
  searchedAt: string;
  expiresAt?: string;
  search?: HomepageFareSearch;
  unavailable?: boolean;
  priceState?: "fresh" | "last_known_good" | "none";
  cachedProviderBacked?: boolean;
  origin?: string;
};

export type HomepageFareDateStrategy = {
  tripType: "one-way";
  departureDate: string;
  departureDateTime: Date;
};
export type HomepageDiscoveryFareCardItem = Pick<
  HomeDiscoveryFareCandidate,
  | "id"
  | "title"
  | "originCity"
  | "originCode"
  | "destinationCity"
  | "destinationCode"
  | "routeNote"
  | "image"
  | "imageAlt"
>;

export type HomepageDiscoveryFareCard = {
  item: HomepageDiscoveryFareCardItem;
  fare?: Omit<HomepageFareSnapshotResponseEntry, "id" | "code" | "unavailable">;
  priceState: "fresh" | "last_known_good" | "none";
};

export type HomepageDiscoveryFareFallbackReason =
  | "none"
  | "requested_region_no_candidates"
  | "requested_region_no_fresh_fares"
  | "regional_fallback_no_fresh_fares"
  | "global_fallback_no_fresh_fares";

export type HomepageDiscoveryFareFallbackScope =
  | "requested-region"
  | "regional"
  | "global-international"
  | "none";

export type HomepageDiscoveryFareCardsMetadata = {
  requestedRegionCode: string;
  effectiveRegionCode: string;
  effectiveMarketCode: string;
  fallbackLevel: "exact-country" | "regional" | "global" | "neutral";
  discoveryMarket: string;
  candidateCount: number;
  freshCount: number;
  neutralCount: number;
  fallbackUsed: boolean;
  fallbackReason: HomepageDiscoveryFareFallbackReason;
  fallbackScope: HomepageDiscoveryFareFallbackScope;
  usDomesticFallbackBlocked: boolean;
  currencyRequested: string;
  snapshotCurrency: string;
};

export type HomepageDiscoveryFareCardsResponse = {
  cards: HomepageDiscoveryFareCard[];
  summary: {
    requested: number;
    fresh: number;
    neutral: number;
  };
  metadata: HomepageDiscoveryFareCardsMetadata;
};

export type HomepageFareRefreshStoppedReason =
  | "target_met"
  | "route_budget_exhausted"
  | "provider_budget_exhausted"
  | "completed"
  | "candidate_pool_exhausted"
  | "provider_unavailable_no_offers"
  | "all_remaining_cooldown_or_unavailable";

export type HomepageFareMarketTarget = {
  marketCode: string;
  marketLabel: string;
  marketGroup: string;
  marketVisibility: "country" | "regional" | "global";
  popularVisibleTarget: number;
  popularVisibleFresh: number;
  discoveryVisibleTarget: number;
  discoveryVisibleFresh: number;
  backupTarget: number;
  backupFresh: number;
  targetMet: boolean;
  status: HomepageFareMarketReadinessStatus;
  underfillReason?: string;
  reason?: string;
  routeAttempts: number;
  providerCalls: number;
  failed: number;
  unavailable: number;
  skippedCooldown: number;
  candidatePoolSize: number;
  freshCount: number;
  lastKnownGoodCount: number;
  missingCount: number;
  timeoutCount: number;
  replacementCandidatesUsed: number;
};

export type HomepageFareUnderfilledMarket = HomepageFareMarketTarget & {
  market: string;
};

export type HomepageFareMarketReadinessSummary = HomepageFareMarketTarget & {
  market: string;
};

export type HomepageFareRefreshReadiness = {
  freshPopular: number;
  freshDiscover: number;
  freshDiscoverDisplayed: number;
  freshDiscoverBackup: number;
  publicFreshTarget: number;
  operationalFreshTarget: number;
};

export type HomepageFareRefreshCounts = {
  refreshed: number;
  unavailable: number;
  failed: number;
  skipped: number;
  retained: number;
  routeAttempts: number;
  providerCalls: number;
  stoppedReason: HomepageFareRefreshStoppedReason;
  globalReadinessStatus: HomepageFareGlobalReadinessStatus;
  requiredMarkets: string[];
  readyMarkets: string[];
  marketReadinessSummary: HomepageFareMarketReadinessSummary[];
  readinessBefore: HomepageFareRefreshReadiness;
  readinessAfter: HomepageFareRefreshReadiness;
  refreshBudget: HomepageFareRefreshBudget;
  marketsConsidered: string[];
  marketTargets: Record<string, HomepageFareMarketTarget>;
  marketTargetMet: Record<string, boolean>;
  underfilledMarkets: HomepageFareUnderfilledMarket[];
  marketRoutesAttempted: Record<string, number>;
  routeAttemptsByMarket: Record<string, number>;
  marketFreshCounts: Record<string, number>;
  visiblePopularPricedByMarket: Record<string, number>;
  visibleDiscoveryPricedByMarket: Record<string, number>;
  backupFreshByMarket: Record<string, number>;
  lastKnownGoodByMarket: Record<string, number>;
  timeoutByMarket: Record<string, number>;
  candidatePoolSizeByMarket: Record<string, number>;
  replacementCandidatesUsedByMarket: Record<string, number>;
  popularFreshByMarket: Record<string, number>;
  discoveryFreshByMarket: Record<string, number>;
  providerCallsByMarket: Record<string, number>;
  failedByMarket: Record<string, number>;
  unavailableByMarket: Record<string, number>;
  skippedCooldownByMarket: Record<string, number>;
  skippedByMarket: Record<string, number>;
  targetedMarkets: string[];
  visibleGapsAttempted: HomepageFareVisibleGapAttempt[];
  replacementsUsed: HomepageFareReplacementUsage[];
  marketsNeedingAnotherRun: HomepageFareMarketNextRunNeed[];
  underfillCauseByMarket: Record<string, HomepageFareUnderfillCause>;
};


export type HomepageFareVisibleGapAttempt = {
  market: string;
  routeId: string;
  origin: string;
  destination: string;
  section: "popular" | "discovery" | "backup" | "fallback";
  result: HomepageFareRefreshRouteResult;
  replacementForRouteId?: string;
};

export type HomepageFareReplacementUsage = {
  market: string;
  failedRouteId: string;
  replacementRouteId: string;
  origin: string;
  destination: string;
  result: HomepageFareRefreshRouteResult;
};

export type HomepageFareUnderfillCause =
  | "none"
  | "budget_exhausted"
  | "candidate_pool_exhausted"
  | "provider_unavailable_no_offers"
  | "provider_failure"
  | "cooldown"
  | "underfilled";

export type HomepageFareMarketNextRunNeed = {
  market: string;
  needed: boolean;
  reason: HomepageFareUnderfillCause;
};

export type HomepageFareRefreshScope =
  | "popular"
  | "discover"
  | "discover-default"
  | "discover-first-6"
  | "all-phase-3a";

type HomepageFareRefreshRouteVisibility =
  | "visible"
  | "backup"
  | "fallback"
  | "legacy";

type HomepageRefreshRoute = HomepageFareRoute & {
  isPopular: boolean;
  isDiscover: boolean;
  market: string;
  visibility: HomepageFareRefreshRouteVisibility;
  priority: number;
};

type SnapshotKeyInput = {
  origin: string;
  destination: string;
  tripType?: string;
  departureDate: string | Date;
  returnDate?: string | Date | null;
  cabinClass?: string;
  travelers?: number;
  currency?: string;
};

type SnapshotWriteInput = SnapshotKeyInput & {
  snapshotKeyDepartureDate?: string | Date;
  price?: number | null;
  provider: string;
  providerBacked: boolean;
  searchedAt?: Date;
  expiresAt: Date;
  status: HomepageFareSnapshotStatus;
  payload?: Record<string, unknown>;
};

export function normalizeHomepageFareCode(value: string | undefined | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized && AIRPORT_OR_CITY_CODE_PATTERN.test(normalized)
    ? normalized
    : undefined;
}

export function normalizeHomepageFareCurrency(
  value: string | undefined | null,
) {
  const normalized = value?.trim().toUpperCase();
  return normalized && CURRENCY_PATTERN.test(normalized)
    ? normalized
    : undefined;
}

export function isSameHomepageFareRoute(origin: string, destination: string) {
  const normalizedOrigin = normalizeHomepageFareCode(origin);
  const normalizedDestination = normalizeHomepageFareCode(destination);

  return Boolean(
    normalizedOrigin &&
    normalizedDestination &&
    normalizedOrigin === normalizedDestination,
  );
}

export function getHomepageFareDateStrategy(
  now = new Date(),
): HomepageFareDateStrategy {
  const departureDateTime = getNextWeekendDateAroundDaysOut(45, now);

  return {
    tripType: DEFAULT_TRIP_TYPE,
    departureDate: formatDateKey(departureDateTime),
    departureDateTime,
  };
}

export function buildHomepageFareSearch({
  origin,
  destination,
  departureDate,
  currency = DEFAULT_CURRENCY,
}: {
  origin: string;
  destination: string;
  departureDate: string;
  currency?: string;
}): HomepageFareSearch {
  return {
    tripType: DEFAULT_TRIP_TYPE,
    origin,
    destination,
    departureDate,
    travelers: 1,
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: DEFAULT_CABIN_CLASS,
    currency,
  };
}

export function buildHomepageFareDepartureDateCandidates(
  primaryDepartureDate: string,
  now = new Date(),
) {
  const today = getUtcDateStart(now);
  const candidates: string[] = [];
  const seen = new Set<string>();

  for (const offsetDays of [0, 1, -1, 7, -7]) {
    const candidate = addUtcDaysToDateKey(primaryDepartureDate, offsetDays);

    if (!candidate || seen.has(candidate)) continue;
    if (parseDateKey(candidate).getTime() < today.getTime()) continue;

    seen.add(candidate);
    candidates.push(candidate);
  }

  return candidates;
}

export function buildHomepageFareSnapshotKey(input: SnapshotKeyInput) {
  const origin = normalizeHomepageFareCode(input.origin);
  const destination = normalizeHomepageFareCode(input.destination);
  const currency =
    normalizeHomepageFareCurrency(input.currency) ?? DEFAULT_CURRENCY;
  const departureDate = formatDateKey(input.departureDate);
  const returnDate = input.returnDate
    ? formatDateKey(input.returnDate)
    : "none";

  if (!origin || !destination) {
    throw new Error(
      "Homepage fare snapshot routes require valid airport codes.",
    );
  }

  return [
    origin,
    destination,
    input.tripType ?? DEFAULT_TRIP_TYPE,
    departureDate,
    returnDate,
    input.cabinClass ?? DEFAULT_CABIN_CLASS,
    input.travelers ?? DEFAULT_TRAVELERS,
    currency,
  ].join(":");
}

export function getPhase3AHomepageFareRoutes(): HomepageFareRoute[] {
  return dedupeHomepageFareRoutes(
    getAllHomepageFareRefreshRoutes().map(
      ({ id, label, origin, destination }) => ({
        id,
        label,
        origin,
        destination,
      }),
    ),
  );
}

function getAllHomepageFareRefreshRoutes(): HomepageRefreshRoute[] {
  const routes: HomepageRefreshRoute[] = [];
  let priority = 1;

  for (const market of HOMEPAGE_FARE_REFRESH_MARKETS) {
    for (const route of getMarketPopularRefreshRoutes(market)) {
      routes.push({
        ...route,
        isPopular: true,
        isDiscover: false,
        market,
        visibility: "visible",
        priority,
      });
      priority += 1;
    }

    for (const route of getMarketDiscoveryRefreshRoutes(market)) {
      routes.push({
        ...route,
        isPopular: false,
        isDiscover: true,
        market,
        visibility: route.visibility,
        priority,
      });
      priority += 1;
    }
  }

  for (const route of PHASE_3A_POPULAR_HOMEPAGE_FARE_ROUTES) {
    routes.push({
      id: `popular-${route.id}`,
      label: route.label,
      origin: HOMEPAGE_FARE_DEFAULT_ORIGIN,
      destination: route.destination,
      isPopular: true,
      isDiscover: false,
      market: DEFAULT_HOME_DISCOVERY_REGION,
      visibility: "legacy",
      priority,
    });
    priority += 1;
  }

  return dedupeRefreshRoutes(routes);
}

function getMarketPopularRefreshRoutes(
  market: HomepageFareRefreshMarket,
): HomepageFareRoute[] {
  const destinations = popularDestinationsByMarket[market] ?? [];

  return destinations.map((destination) => ({
    id: `popular-${destination.id}`,
    label: destination.city,
    origin: destination.originCode,
    destination: destination.code,
  }));
}

function getMarketDiscoveryRefreshRoutes(
  market: HomepageFareRefreshMarket,
): Array<
  HomepageFareRoute & { visibility: HomepageFareRefreshRouteVisibility }
> {
  if (market === GLOBAL_HOME_DISCOVERY_REGION) {
    return getGlobalHomeDiscoveryPriceRoutes().map((route, index) => ({
      id: `discover-${route.id}`,
      label: route.label ?? route.id,
      origin: route.originCode,
      destination: route.destinationCode,
      visibility:
        index < HOME_DISCOVERY_VISIBLE_CARD_COUNT ? "fallback" : "backup",
    }));
  }

  const regionCode = market === "CANADA" ? "CA" : market;
  const candidates = getHomeDiscoveryFareCandidates(regionCode);

  return candidates.map((candidate, index) => ({
    id: `discover-${candidate.id}`,
    label: candidate.title,
    origin: candidate.originCode,
    destination: candidate.destinationCode,
    visibility: index < HOME_DISCOVERY_VISIBLE_CARD_COUNT ? "visible" : "backup",
  }));
}

function createEmptyRefreshMarketCounts() {
  return Object.fromEntries(
    HOMEPAGE_FARE_REFRESH_MARKETS.map((market) => [market, 0]),
  ) as Record<string, number>;
}

function createEmptyMarketUnderfillCauses() {
  return Object.fromEntries(
    HOMEPAGE_FARE_REFRESH_MARKETS.map((market) => [market, "none"]),
  ) as Record<string, HomepageFareUnderfillCause>;
}

function computeFreshCountsByMarket(
  routes: HomepageRefreshRoute[],
  freshRouteIds: Set<string>,
) {
  const marketFreshCounts = createEmptyRefreshMarketCounts();
  const popularFreshByMarket = createEmptyRefreshMarketCounts();
  const discoveryFreshByMarket = createEmptyRefreshMarketCounts();
  const visiblePopularPricedByMarket = createEmptyRefreshMarketCounts();
  const visibleDiscoveryPricedByMarket = createEmptyRefreshMarketCounts();
  const backupFreshByMarket = createEmptyRefreshMarketCounts();

  for (const route of routes) {
    if (!freshRouteIds.has(route.id)) continue;

    marketFreshCounts[route.market] = (marketFreshCounts[route.market] ?? 0) + 1;

    if (route.isPopular) {
      popularFreshByMarket[route.market] =
        (popularFreshByMarket[route.market] ?? 0) + 1;
      if (route.visibility === "visible") {
        visiblePopularPricedByMarket[route.market] =
          (visiblePopularPricedByMarket[route.market] ?? 0) + 1;
      }
    }

    if (route.isDiscover) {
      discoveryFreshByMarket[route.market] =
        (discoveryFreshByMarket[route.market] ?? 0) + 1;
      if (route.visibility === "visible" || route.visibility === "fallback") {
        visibleDiscoveryPricedByMarket[route.market] =
          (visibleDiscoveryPricedByMarket[route.market] ?? 0) + 1;
      } else if (route.visibility === "backup") {
        backupFreshByMarket[route.market] =
          (backupFreshByMarket[route.market] ?? 0) + 1;
      }
    }
  }

  return {
    marketFreshCounts,
    popularFreshByMarket,
    discoveryFreshByMarket,
    visiblePopularPricedByMarket,
    visibleDiscoveryPricedByMarket,
    backupFreshByMarket,
  };
}

function computeLastKnownGoodCountsByMarket(
  routes: HomepageRefreshRoute[],
  snapshotsByRouteId: Map<string, HomepageFareSnapshotRecord>,
  now: Date,
) {
  const counts = createEmptyRefreshMarketCounts();

  for (const route of routes) {
    if (
      isLastKnownGoodHomepageFareSnapshotRecord({
        snapshot: snapshotsByRouteId.get(route.id),
        now,
        currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
      })
    ) {
      counts[route.market] = (counts[route.market] ?? 0) + 1;
    }
  }

  return counts;
}

const HOMEPAGE_FARE_MARKET_METADATA: Record<
  string,
  { label: string; group: string; visibility: "country" | "regional" | "global" }
> = {
  US: { label: "United States", group: "US", visibility: "country" },
  CANADA: { label: "Canada", group: "Canada", visibility: "country" },
  NG: { label: "Nigeria", group: "Africa", visibility: "country" },
  KE: { label: "Kenya", group: "Africa", visibility: "country" },
  ZA: { label: "South Africa", group: "Africa", visibility: "country" },
  GB: { label: "United Kingdom", group: "Europe", visibility: "country" },
  DE: { label: "Germany", group: "Europe", visibility: "country" },
  AE: { label: "United Arab Emirates", group: "Middle East", visibility: "country" },
  JP: { label: "Japan", group: "Asia", visibility: "country" },
  BR: { label: "Brazil", group: "Latin America", visibility: "country" },
  AFRICA: { label: "Africa regional fallback", group: "Africa", visibility: "regional" },
  EUROPE: { label: "Europe regional fallback", group: "Europe", visibility: "regional" },
  MIDDLE_EAST: { label: "Middle East regional fallback", group: "Middle East", visibility: "regional" },
  ASIA: { label: "Asia regional fallback", group: "Asia", visibility: "regional" },
  LATIN_AMERICA: { label: "Latin America regional fallback", group: "Latin America", visibility: "regional" },
  GLOBAL: { label: "Global international fallback", group: "Global International", visibility: "global" },
};

function getHomepageFareMarketMetadata(market: string) {
  return (
    HOMEPAGE_FARE_MARKET_METADATA[market] ?? {
      label: market,
      group: "Global International",
      visibility: "global" as const,
    }
  );
}

function getGlobalHomepageFareReadinessStatus(
  marketTargets: Record<string, HomepageFareMarketTarget>,
): HomepageFareGlobalReadinessStatus {
  const requiredTargets = HOMEPAGE_FARE_REFRESH_MARKETS
    .map((market) => marketTargets[market])
    .filter((target): target is HomepageFareMarketTarget => Boolean(target));

  if (!requiredTargets.length) return "not_ready";
  if (requiredTargets.every((target) => target.targetMet)) return "ready";
  if (requiredTargets.some((target) => target.targetMet)) return "partial";

  return "not_ready";
}

function getReadyHomepageFareMarkets(
  marketTargets: Record<string, HomepageFareMarketTarget>,
) {
  return HOMEPAGE_FARE_REFRESH_MARKETS.filter(
    (market) => marketTargets[market]?.targetMet === true,
  );
}

function buildHomepageFareMarketReadinessSummary(
  marketTargets: Record<string, HomepageFareMarketTarget>,
): HomepageFareMarketReadinessSummary[] {
  return HOMEPAGE_FARE_REFRESH_MARKETS.map((market) => ({
    market,
    ...marketTargets[market],
  })).filter((target) => Boolean(target.marketCode)) as HomepageFareMarketReadinessSummary[];
}


function updateHomepageFareUnderfillExecutionMetadata(
  counts: HomepageFareRefreshCounts,
) {
  counts.underfillCauseByMarket = Object.fromEntries(
    HOMEPAGE_FARE_REFRESH_MARKETS.map((market) => [
      market,
      getHomepageFareUnderfillCause(counts, market),
    ]),
  ) as Record<string, HomepageFareUnderfillCause>;
  counts.marketsNeedingAnotherRun = HOMEPAGE_FARE_REFRESH_MARKETS.map(
    (market) => ({
      market,
      needed: counts.marketTargetMet[market] !== true,
      reason: counts.underfillCauseByMarket[market] ?? "underfilled",
    }),
  );
}

function getHomepageFareUnderfillCause(
  counts: HomepageFareRefreshCounts,
  market: string,
): HomepageFareUnderfillCause {
  if (counts.marketTargetMet[market] === true) return "none";
  if (
    counts.stoppedReason === "provider_budget_exhausted" ||
    counts.stoppedReason === "route_budget_exhausted"
  ) {
    return "budget_exhausted";
  }
  if (counts.stoppedReason === "candidate_pool_exhausted") {
    return "candidate_pool_exhausted";
  }
  if (counts.stoppedReason === "provider_unavailable_no_offers") {
    return "provider_unavailable_no_offers";
  }
  if ((counts.skippedCooldownByMarket[market] ?? 0) > 0) return "cooldown";
  if ((counts.unavailableByMarket[market] ?? 0) > 0) {
    return "provider_unavailable_no_offers";
  }
  if ((counts.failedByMarket[market] ?? 0) > 0) return "provider_failure";
  if ((counts.routeAttemptsByMarket[market] ?? 0) >= (counts.candidatePoolSizeByMarket[market] ?? 0)) {
    return "candidate_pool_exhausted";
  }

  return "underfilled";
}

function updateRefreshGlobalReadinessMetadata(
  counts: HomepageFareRefreshCounts,
) {
  counts.globalReadinessStatus = getGlobalHomepageFareReadinessStatus(
    counts.marketTargets,
  );
  counts.readyMarkets = getReadyHomepageFareMarkets(counts.marketTargets);
  counts.marketReadinessSummary = buildHomepageFareMarketReadinessSummary(
    counts.marketTargets,
  );
}

function computeCandidatePoolSizeByMarket(routes: HomepageRefreshRoute[]) {
  const counts = createEmptyRefreshMarketCounts();

  for (const route of routes) {
    counts[route.market] = (counts[route.market] ?? 0) + 1;
  }

  return counts;
}

function computeReplacementCandidatesUsedByMarket(
  routes: HomepageRefreshRoute[],
  freshRouteIds: Set<string>,
) {
  const counts = createEmptyRefreshMarketCounts();

  for (const market of HOMEPAGE_FARE_REFRESH_MARKETS) {
    const marketRoutes = routes.filter((route) => route.market === market);
    const visibleDiscoveryFresh = marketRoutes.filter(
      (route) =>
        route.isDiscover && route.visibility === "visible" && freshRouteIds.has(route.id),
    ).length;
    const visibleDiscoveryTarget = Math.min(
      HOME_DISCOVERY_VISIBLE_CARD_COUNT,
      marketRoutes.filter(
        (route) => route.isDiscover && route.visibility === "visible",
      ).length,
    );
    const backupFresh = marketRoutes.filter(
      (route) =>
        route.isDiscover && route.visibility === "backup" && freshRouteIds.has(route.id),
    ).length;

    counts[market] = Math.min(
      Math.max(0, visibleDiscoveryTarget - visibleDiscoveryFresh),
      backupFresh,
    );
  }

  return counts;
}

function updateRefreshMarketFreshMetadata(
  counts: HomepageFareRefreshCounts,
  routes: HomepageRefreshRoute[],
  freshRouteIds: Set<string>,
) {
  const {
    marketFreshCounts,
    popularFreshByMarket,
    discoveryFreshByMarket,
    visiblePopularPricedByMarket,
    visibleDiscoveryPricedByMarket,
    backupFreshByMarket,
  } = computeFreshCountsByMarket(routes, freshRouteIds);

  counts.marketFreshCounts = marketFreshCounts;
  counts.popularFreshByMarket = popularFreshByMarket;
  counts.discoveryFreshByMarket = discoveryFreshByMarket;
  counts.visiblePopularPricedByMarket = visiblePopularPricedByMarket;
  counts.visibleDiscoveryPricedByMarket = visibleDiscoveryPricedByMarket;
  counts.backupFreshByMarket = backupFreshByMarket;
  counts.replacementCandidatesUsedByMarket = computeReplacementCandidatesUsedByMarket(
    routes,
    freshRouteIds,
  );
}

function updateRefreshMarketTargetMetadata(
  counts: HomepageFareRefreshCounts,
  routes: HomepageRefreshRoute[],
  freshRouteIds: Set<string>,
  budget: HomepageFareRefreshBudget,
) {
  const marketTargets = computeHomepageFareMarketTargets(
    routes,
    freshRouteIds,
    budget,
    {
      routeAttemptsByMarket: counts.routeAttemptsByMarket,
      providerCallsByMarket: counts.providerCallsByMarket,
      failedByMarket: counts.failedByMarket,
      unavailableByMarket: counts.unavailableByMarket,
      skippedCooldownByMarket: counts.skippedCooldownByMarket,
      candidatePoolSizeByMarket: counts.candidatePoolSizeByMarket,
      replacementCandidatesUsedByMarket: counts.replacementCandidatesUsedByMarket,
      lastKnownGoodByMarket: counts.lastKnownGoodByMarket,
      timeoutByMarket: counts.timeoutByMarket,
      stoppedReason: counts.stoppedReason,
    },
  );

  counts.marketTargets = marketTargets;
  counts.marketTargetMet = Object.fromEntries(
    Object.entries(marketTargets).map(([market, target]) => [
      market,
      target.targetMet,
    ]),
  );
  counts.underfilledMarkets = Object.entries(marketTargets)
    .filter(([, target]) => !target.targetMet)
    .map(([market, target]) => ({ market, ...target }));
  updateRefreshGlobalReadinessMetadata(counts);
}

function computeHomepageFareMarketTargets(
  routes: HomepageRefreshRoute[],
  freshRouteIds: Set<string>,
  budget: HomepageFareRefreshBudget,
  metrics: {
    routeAttemptsByMarket?: Record<string, number>;
    providerCallsByMarket?: Record<string, number>;
    failedByMarket?: Record<string, number>;
    unavailableByMarket?: Record<string, number>;
    skippedCooldownByMarket?: Record<string, number>;
    candidatePoolSizeByMarket?: Record<string, number>;
    replacementCandidatesUsedByMarket?: Record<string, number>;
    lastKnownGoodByMarket?: Record<string, number>;
    timeoutByMarket?: Record<string, number>;
    stoppedReason?: HomepageFareRefreshStoppedReason;
  } = {},
): Record<string, HomepageFareMarketTarget> {
  return Object.fromEntries(
    HOMEPAGE_FARE_REFRESH_MARKETS.map((market) => {
      const marketRoutes = routes.filter((route) => route.market === market);
      const visiblePopularRoutes = marketRoutes.filter(
        (route) => route.isPopular && route.visibility === "visible",
      );
      const visibleDiscoveryRoutes = marketRoutes.filter(
        (route) =>
          route.isDiscover &&
          (route.visibility === "visible" || route.visibility === "fallback"),
      );
      const backupRoutes = marketRoutes.filter(
        (route) => route.visibility === "backup",
      );
      const popularVisibleTarget = Math.min(
        budget.popularVisibleTarget,
        visiblePopularRoutes.length,
      );
      const discoveryVisibleTarget = Math.min(
        budget.discoverVisibleTarget,
        visibleDiscoveryRoutes.length,
      );
      const backupTarget = Math.min(
        Math.max(0, marketRoutes.length - popularVisibleTarget - discoveryVisibleTarget),
        budget.discoverBackupFreshTarget,
      );
      const popularVisibleFresh = visiblePopularRoutes.filter((route) =>
        freshRouteIds.has(route.id),
      ).length;
      const discoveryPoolFresh = marketRoutes.filter(
        (route) => route.isDiscover && freshRouteIds.has(route.id),
      ).length;
      const discoveryVisibleFresh = Math.min(
        discoveryVisibleTarget,
        discoveryPoolFresh,
      );
      const backupFresh = backupRoutes.filter((route) =>
        freshRouteIds.has(route.id),
      ).length;
      const targetMet =
        popularVisibleFresh >= popularVisibleTarget &&
        discoveryVisibleFresh >= discoveryVisibleTarget &&
        backupFresh >= backupTarget;
      const missingPopular = Math.max(0, popularVisibleTarget - popularVisibleFresh);
      const missingDiscovery = Math.max(
        0,
        discoveryVisibleTarget - discoveryVisibleFresh,
      );
      const missingBackup = Math.max(0, backupTarget - backupFresh);

      const routeAttempts = metrics.routeAttemptsByMarket?.[market] ?? 0;
      const providerCalls = metrics.providerCallsByMarket?.[market] ?? 0;
      const failed = metrics.failedByMarket?.[market] ?? 0;
      const unavailable = metrics.unavailableByMarket?.[market] ?? 0;
      const skippedCooldown = metrics.skippedCooldownByMarket?.[market] ?? 0;
      const candidatePoolSize =
        metrics.candidatePoolSizeByMarket?.[market] ?? marketRoutes.length;
      const lastKnownGoodCount = metrics.lastKnownGoodByMarket?.[market] ?? 0;
      const timeoutCount = metrics.timeoutByMarket?.[market] ?? 0;
      const replacementCandidatesUsed =
        metrics.replacementCandidatesUsedByMarket?.[market] ??
        computeReplacementCandidatesUsedByMarket(routes, freshRouteIds)[market] ??
        0;
      const freshCount = Math.max(
        0,
        popularVisibleFresh + discoveryVisibleFresh + backupFresh - lastKnownGoodCount,
      );
      const missingCount = missingPopular + missingDiscovery + missingBackup;
      const underfillReason = targetMet
        ? undefined
        : `missing ${missingPopular} visible popular, ${missingDiscovery} visible discovery, and ${missingBackup} backup provider-backed fares`;
      const metadata = getHomepageFareMarketMetadata(market);
      const status = classifyHomepageFareMarketReadinessStatus({
        targetMet,
        routeAttempts,
        providerCalls,
        failed,
        unavailable,
        skippedCooldown,
        candidatePoolSize,
        stoppedReason: metrics.stoppedReason,
      });

      return [
        market,
        {
          marketCode: market,
          marketLabel: metadata.label,
          marketGroup: metadata.group,
          marketVisibility: metadata.visibility,
          popularVisibleTarget,
          popularVisibleFresh,
          discoveryVisibleTarget,
          discoveryVisibleFresh,
          backupTarget,
          backupFresh,
          targetMet,
          status,
          ...(underfillReason
            ? {
                underfillReason,
                reason: underfillReason,
              }
            : {}),
          routeAttempts,
          providerCalls,
          failed,
          unavailable,
          skippedCooldown,
          candidatePoolSize,
          freshCount,
          lastKnownGoodCount,
          missingCount,
          timeoutCount,
          replacementCandidatesUsed,
        },
      ];
    }),
  );
}


function classifyHomepageFareMarketReadinessStatus({
  targetMet,
  routeAttempts,
  providerCalls,
  failed,
  unavailable,
  skippedCooldown,
  candidatePoolSize,
  stoppedReason,
}: {
  targetMet: boolean;
  routeAttempts: number;
  providerCalls: number;
  failed: number;
  unavailable: number;
  skippedCooldown: number;
  candidatePoolSize: number;
  stoppedReason?: HomepageFareRefreshStoppedReason;
}): HomepageFareMarketReadinessStatus {
  if (targetMet) return "ready";
  if (stoppedReason === "provider_budget_exhausted") return "budget_exhausted";
  if (stoppedReason === "route_budget_exhausted") return "budget_exhausted";
  if (stoppedReason === "candidate_pool_exhausted") return "provider_exhausted";
  if (stoppedReason === "provider_unavailable_no_offers") return "provider_exhausted";
  if (
    stoppedReason === "all_remaining_cooldown_or_unavailable" ||
    (skippedCooldown > 0 && routeAttempts === 0 && providerCalls === 0)
  ) {
    return "cooldown";
  }
  if (candidatePoolSize > 0 && failed + unavailable >= candidatePoolSize) {
    return "provider_exhausted";
  }

  return "underfilled";
}

export async function refreshPhase3AHomepageFareSnapshots({
  scope = "all-phase-3a",
  dateStrategy = getHomepageFareDateStrategy(),
}: {
  scope?: HomepageFareRefreshScope;
  dateStrategy?: HomepageFareDateStrategy;
} = {}): Promise<HomepageFareRefreshCounts> {
  const refreshBudget = getHomepageFareSmartRefreshBudget();
  const now = new Date();
  const allCandidateRoutes = getRefreshRoutes("all-phase-3a");
  const refreshRoutes = getRefreshRoutes(scope);
  const snapshotsByRouteId = await readHomepageFareSnapshotsForRoutes({
    routes: allCandidateRoutes,
    departureDate: dateStrategy.departureDate,
    currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
  });
  const freshRouteIds = new Set(
    allCandidateRoutes
      .filter((route) =>
        isUsableHomepageFareSnapshotRecord({
          snapshot: snapshotsByRouteId.get(route.id),
          now,
          currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
        }),
      )
      .map((route) => route.id),
  );
  const readinessBefore = computeHomepageFareRefreshReadiness(
    allCandidateRoutes,
    freshRouteIds,
    refreshBudget,
  );
  const counts: HomepageFareRefreshCounts = {
    refreshed: 0,
    unavailable: 0,
    failed: 0,
    skipped: 0,
    retained: 0,
    routeAttempts: 0,
    providerCalls: 0,
    stoppedReason: "completed",
    globalReadinessStatus: "not_ready",
    requiredMarkets: [...HOMEPAGE_FARE_REFRESH_MARKETS],
    readyMarkets: [],
    marketReadinessSummary: [],
    readinessBefore,
    readinessAfter: readinessBefore,
    refreshBudget,
    marketsConsidered: [...HOMEPAGE_FARE_REFRESH_MARKETS],
    marketTargets: {},
    marketTargetMet: {},
    underfilledMarkets: [],
    marketRoutesAttempted: createEmptyRefreshMarketCounts(),
    routeAttemptsByMarket: createEmptyRefreshMarketCounts(),
    marketFreshCounts: createEmptyRefreshMarketCounts(),
    visiblePopularPricedByMarket: createEmptyRefreshMarketCounts(),
    visibleDiscoveryPricedByMarket: createEmptyRefreshMarketCounts(),
    backupFreshByMarket: createEmptyRefreshMarketCounts(),
    candidatePoolSizeByMarket: computeCandidatePoolSizeByMarket(allCandidateRoutes),
    replacementCandidatesUsedByMarket: createEmptyRefreshMarketCounts(),
    popularFreshByMarket: createEmptyRefreshMarketCounts(),
    discoveryFreshByMarket: createEmptyRefreshMarketCounts(),
    providerCallsByMarket: createEmptyRefreshMarketCounts(),
    failedByMarket: createEmptyRefreshMarketCounts(),
    unavailableByMarket: createEmptyRefreshMarketCounts(),
    skippedCooldownByMarket: createEmptyRefreshMarketCounts(),
    timeoutByMarket: createEmptyRefreshMarketCounts(),
    lastKnownGoodByMarket: createEmptyRefreshMarketCounts(),
    skippedByMarket: createEmptyRefreshMarketCounts(),
    targetedMarkets: [],
    visibleGapsAttempted: [],
    replacementsUsed: [],
    marketsNeedingAnotherRun: [],
    underfillCauseByMarket: createEmptyMarketUnderfillCauses(),
  };
  counts.lastKnownGoodByMarket = computeLastKnownGoodCountsByMarket(
    allCandidateRoutes,
    snapshotsByRouteId,
    now,
  );
  updateRefreshMarketFreshMetadata(counts, allCandidateRoutes, freshRouteIds);
  updateRefreshMarketTargetMetadata(
    counts,
    allCandidateRoutes,
    freshRouteIds,
    refreshBudget,
  );

  if (
    hasMetHomepageFareOperationalTarget(
      allCandidateRoutes,
      freshRouteIds,
      refreshBudget,
    )
  ) {
    counts.skipped = refreshRoutes.length;
    for (const route of refreshRoutes) {
      counts.skippedByMarket[route.market] =
        (counts.skippedByMarket[route.market] ?? 0) + 1;
    }
    counts.stoppedReason = "target_met";
    updateHomepageFareUnderfillExecutionMetadata(counts);
    return counts;
  }

  let providerIncidentDetected = false;
  const attemptedRouteIds = new Set<string>();
  const targetedMarkets = new Set(
    Object.values(counts.marketTargets)
      .filter((target) => !target.targetMet)
      .sort(compareHomepageFareMarketTargetsForExecution)
      .map((target) => target.marketCode),
  );
  counts.targetedMarkets = [...targetedMarkets];
  const prioritizedRoutes = prioritizeHomepageFareRefreshRoutes({
    routes: refreshRoutes,
    snapshotsByRouteId,
    freshRouteIds,
    marketTargets: counts.marketTargets,
    now,
  });
  const prioritizedRouteIds = new Set(
    prioritizedRoutes.map((route) => route.id),
  );

  for (const route of refreshRoutes) {
    const snapshot = snapshotsByRouteId.get(route.id);

    if (
      !prioritizedRouteIds.has(route.id) &&
      isRefreshCooldownSnapshot(snapshot, now)
    ) {
      counts.skippedCooldownByMarket[route.market] =
        (counts.skippedCooldownByMarket[route.market] ?? 0) + 1;
    }
  }

  if (!prioritizedRoutes.length) {
    counts.stoppedReason = "all_remaining_cooldown_or_unavailable";
    counts.skipped = refreshRoutes.length;
    for (const route of refreshRoutes) {
      counts.skippedByMarket[route.market] =
        (counts.skippedByMarket[route.market] ?? 0) + 1;
    }
    updateHomepageFareUnderfillExecutionMetadata(counts);
    return counts;
  }

  for (const route of prioritizedRoutes) {
    if (attemptedRouteIds.has(route.id)) continue;

    counts.readinessAfter = computeHomepageFareRefreshReadiness(
      allCandidateRoutes,
      freshRouteIds,
      refreshBudget,
    );

    if (
      hasMetHomepageFareOperationalTarget(
        allCandidateRoutes,
        freshRouteIds,
        refreshBudget,
      )
    ) {
      counts.stoppedReason = "target_met";
      break;
    }

    const budgetStop = getHomepageFareRefreshBudgetStopReason(
      counts,
      refreshBudget,
    );
    if (budgetStop) {
      counts.stoppedReason = budgetStop;
      break;
    }

    if (providerIncidentDetected) {
      counts.stoppedReason = "completed";
      break;
    }

    const result = await executeHomepageFareRefreshRoute({
      route,
      departureDate: dateStrategy.departureDate,
      counts,
      snapshotsByRouteId,
      refreshBudget,
      attemptedRouteIds,
    });

    recordHomepageFareVisibleGapAttempt(counts, route, result);

    if (result === "refreshed" || result === "retained") {
      freshRouteIds.add(route.id);
      updateRefreshMarketFreshMetadata(
        counts,
        allCandidateRoutes,
        freshRouteIds,
      );
      updateRefreshMarketTargetMetadata(
        counts,
        allCandidateRoutes,
        freshRouteIds,
        refreshBudget,
      );
    }

    if (result === "provider_incident") {
      providerIncidentDetected = true;
    }

    if (
      !providerIncidentDetected &&
      shouldAttemptHomepageFareReplacement(result) &&
      !counts.marketTargets[route.market]?.targetMet
    ) {
      const replacements = getHomepageFareReplacementCandidates({
        failedRoute: route,
        routes: allCandidateRoutes,
        snapshotsByRouteId,
        freshRouteIds,
        attemptedRouteIds,
        marketTargets: counts.marketTargets,
        now,
      });

      for (const replacement of replacements) {
        if (counts.marketTargets[route.market]?.targetMet) break;

        const replacementBudgetStop = getHomepageFareRefreshBudgetStopReason(
          counts,
          refreshBudget,
        );
        if (replacementBudgetStop) {
          counts.stoppedReason = replacementBudgetStop;
          break;
        }

        const replacementResult = await executeHomepageFareRefreshRoute({
          route: replacement,
          departureDate: dateStrategy.departureDate,
          counts,
          snapshotsByRouteId,
          refreshBudget,
          attemptedRouteIds,
        });

        counts.replacementsUsed.push({
          market: route.market,
          failedRouteId: route.id,
          replacementRouteId: replacement.id,
          origin: replacement.origin,
          destination: replacement.destination,
          result: replacementResult,
        });
        recordHomepageFareVisibleGapAttempt(
          counts,
          replacement,
          replacementResult,
          route.id,
        );

        if (replacementResult === "refreshed" || replacementResult === "retained") {
          freshRouteIds.add(replacement.id);
          updateRefreshMarketFreshMetadata(
            counts,
            allCandidateRoutes,
            freshRouteIds,
          );
          updateRefreshMarketTargetMetadata(
            counts,
            allCandidateRoutes,
            freshRouteIds,
            refreshBudget,
          );
        }

        if (replacementResult === "provider_incident") {
          providerIncidentDetected = true;
          break;
        }
      }
    }
  }

  counts.readinessAfter = computeHomepageFareRefreshReadiness(
    allCandidateRoutes,
    freshRouteIds,
    refreshBudget,
  );

  if (counts.stoppedReason === "completed") {
    if (
      hasMetHomepageFareOperationalTarget(
        allCandidateRoutes,
        freshRouteIds,
        refreshBudget,
      )
    ) {
      counts.stoppedReason = "target_met";
    } else if (counts.routeAttempts >= refreshBudget.maxRouteAttemptsPerRun) {
      counts.stoppedReason = "route_budget_exhausted";
    } else if (counts.providerCalls >= refreshBudget.maxProviderCallsPerRun) {
      counts.stoppedReason = "provider_budget_exhausted";
    }
  }

  const unattemptedRoutes = Math.max(
    0,
    refreshRoutes.length - counts.routeAttempts,
  );
  if (counts.stoppedReason !== "completed" || providerIncidentDetected) {
    counts.skipped += unattemptedRoutes;
    for (const route of prioritizedRoutes.slice(counts.routeAttempts)) {
      counts.skippedByMarket[route.market] =
        (counts.skippedByMarket[route.market] ?? 0) + 1;
    }
  }

  updateRefreshMarketFreshMetadata(counts, allCandidateRoutes, freshRouteIds);
  updateRefreshMarketTargetMetadata(
    counts,
    allCandidateRoutes,
    freshRouteIds,
    refreshBudget,
  );

  if (counts.stoppedReason === "completed" && counts.underfilledMarkets.length) {
    counts.stoppedReason = counts.unavailable > 0
      ? "provider_unavailable_no_offers"
      : "candidate_pool_exhausted";
    updateRefreshMarketTargetMetadata(
      counts,
      allCandidateRoutes,
      freshRouteIds,
      refreshBudget,
    );
  }
  updateHomepageFareUnderfillExecutionMetadata(counts);

  return counts;
}


function getHomepageFareRefreshBudgetStopReason(
  counts: HomepageFareRefreshCounts,
  refreshBudget: HomepageFareRefreshBudget,
): HomepageFareRefreshStoppedReason | undefined {
  if (counts.routeAttempts >= refreshBudget.maxRouteAttemptsPerRun) {
    return "route_budget_exhausted";
  }

  if (counts.providerCalls >= refreshBudget.maxProviderCallsPerRun) {
    return "provider_budget_exhausted";
  }

  return undefined;
}

async function executeHomepageFareRefreshRoute({
  route,
  departureDate,
  counts,
  snapshotsByRouteId,
  refreshBudget,
  attemptedRouteIds,
}: {
  route: HomepageRefreshRoute;
  departureDate: string;
  counts: HomepageFareRefreshCounts;
  snapshotsByRouteId: Map<string, HomepageFareSnapshotRecord>;
  refreshBudget: HomepageFareRefreshBudget;
  attemptedRouteIds: Set<string>;
}): Promise<HomepageFareRefreshRouteResult> {
  if (attemptedRouteIds.has(route.id)) return "skipped";
  attemptedRouteIds.add(route.id);

  if (
    (counts.routeAttemptsByMarket[route.market] ?? 0) >=
    refreshBudget.maxRouteAttemptsPerMarket
  ) {
    counts.skipped += 1;
    counts.skippedByMarket[route.market] =
      (counts.skippedByMarket[route.market] ?? 0) + 1;
    return "skipped";
  }

  counts.routeAttempts += 1;
  counts.marketRoutesAttempted[route.market] =
    (counts.marketRoutesAttempted[route.market] ?? 0) + 1;
  counts.routeAttemptsByMarket[route.market] =
    (counts.routeAttemptsByMarket[route.market] ?? 0) + 1;

  const result = await refreshHomepageFareRoute({
    route,
    departureDate,
    counts,
    existingSnapshot: snapshotsByRouteId.get(route.id),
    refreshBudget,
  });

  if (result === "skipped") {
    counts.skippedByMarket[route.market] =
      (counts.skippedByMarket[route.market] ?? 0) + 1;
  }

  return result;
}

function recordHomepageFareVisibleGapAttempt(
  counts: HomepageFareRefreshCounts,
  route: HomepageRefreshRoute,
  result: HomepageFareRefreshRouteResult,
  replacementForRouteId?: string,
) {
  if (route.visibility !== "visible" && route.visibility !== "backup" && route.visibility !== "fallback") {
    return;
  }

  counts.visibleGapsAttempted.push({
    market: route.market,
    routeId: route.id,
    origin: route.origin,
    destination: route.destination,
    section: route.isPopular
      ? "popular"
      : route.visibility === "backup"
        ? "backup"
        : route.visibility === "fallback"
          ? "fallback"
          : "discovery",
    result,
    ...(replacementForRouteId ? { replacementForRouteId } : {}),
  });
}

function shouldAttemptHomepageFareReplacement(
  result: HomepageFareRefreshRouteResult,
) {
  return result === "failed" || result === "unavailable" || result === "provider_incident";
}

function getHomepageFareReplacementCandidates({
  failedRoute,
  routes,
  snapshotsByRouteId,
  freshRouteIds,
  attemptedRouteIds,
  marketTargets,
  now,
}: {
  failedRoute: HomepageRefreshRoute;
  routes: HomepageRefreshRoute[];
  snapshotsByRouteId: Map<string, HomepageFareSnapshotRecord>;
  freshRouteIds: Set<string>;
  attemptedRouteIds: Set<string>;
  marketTargets: Record<string, HomepageFareMarketTarget>;
  now: Date;
}) {
  const compatibleMarkets = getHomepageFareCompatibleReplacementMarkets(
    failedRoute.market,
  );

  return routes
    .filter((route) => {
      if (route.id === failedRoute.id) return false;
      if (attemptedRouteIds.has(route.id)) return false;
      if (freshRouteIds.has(route.id)) return false;
      if (!compatibleMarkets.has(route.market)) return false;
      if (isRefreshCooldownSnapshot(snapshotsByRouteId.get(route.id), now)) {
        return false;
      }

      return !marketTargets[failedRoute.market]?.targetMet;
    })
    .map((route) => ({
      route,
      score:
        getHomepageFareReplacementMarketDistance(failedRoute.market, route.market) * 100 +
        (hasSuccessfulActiveHomepageFareHistory(snapshotsByRouteId.get(route.id)) ? 0 : 20) +
        (route.visibility === failedRoute.visibility ? 0 : route.visibility === "visible" ? 1 : 8) +
        getHomepageFareRefreshPriorityScore({
          route,
          snapshot: snapshotsByRouteId.get(route.id),
          target: marketTargets[route.market] ?? marketTargets[failedRoute.market],
          now,
        }),
    }))
    .sort(
      (first, second) =>
        first.score - second.score || first.route.priority - second.route.priority,
    )
    .map(({ route }) => route);
}

const HOMEPAGE_FARE_REPLACEMENT_REGIONAL_MARKETS: Record<string, string> = {
  NG: "AFRICA",
  KE: "AFRICA",
  ZA: "AFRICA",
  GB: "EUROPE",
  DE: "EUROPE",
  AE: "MIDDLE_EAST",
  JP: "ASIA",
  BR: "LATIN_AMERICA",
};

function getHomepageFareCompatibleReplacementMarkets(market: string) {
  const compatible = new Set([market]);
  const regionalMarket = HOMEPAGE_FARE_REPLACEMENT_REGIONAL_MARKETS[market];

  if (regionalMarket) compatible.add(regionalMarket);
  if (market === "GLOBAL") compatible.add("GLOBAL");

  return compatible;
}

function getHomepageFareReplacementMarketDistance(
  primaryMarket: string,
  candidateMarket: string,
) {
  if (primaryMarket === candidateMarket) return 0;
  return getHomepageFareCompatibleReplacementMarkets(primaryMarket).has(candidateMarket)
    ? 1
    : 99;
}

function compareHomepageFareMarketTargetsForExecution(
  first: HomepageFareMarketTarget,
  second: HomepageFareMarketTarget,
) {
  return (
    Number(first.targetMet) - Number(second.targetMet) ||
    second.missingCount - first.missingCount ||
    first.marketCode.localeCompare(second.marketCode)
  );
}

type HomepageFareRefreshRouteResult =
  | "refreshed"
  | "unavailable"
  | "failed"
  | "retained"
  | "skipped"
  | "provider_incident";

async function refreshHomepageFareRoute({
  route,
  departureDate,
  counts,
  existingSnapshot,
  refreshBudget,
}: {
  route: HomepageRefreshRoute;
  departureDate: string;
  counts: HomepageFareRefreshCounts;
  existingSnapshot?: HomepageFareSnapshotRecord;
  refreshBudget: HomepageFareRefreshBudget;
}): Promise<HomepageFareRefreshRouteResult> {
  const { origin, destination } = route;
  const now = new Date();
  const existingFresh = isFreshHomepageFareSnapshotRecord({
    snapshot: existingSnapshot,
    now,
    currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
  });
  const existingLastKnownGood = isLastKnownGoodHomepageFareSnapshotRecord({
    snapshot: existingSnapshot,
    now,
    currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
    ttlHours: refreshBudget.lastKnownGoodTtlHours,
  });
  const existingUsable = existingFresh || existingLastKnownGood;

  if (isSameHomepageFareRoute(origin, destination)) {
    counts.skipped += 1;
    return "skipped";
  }

  try {
    const dateCandidates = buildHomepageFareDepartureDateCandidates(
      departureDate,
    ).slice(0, refreshBudget.maxDateCandidatesPerRoute);
    let terminalResult:
      | {
          status: HomepageFareSnapshotStatus;
          reason: SafeHomepageFareErrorReason;
          provider: string;
        }
      | undefined;

    for (const candidateDepartureDate of dateCandidates) {
      if (counts.providerCalls >= refreshBudget.maxProviderCallsPerRun) break;

      const search = buildHomepageFareSearch({
        origin,
        destination,
        departureDate: candidateDepartureDate,
        currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
      });
      const providerSearch: FlightSearchParams = {
        ...search,
        sort: "cheapest",
      };
      counts.providerCalls += 1;
      counts.providerCallsByMarket[route.market] =
        (counts.providerCallsByMarket[route.market] ?? 0) + 1;
      const providerResult = await searchDuffelFlights(providerSearch);
      const result = selectProviderFare(providerResult.results, search.currency);
      const provider = providerResult.provider || PROVIDER_NAME;

      if (
        providerResult.status === "success" &&
        !providerResult.error &&
        result
      ) {
        await upsertActiveHomepageFareSnapshot({
          origin,
          destination,
          snapshotKeyDepartureDate: departureDate,
          departureDate: search.departureDate,
          currency: search.currency,
          provider,
          result,
          ...(search.departureDate !== departureDate
            ? {
                dateFallbackUsed: true,
                primaryDepartureDate: departureDate,
                actualProviderDepartureDate: search.departureDate,
              }
            : {}),
        });
        counts.refreshed += 1;
        return "refreshed";
      }

      const classification = classifyHomepageFareAttemptTerminalResult(
        providerResult,
        Boolean(result),
      );

      if (isProviderWideHomepageFareIncident(classification.reason)) {
        terminalResult = { ...classification, provider };
        break;
      }

      if (
        !terminalResult ||
        (terminalResult.status !== HomepageFareSnapshotStatus.UNAVAILABLE &&
          classification.status === HomepageFareSnapshotStatus.UNAVAILABLE)
      ) {
        terminalResult = {
          ...classification,
          provider,
        };
      }
    }

    if (terminalResult?.status === HomepageFareSnapshotStatus.UNAVAILABLE) {
      if (existingUsable) {
        counts.retained += 1;
        return "retained";
      }

      await upsertUnavailableHomepageFareSnapshot({
        origin,
        destination,
        departureDate,
        currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
        provider: terminalResult.provider,
        reason: terminalResult.reason,
      });
      counts.unavailable += 1;
      counts.unavailableByMarket[route.market] =
        (counts.unavailableByMarket[route.market] ?? 0) + 1;
      return "unavailable";
    }

    if (existingUsable) {
      counts.retained += 1;
      return terminalResult && isProviderWideHomepageFareIncident(terminalResult.reason)
        ? "provider_incident"
        : "retained";
    }

    await upsertFailedHomepageFareSnapshot({
      origin,
      destination,
      departureDate,
      currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
      provider: terminalResult?.provider || PROVIDER_NAME,
      reason: terminalResult?.reason || "provider_failed",
    });
    counts.failed += 1;
    counts.failedByMarket[route.market] =
      (counts.failedByMarket[route.market] ?? 0) + 1;
    if (terminalResult?.reason === "provider_timeout") {
      counts.timeoutByMarket[route.market] =
        (counts.timeoutByMarket[route.market] ?? 0) + 1;
    }

    return terminalResult && isProviderWideHomepageFareIncident(terminalResult.reason)
      ? "provider_incident"
      : "failed";
  } catch {
    if (existingUsable) {
      counts.retained += 1;
      return "retained";
    }

    try {
      await upsertFailedHomepageFareSnapshot({
        origin,
        destination,
        departureDate,
        currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
        provider: PROVIDER_NAME,
        reason: "refresh_error",
      });
    } catch {
      // Avoid returning provider or credential details from refresh endpoints.
    }

    counts.failed += 1;
    counts.failedByMarket[route.market] =
      (counts.failedByMarket[route.market] ?? 0) + 1;
    return "failed";
  }
}

type HomepageFareProviderFailureClassification = {
  status: HomepageFareSnapshotStatus;
  reason:
    | "provider_no_inventory"
    | "provider_route_unavailable"
    | "provider_timeout"
    | "provider_network_error"
    | "provider_auth_error"
    | "provider_server_error"
    | "provider_invalid_response"
    | "provider_failed";
};

export function classifyHomepageFareProviderFailure(
  providerResult: ProviderResult<NormalizedFlightResult>,
): HomepageFareProviderFailureClassification {
  if (providerResult.errorReason === "provider_no_inventory") {
    return {
      status: HomepageFareSnapshotStatus.UNAVAILABLE,
      reason: "provider_no_inventory",
    };
  }

  if (providerResult.errorReason === "provider_route_unavailable") {
    return {
      status: HomepageFareSnapshotStatus.UNAVAILABLE,
      reason: "provider_route_unavailable",
    };
  }

  if (providerResult.errorReason === "provider_timeout") {
    return {
      status: HomepageFareSnapshotStatus.FAILED,
      reason: "provider_timeout",
    };
  }

  if (providerResult.errorReason === "provider_network_error") {
    return {
      status: HomepageFareSnapshotStatus.FAILED,
      reason: "provider_network_error",
    };
  }

  if (providerResult.errorReason === "provider_auth_error") {
    return {
      status: HomepageFareSnapshotStatus.FAILED,
      reason: "provider_auth_error",
    };
  }

  if (providerResult.errorReason === "provider_server_error") {
    return {
      status: HomepageFareSnapshotStatus.FAILED,
      reason: "provider_server_error",
    };
  }

  if (providerResult.errorReason === "provider_invalid_response") {
    return {
      status: HomepageFareSnapshotStatus.FAILED,
      reason: "provider_invalid_response",
    };
  }

  return {
    status: HomepageFareSnapshotStatus.FAILED,
    reason: "provider_failed",
  };
}

function getRefreshRoutes(
  scope: HomepageFareRefreshScope,
): HomepageRefreshRoute[] {
  const routes = getAllHomepageFareRefreshRoutes().filter((route) => {
    if (scope === "all-phase-3a") return true;
    if (scope === "popular") return route.isPopular;
    if (scope === "discover" || scope === "discover-default") {
      return route.isDiscover;
    }
    if (scope === "discover-first-6") {
      return (
        route.isDiscover &&
        route.visibility === "visible" &&
        route.priority <= 6
      );
    }

    return false;
  });

  return dedupeRefreshRoutes(routes);
}

function dedupeRefreshRoutes(routes: HomepageRefreshRoute[]) {
  const seen = new Set<string>();
  const deduped: HomepageRefreshRoute[] = [];

  for (const route of routes) {
    const key = `${route.origin}:${route.destination}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(route);
  }

  return deduped;
}

function getHomepageFareSmartRefreshBudget(): HomepageFareRefreshBudget {
  return {
    popularVisibleTarget: readHomepageFareIntegerEnv(
      "HOMEPAGE_FARE_TARGET_POPULAR",
      HOMEPAGE_FARE_SMART_REFRESH_DEFAULTS.popularVisibleTarget,
      1,
      48,
    ),
    discoverVisibleTarget: readHomepageFareIntegerEnv(
      "HOMEPAGE_FARE_TARGET_DISCOVERY",
      HOMEPAGE_FARE_SMART_REFRESH_DEFAULTS.discoverVisibleTarget,
      1,
      48,
    ),
    discoverBackupFreshTarget: readHomepageFareIntegerEnv(
      "HOMEPAGE_FARE_TARGET_BACKUP",
      HOMEPAGE_FARE_SMART_REFRESH_DEFAULTS.discoverBackupFreshTarget,
      0,
      48,
    ),
    maxRouteAttemptsPerRun: readHomepageFareIntegerEnv(
      "HOMEPAGE_FARE_MAX_ATTEMPTS_PER_RUN",
      HOMEPAGE_FARE_SMART_REFRESH_DEFAULTS.maxRouteAttemptsPerRun,
      1,
      1000,
    ),
    maxProviderCallsPerRun: readHomepageFareIntegerEnv(
      "HOMEPAGE_FARE_MAX_PROVIDER_CALLS_PER_RUN",
      HOMEPAGE_FARE_SMART_REFRESH_DEFAULTS.maxProviderCallsPerRun,
      1,
      1000,
    ),
    maxRouteAttemptsPerMarket: readHomepageFareIntegerEnv(
      "HOMEPAGE_FARE_MAX_ATTEMPTS_PER_MARKET",
      HOMEPAGE_FARE_SMART_REFRESH_DEFAULTS.maxRouteAttemptsPerMarket,
      1,
      200,
    ),
    maxDateCandidatesPerRoute: readHomepageFareIntegerEnv(
      "HOMEPAGE_FARE_MAX_DATE_CANDIDATES_PER_ROUTE",
      HOMEPAGE_FARE_SMART_REFRESH_DEFAULTS.maxDateCandidatesPerRoute,
      1,
      5,
    ),
    lastKnownGoodTtlHours: readHomepageFareIntegerEnv(
      "HOMEPAGE_FARE_LAST_KNOWN_GOOD_TTL_HOURS",
      HOMEPAGE_FARE_SMART_REFRESH_DEFAULTS.lastKnownGoodTtlHours,
      1,
      24 * 30,
    ),
  };
}

function readHomepageFareIntegerEnv(
  name: string,
  fallback: number,
  min: number,
  max: number,
) {
  const value = Number(process.env[name]);

  if (!Number.isFinite(value)) return fallback;

  return Math.min(max, Math.max(min, Math.floor(value)));
}

function computeHomepageFareRefreshReadiness(
  routes: HomepageRefreshRoute[],
  freshRouteIds: Set<string>,
  budget: HomepageFareRefreshBudget,
): HomepageFareRefreshReadiness {
  const freshPopular = routes.filter(
    (route) => route.isPopular && freshRouteIds.has(route.id),
  ).length;
  const freshDiscover = routes.filter(
    (route) => route.isDiscover && freshRouteIds.has(route.id),
  ).length;
  const publicFreshTarget =
    budget.popularVisibleTarget + budget.discoverVisibleTarget;

  return {
    freshPopular,
    freshDiscover,
    freshDiscoverDisplayed: Math.min(freshDiscover, budget.discoverVisibleTarget),
    freshDiscoverBackup: Math.max(0, freshDiscover - budget.discoverVisibleTarget),
    publicFreshTarget,
    operationalFreshTarget: publicFreshTarget + budget.discoverBackupFreshTarget,
  };
}

function hasMetHomepageFareOperationalTarget(
  routes: HomepageRefreshRoute[],
  freshRouteIds: Set<string>,
  budget: HomepageFareRefreshBudget,
) {
  return HOMEPAGE_FARE_REFRESH_MARKETS.every((market) => {
    const targets = computeHomepageFareMarketTargets(
      routes,
      freshRouteIds,
      budget,
    )[market];

    return targets?.targetMet === true;
  });
}

function prioritizeHomepageFareRefreshRoutes({
  routes,
  snapshotsByRouteId,
  freshRouteIds,
  marketTargets,
  now,
}: {
  routes: HomepageRefreshRoute[];
  snapshotsByRouteId: Map<string, HomepageFareSnapshotRecord>;
  freshRouteIds: Set<string>;
  marketTargets: Record<string, HomepageFareMarketTarget>;
  now: Date;
}) {
  const hasUnderfilledMarkets = Object.values(marketTargets).some(
    (target) => !target.targetMet,
  );
  const scoredRoutes = [...routes]
    .filter((route) => {
      const snapshot = snapshotsByRouteId.get(route.id);

      if (isRefreshCooldownSnapshot(snapshot, now)) return false;

      if (hasUnderfilledMarkets && marketTargets[route.market]?.targetMet) {
        return false;
      }

      return !freshRouteIds.has(route.id) || isNearExpirySnapshot(snapshot, now);
    })
    .map((route) => ({
      route,
      score: getHomepageFareRefreshPriorityScore({
        route,
        snapshot: snapshotsByRouteId.get(route.id),
        target: marketTargets[route.market],
        now,
      }),
    }))
    .sort(
      (first, second) =>
        first.score - second.score ||
        (marketTargets[second.route.market]?.missingCount ?? 0) -
          (marketTargets[first.route.market]?.missingCount ?? 0) ||
        first.route.priority - second.route.priority,
    );

  const routesByScore = new Map<number, HomepageRefreshRoute[]>();

  for (const { route, score } of scoredRoutes) {
    routesByScore.set(score, [...(routesByScore.get(score) ?? []), route]);
  }

  return [...routesByScore.entries()]
    .sort(([firstScore], [secondScore]) => firstScore - secondScore)
    .flatMap(([, sameScoreRoutes]) =>
      roundRobinHomepageFareRoutesByMarket(sameScoreRoutes, marketTargets),
    );
}

function roundRobinHomepageFareRoutesByMarket(
  routes: HomepageRefreshRoute[],
  marketTargets: Record<string, HomepageFareMarketTarget> = {},
) {
  const routesByMarket = new Map<string, HomepageRefreshRoute[]>();

  for (const route of routes) {
    routesByMarket.set(route.market, [
      ...(routesByMarket.get(route.market) ?? []),
      route,
    ]);
  }

  const orderedRoutes: HomepageRefreshRoute[] = [];
  let appendedRoute = true;

  while (appendedRoute) {
    appendedRoute = false;

    const marketsByMissingCoverage = [...HOMEPAGE_FARE_REFRESH_MARKETS].sort(
      (first, second) =>
        (marketTargets[second]?.missingCount ?? 0) -
          (marketTargets[first]?.missingCount ?? 0) ||
        first.localeCompare(second),
    );

    for (const market of marketsByMissingCoverage) {
      const marketRoutes = routesByMarket.get(market);
      const route = marketRoutes?.shift();

      if (!route) continue;

      orderedRoutes.push(route);
      appendedRoute = true;
    }
  }

  return orderedRoutes;
}

function getHomepageFareRefreshPriorityScore({
  route,
  snapshot,
  target,
  now,
}: {
  route: HomepageRefreshRoute;
  snapshot?: HomepageFareSnapshotRecord;
  target?: HomepageFareMarketTarget;
  now: Date;
}) {
  const isFresh = isFreshHomepageFareSnapshotRecord({
    snapshot,
    now,
    currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
  });
  const status = getSnapshotPriorityStatus(snapshot, now);

  if (!target?.targetMet && route.isPopular && route.visibility === "visible" && !isFresh) return 0;
  if (!target?.targetMet && route.isDiscover && route.visibility === "visible" && !isFresh) return 1;
  if (!target?.targetMet && route.visibility === "backup" && !isFresh) return 2;
  if (target?.targetMet) return 8;
  if (route.isPopular && route.visibility === "visible" && !isFresh) return 0;
  if (route.isDiscover && hasSuccessfulActiveHomepageFareHistory(snapshot)) {
    return status === "failed" ? 4 : 1;
  }
  if (route.isDiscover && route.visibility === "visible") return 2;
  if (status === "unavailable") return 3;
  if (status === "failed") return 4;
  if (route.visibility === "backup" || route.visibility === "fallback") return 5;
  if (route.isPopular) return 6;

  return 7;
}

function getSnapshotPriorityStatus(
  snapshot: HomepageFareSnapshotRecord | undefined,
  now: Date,
): HomepageFareSnapshotStatusValue {
  if (!snapshot) return "missing";

  return getOperationalSnapshotStatus({
    snapshotStatus: snapshot.status,
    isExpired: snapshot.expiresAt.getTime() <= now.getTime(),
    isFresh: isFreshHomepageFareSnapshotRecord({
      snapshot,
      now,
      currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
    }),
  });
}

function hasSuccessfulActiveHomepageFareHistory(
  snapshot: HomepageFareSnapshotRecord | undefined,
) {
  return (
    snapshot?.providerBacked === true &&
    snapshot.status === HomepageFareSnapshotStatus.ACTIVE
  );
}

function isRefreshCooldownSnapshot(
  snapshot: HomepageFareSnapshotRecord | undefined,
  now: Date,
) {
  return Boolean(
    snapshot &&
      (snapshot.status === HomepageFareSnapshotStatus.UNAVAILABLE ||
        snapshot.status === HomepageFareSnapshotStatus.FAILED) &&
      snapshot.expiresAt.getTime() > now.getTime(),
  );
}

function isNearExpirySnapshot(
  snapshot: HomepageFareSnapshotRecord | undefined,
  now: Date,
) {
  return Boolean(
    snapshot &&
      snapshot.status === HomepageFareSnapshotStatus.ACTIVE &&
      snapshot.expiresAt.getTime() - now.getTime() <= NEAR_EXPIRY_REFRESH_WINDOW_MS,
  );
}

function isProviderWideHomepageFareIncident(reason: SafeHomepageFareErrorReason) {
  return reason === "provider_auth_error" || reason === "provider_server_error";
}

function classifyHomepageFareAttemptTerminalResult(
  providerResult: ProviderResult<NormalizedFlightResult>,
  hasProviderFare: boolean,
): {
  status: HomepageFareSnapshotStatus;
  reason: SafeHomepageFareErrorReason;
} {
  if (providerResult.status === "failed") {
    return classifyHomepageFareProviderFailure(providerResult);
  }

  if (hasProviderFare) {
    return {
      status: HomepageFareSnapshotStatus.FAILED,
      reason: "provider_failed",
    };
  }

  return {
    status: HomepageFareSnapshotStatus.UNAVAILABLE,
    reason:
      providerResult.status === "skipped"
        ? "provider_skipped"
        : "no_fare_returned",
  };
}

function selectProviderFare(
  results: NormalizedFlightResult[],
  currency: string,
): NormalizedFlightResult | undefined {
  return results
    .filter(
      (result) =>
        result.currency?.toUpperCase() === currency &&
        Number.isFinite(result.price) &&
        result.price > 0,
    )
    .sort((first, second) => first.price - second.price)[0];
}

async function readHomepageFareSnapshotsForRoutes({
  routes,
  departureDate,
  currency,
}: {
  routes: HomepageFareRoute[];
  departureDate: string;
  currency: string;
}) {
  const snapshotsByRouteId = new Map<string, HomepageFareSnapshotRecord>();
  const db = getOptionalPrisma();

  if (!db || !routes.length) return snapshotsByRouteId;

  const snapshotKeyByRouteId = new Map(
    routes.map((route) => [
      route.id,
      buildHomepageFareSnapshotKey({
        origin: route.origin,
        destination: route.destination,
        departureDate,
        currency,
      }),
    ]),
  );
  const routeIdBySnapshotKey = new Map(
    [...snapshotKeyByRouteId.entries()].map(([routeId, snapshotKey]) => [
      snapshotKey,
      routeId,
    ]),
  );

  try {
    const snapshots = await db.homepageFareSnapshot.findMany({
      where: {
        snapshotKey: { in: [...snapshotKeyByRouteId.values()] },
      },
      select: {
        snapshotKey: true,
        origin: true,
        destination: true,
        currency: true,
        price: true,
        providerBacked: true,
        searchedAt: true,
        expiresAt: true,
        status: true,
        payload: true,
      },
    });

    for (const snapshot of snapshots) {
      const routeId = routeIdBySnapshotKey.get(snapshot.snapshotKey);
      if (routeId) snapshotsByRouteId.set(routeId, snapshot);
    }
  } catch (error) {
    console.error("[homepage-fare-snapshots:read-refresh-status]", error);
  }

  return snapshotsByRouteId;
}

function isFreshHomepageFareSnapshotRecord({
  snapshot,
  now,
  currency,
}: {
  snapshot?: HomepageFareSnapshotRecord;
  now: Date;
  currency: string;
}) {
  const price = readFinitePrice(snapshot?.price);

  return Boolean(
    snapshot &&
      snapshot.providerBacked === true &&
      snapshot.status === HomepageFareSnapshotStatus.ACTIVE &&
      snapshot.expiresAt.getTime() > now.getTime() &&
      price &&
      normalizeHomepageFareCurrency(snapshot.currency) === currency,
  );
}


function isLastKnownGoodHomepageFareSnapshotRecord({
  snapshot,
  now,
  currency,
  ttlHours = getHomepageFareSmartRefreshBudget().lastKnownGoodTtlHours,
}: {
  snapshot?: HomepageFareSnapshotRecord;
  now: Date;
  currency: string;
  ttlHours?: number;
}) {
  const price = readFinitePrice(snapshot?.price);
  const maxAgeMs = ttlHours * 60 * 60 * 1000;

  return Boolean(
    snapshot &&
      snapshot.providerBacked === true &&
      snapshot.status === HomepageFareSnapshotStatus.ACTIVE &&
      snapshot.expiresAt.getTime() <= now.getTime() &&
      now.getTime() - snapshot.searchedAt.getTime() <= maxAgeMs &&
      price &&
      normalizeHomepageFareCurrency(snapshot.currency) === currency,
  );
}

function isUsableHomepageFareSnapshotRecord({
  snapshot,
  now,
  currency,
}: {
  snapshot?: HomepageFareSnapshotRecord;
  now: Date;
  currency: string;
}) {
  return (
    isFreshHomepageFareSnapshotRecord({ snapshot, now, currency }) ||
    isLastKnownGoodHomepageFareSnapshotRecord({ snapshot, now, currency })
  );
}

export async function readHomepageFareSnapshotResponseEntries({
  routes,
  departureDate,
  currency = DEFAULT_CURRENCY,
}: {
  routes: HomepageFareRoute[];
  departureDate: string;
  currency?: string;
}): Promise<HomepageFareSnapshotResponseEntry[]> {
  const now = new Date();
  const normalizedCurrency =
    normalizeHomepageFareCurrency(currency) ?? DEFAULT_CURRENCY;
  const eligibleRoutes = routes
    .map((route) => normalizeRoute(route))
    .filter((route): route is HomepageFareRoute => Boolean(route));

  if (!eligibleRoutes.length) return [];

  const snapshotKeys = eligibleRoutes.map((route) =>
    buildHomepageFareSnapshotKey({
      origin: route.origin,
      destination: route.destination,
      departureDate,
      currency: normalizedCurrency,
    }),
  );
  const db = getOptionalPrisma();
  const snapshotsByKey = new Map<string, unknown>();

  if (db) {
    try {
      const snapshots = await db.homepageFareSnapshot.findMany({
        where: {
          snapshotKey: { in: snapshotKeys },
        },
      });

      for (const snapshot of snapshots) {
        snapshotsByKey.set(snapshot.snapshotKey, snapshot);
      }
    } catch (error) {
      console.error("[homepage-fare-snapshots:read]", error);
    }
  }

  return eligibleRoutes.map((route) => {
    const snapshotKey = buildHomepageFareSnapshotKey({
      origin: route.origin,
      destination: route.destination,
      departureDate,
      currency: normalizedCurrency,
    });
    const snapshot = snapshotsByKey.get(snapshotKey) as
      | {
          origin: string;
          destination: string;
          tripType: string;
          departureDate: Date;
          returnDate: Date | null;
          cabinClass: string;
          travelers: number;
          currency: string;
          price: unknown;
          providerBacked: boolean;
          searchedAt: Date;
          expiresAt: Date;
          status: HomepageFareSnapshotStatus;
        }
      | undefined;

    return formatHomepageFareSnapshotResponseEntry({
      route,
      snapshot,
      now,
      currency: normalizedCurrency,
      departureDate,
    });
  });
}

export async function readHomepageDiscoveryFareCards({
  regionCode,
  limit = HOME_DISCOVERY_VISIBLE_CARD_COUNT,
  currency = DEFAULT_CURRENCY,
}: {
  regionCode: string;
  limit?: number;
  currency?: string;
}): Promise<HomepageDiscoveryFareCardsResponse> {
  const requested = Math.max(0, Math.min(Math.floor(limit), 48));
  const normalizedCurrency =
    normalizeHomepageFareCurrency(currency) ?? DEFAULT_CURRENCY;
  const requestedRegionCode = normalizeHomepageDiscoveryRegionCode(regionCode);
  const requestedCandidates = getHomeDiscoveryFareCandidates(requestedRegionCode);
  const isNonUsRegion = requestedRegionCode !== DEFAULT_HOME_DISCOVERY_REGION;

  if (requested <= 0) {
    return buildHomepageDiscoveryFareCardsResponse({
      cards: [],
      requested,
      requestedRegionCode,
      effectiveRegionCode: requestedRegionCode,
      candidateCount: requestedCandidates.length,
      fallbackUsed: false,
      fallbackReason: "none",
      fallbackScope: "none",
      usDomesticFallbackBlocked: isNonUsRegion,
      currencyRequested: normalizedCurrency,
      snapshotCurrency: normalizedCurrency,
    });
  }

  const regionalCandidates = getRegionalHomeDiscoveryFareCandidates(
    requestedRegionCode,
  );
  const shouldTryRegionalFallback =
    regionalCandidates.length > 0 &&
    !areSameCandidateSets(requestedCandidates, regionalCandidates);
  const globalCandidates = getMarketScopedGlobalHomeDiscoveryFareCandidates(
    requestedRegionCode,
  );
  const shouldTryGlobalFallback =
    globalCandidates.length > 0 &&
    !areSameCandidateSets(requestedCandidates, globalCandidates) &&
    (!regionalCandidates.length ||
      !areSameCandidateSets(regionalCandidates, globalCandidates));
  const candidatePool = dedupeHomepageDiscoveryFareCandidates([
    ...requestedCandidates,
    ...(shouldTryRegionalFallback ? regionalCandidates : []),
    ...(shouldTryGlobalFallback ? globalCandidates : []),
  ]);
  const pooledResult = await buildHomepageDiscoveryFareCardsForCandidates({
    candidates: candidatePool,
    requested,
    currency: normalizedCurrency,
  });
  const requestedFreshCount = pooledResult.cards.filter(
    (card) =>
      (card.priceState === "fresh" || card.priceState === "last_known_good") &&
      requestedCandidates.some((candidate) => candidate.id === card.item.id),
  ).length;
  const regionalFreshCount = pooledResult.cards.filter(
    (card) =>
      (card.priceState === "fresh" || card.priceState === "last_known_good") &&
      regionalCandidates.some((candidate) => candidate.id === card.item.id),
  ).length;
  const fallbackReason: HomepageDiscoveryFareFallbackReason =
    requestedCandidates.length
      ? "requested_region_no_fresh_fares"
      : "requested_region_no_candidates";
  const fallbackScope: HomepageDiscoveryFareFallbackScope =
    requestedFreshCount >= Math.min(requested, pooledResult.freshCount)
      ? "requested-region"
      : regionalFreshCount > 0
        ? "regional"
        : pooledResult.freshCount > 0
          ? "global-international"
          : "requested-region";
  const effectiveRegionCode =
    fallbackScope === "regional"
      ? getEffectiveRegionCodeForCandidates(regionalCandidates, requestedRegionCode)
      : fallbackScope === "global-international"
        ? GLOBAL_HOME_DISCOVERY_REGION
        : requestedRegionCode;

  return buildHomepageDiscoveryFareCardsResponse({
    ...pooledResult,
    requested,
    requestedRegionCode,
    effectiveRegionCode,
    fallbackUsed: fallbackScope !== "requested-region",
    fallbackReason:
      pooledResult.freshCount > 0
        ? fallbackScope === "global-international" && shouldTryRegionalFallback
          ? "regional_fallback_no_fresh_fares"
          : fallbackScope === "requested-region"
            ? "none"
            : fallbackReason
        : shouldTryGlobalFallback
          ? "global_fallback_no_fresh_fares"
          : fallbackReason,
    fallbackScope,
    usDomesticFallbackBlocked: isNonUsRegion,
    currencyRequested: normalizedCurrency,
    snapshotCurrency: normalizedCurrency,
  });
}

type HomepageDiscoveryFareCandidateBuildResult = {
  cards: HomepageDiscoveryFareCard[];
  candidateCount: number;
  freshCount: number;
};

async function buildHomepageDiscoveryFareCardsForCandidates({
  candidates,
  requested,
  currency,
}: {
  candidates: HomeDiscoveryFareCandidate[];
  requested: number;
  currency: string;
}): Promise<HomepageDiscoveryFareCandidateBuildResult> {
  if (!candidates.length) {
    return { cards: [], candidateCount: 0, freshCount: 0 };
  }

  const dateStrategy = getHomepageFareDateStrategy();
  const fares = await readHomepageFareSnapshotResponseEntries({
    routes: candidates.map((candidate) => ({
      id: candidate.id,
      label: candidate.title,
      origin: candidate.originCode,
      destination: candidate.destinationCode,
    })),
    departureDate: dateStrategy.departureDate,
    currency,
  });
  const faresById = new Map(fares.map((fare) => [fare.id, fare]));
  const freshCards: HomepageDiscoveryFareCard[] = [];
  const neutralCards: HomepageDiscoveryFareCard[] = [];

  for (const candidate of candidates) {
    const fare = faresById.get(candidate.id);
    const item = toPublicHomepageDiscoveryFareCardItem(candidate);

    if (isUsableHomepageDiscoveryFareForCandidate(candidate, fare)) {
      freshCards.push({
        item,
        fare: {
          price: fare.price,
          currency: fare.currency,
          providerBacked: true,
          searchedAt: fare.searchedAt,
          expiresAt: fare.expiresAt,
          search: fare.search,
          priceState: fare.priceState,
          cachedProviderBacked: fare.cachedProviderBacked,
        },
        priceState: fare.priceState === "last_known_good" ? "last_known_good" : "fresh",
      });
      continue;
    }

    neutralCards.push({
      item,
      priceState: "none",
    });
  }

  const cards = [...freshCards, ...neutralCards].slice(0, requested);

  return {
    cards,
    candidateCount: candidates.length,
    freshCount: cards.filter((card) => card.priceState === "fresh" || card.priceState === "last_known_good").length,
  };
}

function dedupeHomepageDiscoveryFareCandidates(
  candidates: HomeDiscoveryFareCandidate[],
) {
  const seen = new Set<string>();
  const deduped: HomeDiscoveryFareCandidate[] = [];

  for (const candidate of candidates) {
    const key = getHomepageDiscoveryCandidateRouteKey(candidate);

    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function areSameCandidateSets(
  firstCandidates: HomeDiscoveryFareCandidate[],
  secondCandidates: HomeDiscoveryFareCandidate[],
) {
  if (firstCandidates.length !== secondCandidates.length) return false;

  const secondRouteKeys = new Set(
    secondCandidates.map((candidate) =>
      getHomepageDiscoveryCandidateRouteKey(candidate),
    ),
  );

  return firstCandidates.every((candidate) =>
    secondRouteKeys.has(getHomepageDiscoveryCandidateRouteKey(candidate)),
  );
}

function getHomepageDiscoveryCandidateRouteKey(
  candidate: HomeDiscoveryFareCandidate,
) {
  return `${candidate.id}:${normalizeHomepageFareCode(candidate.originCode) ?? candidate.originCode}:${normalizeHomepageFareCode(candidate.destinationCode) ?? candidate.destinationCode}`;
}

function buildHomepageDiscoveryFareCardsResponse({
  cards,
  requested,
  requestedRegionCode,
  effectiveRegionCode,
  candidateCount,
  fallbackUsed,
  fallbackReason,
  fallbackScope,
  usDomesticFallbackBlocked,
  currencyRequested,
  snapshotCurrency,
}: Pick<HomepageDiscoveryFareCandidateBuildResult, "cards" | "candidateCount"> & {
  requested: number;
  requestedRegionCode: string;
  effectiveRegionCode: string;
  fallbackUsed: boolean;
  fallbackReason: HomepageDiscoveryFareFallbackReason;
  fallbackScope: HomepageDiscoveryFareFallbackScope;
  usDomesticFallbackBlocked: boolean;
  currencyRequested: string;
  snapshotCurrency: string;
}): HomepageDiscoveryFareCardsResponse {
  const freshCount = cards.filter(
    (card) => card.priceState === "fresh" || card.priceState === "last_known_good",
  ).length;
  const neutralCount = cards.length - freshCount;

  const fallbackLevel = getHomepageDiscoveryFallbackLevel(fallbackScope);

  return {
    cards,
    summary: {
      requested,
      fresh: freshCount,
      neutral: neutralCount,
    },
    metadata: {
      requestedRegionCode,
      effectiveRegionCode,
      effectiveMarketCode: effectiveRegionCode,
      fallbackLevel,
      discoveryMarket: effectiveRegionCode,
      candidateCount,
      freshCount,
      neutralCount,
      fallbackUsed,
      fallbackReason,
      fallbackScope,
      usDomesticFallbackBlocked,
      currencyRequested,
      snapshotCurrency,
    },
  };
}

function getEffectiveRegionCodeForCandidates(
  candidates: HomeDiscoveryFareCandidate[],
  fallbackRegionCode: string,
) {
  return candidates[0]?.regionCode ?? fallbackRegionCode;
}

function getHomepageDiscoveryFallbackLevel(
  fallbackScope: HomepageDiscoveryFareFallbackScope,
): "exact-country" | "regional" | "global" | "neutral" {
  if (fallbackScope === "requested-region") return "exact-country";
  if (fallbackScope === "regional") return "regional";
  if (fallbackScope === "global-international") return "global";

  return "neutral";
}

function getMarketScopedGlobalHomeDiscoveryFareCandidates(regionCode: string) {
  return regionCode === GLOBAL_HOME_DISCOVERY_REGION
    ? getGlobalHomeDiscoveryFareCandidates()
    : [];
}

function normalizeHomepageDiscoveryRegionCode(regionCode: string) {
  const normalized = regionCode.trim().toUpperCase();

  return /^[A-Z_]{2,20}$/.test(normalized)
    ? normalized
    : DEFAULT_HOME_DISCOVERY_REGION;
}

function isUsableHomepageDiscoveryFareForCandidate(
  candidate: HomeDiscoveryFareCandidate,
  fare: HomepageFareSnapshotResponseEntry | undefined,
): fare is HomepageFareSnapshotResponseEntry & {
  price: number;
  currency: string;
  providerBacked: true;
  expiresAt: string;
  search: HomepageFareSearch;
} {
  return (
    isUsableHomepageFareSnapshotResponseEntry(fare) &&
    normalizeHomepageFareCode(fare.search.origin) === normalizeHomepageFareCode(candidate.originCode) &&
    normalizeHomepageFareCode(fare.search.destination) === normalizeHomepageFareCode(candidate.destinationCode) &&
    normalizeHomepageFareCurrency(fare.search.currency) === normalizeHomepageFareCurrency(fare.currency)
  );
}

function toPublicHomepageDiscoveryFareCardItem(
  candidate: HomeDiscoveryFareCandidate,
): HomepageDiscoveryFareCardItem {
  return {
    id: candidate.id,
    title: candidate.title,
    originCity: candidate.originCity,
    originCode: candidate.originCode,
    destinationCity: candidate.destinationCity,
    destinationCode: candidate.destinationCode,
    routeNote: candidate.routeNote,
    image: candidate.image,
    imageAlt: candidate.imageAlt,
  };
}

function isUsableHomepageFareSnapshotResponseEntry(
  fare: HomepageFareSnapshotResponseEntry | undefined,
): fare is HomepageFareSnapshotResponseEntry & {
  price: number;
  currency: string;
  providerBacked: true;
  expiresAt: string;
  search: HomepageFareSearch;
} {
  return (
    fare?.providerBacked === true &&
    typeof fare.price === "number" &&
    Number.isFinite(fare.price) &&
    fare.price > 0 &&
    Boolean(fare.currency) &&
    Boolean(fare.expiresAt) &&
    Boolean(fare.search)
  );
}

export async function readHomepageFareSnapshotStatus({
  routes = getAllHomepageFareRefreshRoutes(),
  departureDate = getHomepageFareDateStrategy().departureDate,
  currency = DEFAULT_CURRENCY,
  now = new Date(),
}: {
  routes?: HomepageFareRoute[];
  departureDate?: string;
  currency?: string;
  now?: Date;
} = {}): Promise<HomepageFareSnapshotStatusResponse> {
  const normalizedCurrency =
    normalizeHomepageFareCurrency(currency) ?? DEFAULT_CURRENCY;
  const eligibleRoutes = routes
    .map((route) => normalizeRoute(route))
    .filter((route): route is HomepageFareRoute => Boolean(route));
  const summary = createEmptyHomepageFareSnapshotStatusSummary();

  if (!eligibleRoutes.length) {
    const refreshBudget = getHomepageFareSmartRefreshBudget();
    const marketTargets = computeHomepageFareMarketTargets(
      [],
      new Set(),
      refreshBudget,
    );
    const displayReadiness = classifyHomepageFareDisplayReadiness(
      [],
      refreshBudget,
      marketTargets,
    );

    return {
      routes: [],
      summary,
      health: displayReadiness,
      displayReadiness,
      candidatePoolHealth: summary,
      refreshBudget,
      globalReadinessStatus: displayReadiness.globalReadinessStatus,
      requiredMarkets: [...HOMEPAGE_FARE_REFRESH_MARKETS],
      marketTargets,
      marketTargetMet: Object.fromEntries(
        Object.entries(marketTargets).map(([market, target]) => [
          market,
          target.targetMet,
        ]),
      ),
      underfilledMarkets: Object.entries(marketTargets)
        .filter(([, target]) => !target.targetMet)
        .map(([market, target]) => ({ market, ...target })),
      readyMarkets: getReadyHomepageFareMarkets(marketTargets),
      marketReadinessSummary: buildHomepageFareMarketReadinessSummary(
        marketTargets,
      ),
      popularFreshByMarket: createEmptyRefreshMarketCounts(),
      discoveryFreshByMarket: createEmptyRefreshMarketCounts(),
      backupFreshByMarket: createEmptyRefreshMarketCounts(),
      lastKnownGoodByMarket: createEmptyRefreshMarketCounts(),
      publicPriceDiagnostics: createEmptyPublicPriceDiagnostics(),
      timeoutByMarket: createEmptyRefreshMarketCounts(),
      candidatePoolSizeByMarket: createEmptyRefreshMarketCounts(),
      routeAttemptsByMarket: createEmptyRefreshMarketCounts(),
      providerCallsByMarket: createEmptyRefreshMarketCounts(),
      failedByMarket: createEmptyRefreshMarketCounts(),
      unavailableByMarket: createEmptyRefreshMarketCounts(),
      skippedCooldownByMarket: createEmptyRefreshMarketCounts(),
      replacementCandidatesUsedByMarket: createEmptyRefreshMarketCounts(),
      cronConfigured: Boolean(process.env.HOMEPAGE_FARES_CRON_SECRET),
      nextExpectedCronRefresh: process.env.HOMEPAGE_FARES_CRON_SCHEDULE_NOTE,
    };
  }

  const snapshotKeys = eligibleRoutes.map((route) =>
    buildHomepageFareSnapshotKey({
      origin: route.origin,
      destination: route.destination,
      departureDate,
      currency: normalizedCurrency,
    }),
  );
  const db = getOptionalPrisma();
  const snapshotsByKey = new Map<string, HomepageFareSnapshotRecord>();

  if (db) {
    try {
      const snapshots = await db.homepageFareSnapshot.findMany({
        where: {
          snapshotKey: { in: snapshotKeys },
        },
        select: {
          snapshotKey: true,
          origin: true,
          destination: true,
          currency: true,
          price: true,
          providerBacked: true,
          searchedAt: true,
          expiresAt: true,
          status: true,
          payload: true,
        },
      });

      for (const snapshot of snapshots) {
        snapshotsByKey.set(snapshot.snapshotKey, snapshot);
      }
    } catch (error) {
      console.error("[homepage-fare-snapshots:status]", error);
    }
  }

  const statusRoutes = eligibleRoutes.map((route) => {
    const snapshotKey = buildHomepageFareSnapshotKey({
      origin: route.origin,
      destination: route.destination,
      departureDate,
      currency: normalizedCurrency,
    });
    const statusRoute = formatHomepageFareSnapshotStatusRoute({
      route,
      snapshot: snapshotsByKey.get(snapshotKey),
      now,
      currency: normalizedCurrency,
    });

    summary[statusRoute.status] += 1;
    summary.total += 1;

    return statusRoute;
  });

  const refreshBudget = getHomepageFareSmartRefreshBudget();
  const freshRouteIds = new Set(
    statusRoutes
      .filter((route) => route.status === "fresh" || route.status === "last_known_good")
      .map((route) => route.id),
  );
  const refreshRoutes = eligibleRoutes.filter(
    (route): route is HomepageRefreshRoute =>
      "isPopular" in route && "isDiscover" in route && "visibility" in route,
  );
  const {
    popularFreshByMarket,
    visibleDiscoveryPricedByMarket,
    backupFreshByMarket,
  } = computeFreshCountsByMarket(refreshRoutes, freshRouteIds);
  const candidatePoolSizeByMarket = computeCandidatePoolSizeByMarket(
    refreshRoutes,
  );
  const emptyMarketCounts = createEmptyRefreshMarketCounts();
  const lastKnownGoodByMarket = createEmptyRefreshMarketCounts();
  const publicPriceDiagnostics = createEmptyPublicPriceDiagnostics();
  const timeoutByMarket = createEmptyRefreshMarketCounts();
  const failedByMarket = createEmptyRefreshMarketCounts();
  const unavailableByMarket = createEmptyRefreshMarketCounts();
  const replacementCandidatesUsedByMarket = computeReplacementCandidatesUsedByMarket(
    refreshRoutes,
    freshRouteIds,
  );
  let lastRefreshAt: string | undefined;

  for (const route of statusRoutes) {
    if (route.publicPriceDiagnosis) {
      publicPriceDiagnostics[route.publicPriceDiagnosis] =
        (publicPriceDiagnostics[route.publicPriceDiagnosis] ?? 0) + 1;
    }
    if (route.status === "last_known_good") {
      lastKnownGoodByMarket[route.market] =
        (lastKnownGoodByMarket[route.market] ?? 0) + 1;
    }
    if (route.status === "failed") {
      failedByMarket[route.market] = (failedByMarket[route.market] ?? 0) + 1;
    }
    if (route.status === "unavailable") {
      unavailableByMarket[route.market] =
        (unavailableByMarket[route.market] ?? 0) + 1;
    }
    if (route.errorReason === "provider_timeout") {
      timeoutByMarket[route.market] = (timeoutByMarket[route.market] ?? 0) + 1;
    }
    if (route.searchedAt && (!lastRefreshAt || Date.parse(route.searchedAt) > Date.parse(lastRefreshAt))) {
      lastRefreshAt = route.searchedAt;
    }
  }

  const marketTargets = computeHomepageFareMarketTargets(
    refreshRoutes,
    freshRouteIds,
    refreshBudget,
    {
      candidatePoolSizeByMarket,
      replacementCandidatesUsedByMarket,
      lastKnownGoodByMarket,
      timeoutByMarket,
      failedByMarket,
      unavailableByMarket,
    },
  );
  const displayReadiness = classifyHomepageFareDisplayReadiness(
    statusRoutes,
    refreshBudget,
    marketTargets,
  );
  const marketTargetMet = Object.fromEntries(
    Object.entries(marketTargets).map(([market, target]) => [
      market,
      target.targetMet,
    ]),
  );
  const underfilledMarkets = Object.entries(marketTargets)
    .filter(([, target]) => !target.targetMet)
    .map(([market, target]) => ({ market, ...target }));

  return {
    routes: statusRoutes,
    summary,
    health: displayReadiness,
    displayReadiness,
    candidatePoolHealth: summary,
    refreshBudget,
    globalReadinessStatus: displayReadiness.globalReadinessStatus,
    requiredMarkets: [...HOMEPAGE_FARE_REFRESH_MARKETS],
    marketTargets,
    marketTargetMet,
    underfilledMarkets,
    readyMarkets: getReadyHomepageFareMarkets(marketTargets),
    marketReadinessSummary: buildHomepageFareMarketReadinessSummary(
      marketTargets,
    ),
    popularFreshByMarket,
    discoveryFreshByMarket: visibleDiscoveryPricedByMarket,
    backupFreshByMarket,
    lastKnownGoodByMarket,
    publicPriceDiagnostics,
    timeoutByMarket,
    candidatePoolSizeByMarket,
    routeAttemptsByMarket: emptyMarketCounts,
    providerCallsByMarket: emptyMarketCounts,
    failedByMarket: emptyMarketCounts,
    unavailableByMarket: emptyMarketCounts,
    skippedCooldownByMarket: emptyMarketCounts,
    replacementCandidatesUsedByMarket,
    lastRefreshAt,
    cronConfigured: Boolean(process.env.HOMEPAGE_FARES_CRON_SECRET),
    nextExpectedCronRefresh: process.env.HOMEPAGE_FARES_CRON_SCHEDULE_NOTE,
  };
}

export async function upsertActiveHomepageFareSnapshot({
  origin,
  destination,
  snapshotKeyDepartureDate,
  departureDate,
  currency = DEFAULT_CURRENCY,
  provider,
  result,
  searchedAt = new Date(),
  dateFallbackUsed = false,
  primaryDepartureDate,
  actualProviderDepartureDate,
}: {
  origin: string;
  destination: string;
  snapshotKeyDepartureDate?: string;
  departureDate: string;
  currency?: string;
  provider: string;
  result: NormalizedFlightResult;
  searchedAt?: Date;
  dateFallbackUsed?: boolean;
  primaryDepartureDate?: string;
  actualProviderDepartureDate?: string;
}) {
  const price = readFinitePrice(result.price);
  const normalizedCurrency =
    normalizeHomepageFareCurrency(result.currency) ?? currency;

  if (!price) {
    throw new Error(
      "Active homepage fare snapshots require a finite provider price.",
    );
  }

  return upsertHomepageFareSnapshot({
    origin,
    destination,
    snapshotKeyDepartureDate,
    departureDate,
    currency: normalizedCurrency,
    provider,
    price,
    providerBacked: true,
    status: HomepageFareSnapshotStatus.ACTIVE,
    searchedAt,
    expiresAt: new Date(searchedAt.getTime() + ACTIVE_SNAPSHOT_TTL_MS),
    payload: {
      provider,
      resultId: result.id,
      airlineName: result.airlineName,
      stops: result.stops,
      durationMinutes: result.durationMinutes,
      ...(dateFallbackUsed &&
      primaryDepartureDate &&
      actualProviderDepartureDate
        ? {
            dateFallbackUsed: true,
            primaryDepartureDate,
            searchPayloadDepartureDate: actualProviderDepartureDate,
            actualProviderDepartureDate,
          }
        : {}),
    },
  });
}

export async function upsertUnavailableHomepageFareSnapshot({
  origin,
  destination,
  departureDate,
  currency = DEFAULT_CURRENCY,
  provider,
  searchedAt = new Date(),
  reason,
}: {
  origin: string;
  destination: string;
  departureDate: string;
  currency?: string;
  provider: string;
  searchedAt?: Date;
  reason?: string;
}) {
  return upsertHomepageFareSnapshot({
    origin,
    destination,
    departureDate,
    currency,
    provider,
    price: null,
    providerBacked: false,
    status: HomepageFareSnapshotStatus.UNAVAILABLE,
    searchedAt,
    expiresAt: new Date(searchedAt.getTime() + UNAVAILABLE_SNAPSHOT_TTL_MS),
    payload: reason ? { reason } : undefined,
  });
}

export async function upsertFailedHomepageFareSnapshot({
  origin,
  destination,
  departureDate,
  currency = DEFAULT_CURRENCY,
  provider,
  searchedAt = new Date(),
  reason,
}: {
  origin: string;
  destination: string;
  departureDate: string;
  currency?: string;
  provider: string;
  searchedAt?: Date;
  reason?: string;
}) {
  return upsertHomepageFareSnapshot({
    origin,
    destination,
    departureDate,
    currency,
    provider,
    price: null,
    providerBacked: false,
    status: HomepageFareSnapshotStatus.FAILED,
    searchedAt,
    expiresAt: new Date(searchedAt.getTime() + FAILED_SNAPSHOT_TTL_MS),
    payload: reason ? { reason } : undefined,
  });
}

function dedupeHomepageFareRoutes(routes: HomepageFareRoute[]) {
  const seen = new Set<string>();
  const deduped: HomepageFareRoute[] = [];

  for (const route of routes) {
    const normalized = normalizeRoute(route);
    if (!normalized) continue;

    const key = `${normalized.origin}:${normalized.destination}`;
    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push(normalized);
  }

  return deduped;
}

function normalizeRoute(
  route: HomepageFareRoute,
): HomepageFareRoute | undefined {
  const origin = normalizeHomepageFareCode(route.origin);
  const destination = normalizeHomepageFareCode(route.destination);

  if (!origin || !destination || origin === destination) return undefined;

  return {
    ...route,
    id: route.id,
    market: route.market,
    label: route.label,
    origin,
    destination,
  };
}

async function upsertHomepageFareSnapshot(input: SnapshotWriteInput) {
  const db = getOptionalPrisma();

  if (!db) {
    throw new Error(
      "Database access is required to write homepage fare snapshots.",
    );
  }

  const origin = normalizeHomepageFareCode(input.origin);
  const destination = normalizeHomepageFareCode(input.destination);
  const currency =
    normalizeHomepageFareCurrency(input.currency) ?? DEFAULT_CURRENCY;

  if (!origin || !destination) {
    throw new Error(
      "Homepage fare snapshot writes require valid airport codes.",
    );
  }

  if (origin === destination) {
    throw new Error(
      "Homepage fare snapshot writes cannot use identical origin and destination codes.",
    );
  }

  const departureDate = parseDateKey(input.departureDate);
  const returnDate = input.returnDate ? parseDateKey(input.returnDate) : null;
  const snapshotKeyDepartureDate = input.snapshotKeyDepartureDate
    ? parseDateKey(input.snapshotKeyDepartureDate)
    : departureDate;
  const snapshotKey = buildHomepageFareSnapshotKey({
    origin,
    destination,
    tripType: input.tripType,
    departureDate: snapshotKeyDepartureDate,
    returnDate,
    cabinClass: input.cabinClass,
    travelers: input.travelers,
    currency,
  });
  const data = {
    origin,
    destination,
    tripType: input.tripType ?? DEFAULT_TRIP_TYPE,
    departureDate,
    returnDate,
    cabinClass: input.cabinClass ?? DEFAULT_CABIN_CLASS,
    travelers: input.travelers ?? DEFAULT_TRAVELERS,
    currency,
    price:
      typeof input.price === "number" && Number.isFinite(input.price)
        ? new Prisma.Decimal(input.price.toFixed(2))
        : null,
    provider: input.provider,
    providerBacked: input.providerBacked,
    searchedAt: input.searchedAt ?? new Date(),
    expiresAt: input.expiresAt,
    status: input.status,
    payload: (input.payload ?? Prisma.JsonNull) as
      | Prisma.NullableJsonNullValueInput
      | Prisma.InputJsonValue,
  };

  return db.homepageFareSnapshot.upsert({
    where: { snapshotKey },
    create: {
      snapshotKey,
      ...data,
    },
    update: data,
  });
}

type HomepageFareSnapshotRecord = {
  snapshotKey?: string;
  origin: string;
  destination: string;
  currency: string;
  price: unknown;
  providerBacked: boolean;
  searchedAt: Date;
  expiresAt: Date;
  status: HomepageFareSnapshotStatus;
  payload?: unknown;
};

function createEmptyPublicPriceDiagnostics(): Record<HomepageFarePublicPriceDiagnosis, number> {
  return {
    fresh_available: 0,
    last_known_good_used: 0,
    last_known_good_failed_safety_check: 0,
    fresh_missing: 0,
    last_known_good_missing: 0,
    exact_route_mismatch: 0,
    provider_failed: 0,
    provider_unavailable: 0,
    no_provider_backed_fare_ever: 0,
    price_invalid: 0,
  };
}

function createEmptyHomepageFareSnapshotStatusSummary(): HomepageFareSnapshotStatusSummary {
  return {
    fresh: 0,
    last_known_good: 0,
    expired: 0,
    unavailable: 0,
    failed: 0,
    missing: 0,
    total: 0,
  };
}

function classifyHomepageFareDisplayReadiness(
  routes: HomepageFareSnapshotStatusRoute[],
  budget: HomepageFareRefreshBudget,
  marketTargets?: Record<string, HomepageFareMarketTarget>,
): HomepageFareDisplayReadiness {
  const popularFresh = routes.filter(
    (route) => route.id.startsWith("popular-") &&
      (route.status === "fresh" || route.status === "last_known_good"),
  ).length;
  const discoverFresh = routes.filter(
    (route) => route.id.startsWith("discover-") &&
      (route.status === "fresh" || route.status === "last_known_good"),
  ).length;
  const discoverDisplayedFresh = Math.min(
    discoverFresh,
    budget.discoverVisibleTarget,
  );
  const discoverBackupFresh = Math.max(
    0,
    discoverFresh - budget.discoverVisibleTarget,
  );
  const publicFreshTarget =
    budget.popularVisibleTarget + budget.discoverVisibleTarget;
  const visibleFresh = popularFresh + discoverDisplayedFresh;
  const globalReadinessStatus = marketTargets
    ? getGlobalHomepageFareReadinessStatus(marketTargets)
    : "not_ready";

  if (globalReadinessStatus === "ready") {
    return {
      status: "healthy",
      label: "Global homepage ready",
      message:
        "Every configured homepage market has enough fresh provider-backed fares to fill visible homepage pricing slots.",
      globalReadinessStatus,
      popularFresh,
      popularTarget: budget.popularVisibleTarget,
      discoverFresh,
      discoverVisibleTarget: budget.discoverVisibleTarget,
      discoverDisplayedFresh,
      discoverBackupFresh,
      publicFreshTarget,
    };
  }

  if (globalReadinessStatus === "partial" || visibleFresh > 0) {
    return {
      status: "warning",
      label: "Global homepage partially ready",
      message:
        "At least one market has fresh provider-backed homepage fares, but market coverage is incomplete.",
      globalReadinessStatus:
        globalReadinessStatus === "not_ready" ? "partial" : globalReadinessStatus,
      popularFresh,
      popularTarget: budget.popularVisibleTarget,
      discoverFresh,
      discoverVisibleTarget: budget.discoverVisibleTarget,
      discoverDisplayedFresh,
      discoverBackupFresh,
      publicFreshTarget,
    };
  }

  return {
    status: "attention",
    label: "Global homepage not ready",
    message:
      "Fresh provider-backed fares are not available for configured homepage markets yet.",
    globalReadinessStatus,
    popularFresh,
    popularTarget: budget.popularVisibleTarget,
    discoverFresh,
    discoverVisibleTarget: budget.discoverVisibleTarget,
    discoverDisplayedFresh,
    discoverBackupFresh,
    publicFreshTarget,
  };
}

function formatHomepageFareSnapshotStatusRoute({
  route,
  snapshot,
  now,
  currency,
}: {
  route: HomepageFareRoute;
  snapshot?: HomepageFareSnapshotRecord;
  now: Date;
  currency: string;
}): HomepageFareSnapshotStatusRoute {
  const section = getHomepageFareStatusRouteSection(route);
  const base = {
    id: route.id,
    market: route.market ?? "GLOBAL",
    label: route.label ?? `${route.origin} → ${route.destination}`,
    origin: route.origin,
    destination: route.destination,
    destinationCity: route.label,
    section,
    ...(section === "backup" ? { replacementCandidateUsed: "Backup route candidate" } : {}),
  };

  if (!snapshot) {
    return {
      ...base,
      status: "missing",
      publicPriceDiagnosis: "no_provider_backed_fare_ever",
      providerBacked: false,
    };
  }

  const price = readFinitePrice(snapshot.price);
  const expiresAtMs = snapshot.expiresAt.getTime();
  const isExpired = expiresAtMs <= now.getTime();
  const isFresh =
    snapshot.providerBacked === true &&
    snapshot.status === HomepageFareSnapshotStatus.ACTIVE &&
    !isExpired &&
    Boolean(price) &&
    normalizeHomepageFareCurrency(snapshot.currency) === currency;
  const isLastKnownGood = isLastKnownGoodHomepageFareSnapshotRecord({
    snapshot,
    now,
    currency,
  });
  const status = getOperationalSnapshotStatus({
    snapshotStatus: snapshot.status,
    isExpired,
    isFresh,
    isLastKnownGood,
  });

  const safeError =
    status !== "fresh"
      ? readSafeHomepageFareSnapshotError(snapshot.payload)
      : undefined;
  const publicPriceDiagnosis = getHomepageFarePublicPriceDiagnosis({
    route,
    snapshot,
    now,
    currency,
    status,
    isFresh,
    isLastKnownGood,
  });

  const provider = readHomepageFareSnapshotProvider(snapshot.payload);

  return {
    ...base,
    ...((isFresh || isLastKnownGood) && price
      ? {
          price,
          currency: snapshot.currency,
          providerNativePrice: price,
          providerNativeCurrency: snapshot.currency,
        }
      : {}),
    ...(provider ? { provider } : {}),
    status,
    publicPriceDiagnosis,
    providerBacked: snapshot.providerBacked === true,
    searchedAt: snapshot.searchedAt.toISOString(),
    expiresAt: snapshot.expiresAt.toISOString(),
    ...(safeError
      ? {
          errorReason: safeError.reason,
          errorCategory: safeError.category,
        }
      : {}),
  };
}


function getHomepageFarePublicPriceDiagnosis({
  route,
  snapshot,
  status,
  isFresh,
  isLastKnownGood,
  currency,
}: {
  route: HomepageFareRoute;
  snapshot: HomepageFareSnapshotRecord;
  now: Date;
  status: HomepageFareSnapshotStatusValue;
  isFresh: boolean;
  isLastKnownGood: boolean;
  currency: string;
}): HomepageFarePublicPriceDiagnosis {
  const routeOrigin = normalizeHomepageFareCode(route.origin);
  const routeDestination = normalizeHomepageFareCode(route.destination);
  const snapshotOrigin = normalizeHomepageFareCode(snapshot.origin);
  const snapshotDestination = normalizeHomepageFareCode(snapshot.destination);

  if (routeOrigin !== snapshotOrigin || routeDestination !== snapshotDestination) {
    return "exact_route_mismatch";
  }
  if (isFresh) return "fresh_available";
  if (isLastKnownGood) return "last_known_good_used";
  if (snapshot.providerBacked !== true) return "no_provider_backed_fare_ever";
  if (!readFinitePrice(snapshot.price) || normalizeHomepageFareCurrency(snapshot.currency) !== currency) {
    return "price_invalid";
  }
  if (snapshot.status === HomepageFareSnapshotStatus.FAILED) return "provider_failed";
  if (snapshot.status === HomepageFareSnapshotStatus.UNAVAILABLE) return "provider_unavailable";
  if (snapshot.status === HomepageFareSnapshotStatus.ACTIVE && status === "expired") {
    return "last_known_good_failed_safety_check";
  }

  return status === "expired" ? "last_known_good_missing" : "fresh_missing";
}

function getHomepageFareStatusRouteSection(
  route: HomepageFareRoute,
): HomepageFareSnapshotStatusRoute["section"] {
  if ("isPopular" in route && route.isPopular === true) return "popular";
  if ("visibility" in route && route.visibility === "backup") return "backup";
  if ("visibility" in route && route.visibility === "fallback") return "fallback";
  if ("isDiscover" in route && route.isDiscover === true) return "discovery";
  if (route.id.startsWith("popular-")) return "popular";
  if (route.id.startsWith("discover-")) return "discovery";
  return "fallback";
}

function readHomepageFareSnapshotProvider(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const provider = (payload as { provider?: unknown }).provider;
  return typeof provider === "string" && provider.trim().length <= 80
    ? provider.trim()
    : undefined;
}

function readSafeHomepageFareSnapshotError(payload: unknown):
  | {
      reason: SafeHomepageFareErrorReason;
      category: SafeHomepageFareErrorCategory;
    }
  | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const reason = (payload as { reason?: unknown }).reason;
  if (!isSafeHomepageFareErrorReason(reason)) return undefined;

  return {
    reason,
    category: SAFE_HOMEPAGE_FARE_ERROR_CATEGORIES[reason],
  };
}

function isSafeHomepageFareErrorReason(
  value: unknown,
): value is SafeHomepageFareErrorReason {
  return (
    typeof value === "string" && value in SAFE_HOMEPAGE_FARE_ERROR_CATEGORIES
  );
}

function getOperationalSnapshotStatus({
  snapshotStatus,
  isExpired,
  isFresh,
  isLastKnownGood = false,
}: {
  snapshotStatus: HomepageFareSnapshotStatus;
  isExpired: boolean;
  isFresh: boolean;
  isLastKnownGood?: boolean;
}): HomepageFareSnapshotStatusValue {
  if (isFresh) return "fresh";
  if (isLastKnownGood) return "last_known_good";
  if (isExpired || snapshotStatus === HomepageFareSnapshotStatus.STALE) {
    return "expired";
  }
  if (snapshotStatus === HomepageFareSnapshotStatus.FAILED) return "failed";

  return "unavailable";
}

function formatHomepageFareSnapshotResponseEntry({
  route,
  snapshot,
  now,
  currency,
  departureDate,
}: {
  route: HomepageFareRoute;
  snapshot?: {
    origin: string;
    destination: string;
    tripType: string;
    departureDate: Date;
    returnDate: Date | null;
    cabinClass: string;
    travelers: number;
    currency: string;
    price: unknown;
    providerBacked: boolean;
    searchedAt: Date;
    expiresAt: Date;
    status: HomepageFareSnapshotStatus;
  };
  now: Date;
  currency: string;
  departureDate: string;
}): HomepageFareSnapshotResponseEntry {
  const fallbackSearchedAt = now.toISOString();
  const unavailableEntry: HomepageFareSnapshotResponseEntry = {
    id: route.id,
    code: route.destination,
    origin: route.origin,
    providerBacked: false,
    searchedAt: snapshot?.searchedAt?.toISOString() ?? fallbackSearchedAt,
    expiresAt: snapshot?.expiresAt?.toISOString(),
    unavailable: true,
    priceState: "none",
  };

  if (!snapshot) return unavailableEntry;

  const normalizedSnapshotOrigin = normalizeHomepageFareCode(snapshot.origin);
  const normalizedSnapshotDestination = normalizeHomepageFareCode(snapshot.destination);
  const routeMatchesSnapshot =
    normalizedSnapshotOrigin === route.origin &&
    normalizedSnapshotDestination === route.destination;

  if (!routeMatchesSnapshot) return unavailableEntry;

  const price = readFinitePrice(snapshot.price);
  const expiresAtMs = snapshot.expiresAt.getTime();
  const normalizedSnapshotCurrency = normalizeHomepageFareCurrency(snapshot.currency);
  const providerBacked =
    snapshot.providerBacked === true &&
    snapshot.status === HomepageFareSnapshotStatus.ACTIVE &&
    Boolean(price) &&
    normalizedSnapshotCurrency === currency;
  const isFresh = providerBacked && expiresAtMs > now.getTime();
  const isLastKnownGood =
    providerBacked &&
    !isFresh &&
    isLastKnownGoodHomepageFareSnapshotRecord({
      snapshot,
      now,
      currency,
    });

  if ((!isFresh && !isLastKnownGood) || !price) return unavailableEntry;

  const search = buildHomepageFareSearch({
    origin: route.origin,
    destination: route.destination,
    departureDate: formatDateKey(snapshot.departureDate) || departureDate,
    currency: snapshot.currency,
  });

  return {
    id: route.id,
    code: route.destination,
    origin: route.origin,
    price,
    currency: snapshot.currency,
    providerBacked: true,
    searchedAt: snapshot.searchedAt.toISOString(),
    expiresAt: snapshot.expiresAt.toISOString(),
    search,
    priceState: isLastKnownGood ? "last_known_good" : "fresh",
    ...(isLastKnownGood ? { cachedProviderBacked: true } : {}),
  };
}

function readFinitePrice(value: unknown) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : value && typeof value === "object" && "toNumber" in value
          ? (value as { toNumber: () => number }).toNumber()
          : Number(value);

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : undefined;
}

function getNextWeekendDateAroundDaysOut(daysOut: number, now: Date) {
  const date = new Date(now);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + daysOut);

  const day = date.getUTCDay();
  const daysUntilFriday = (5 - day + 7) % 7;
  const daysUntilSaturday = (6 - day + 7) % 7;
  const daysToAdd =
    daysUntilFriday <= daysUntilSaturday ? daysUntilFriday : daysUntilSaturday;

  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date;
}

function addUtcDaysToDateKey(dateKey: string, days: number) {
  if (!isValidDateKey(dateKey)) return undefined;

  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);

  return formatDateKey(date);
}

function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  return formatDateKey(parseDateKey(value)) === value;
}

function getUtcDateStart(value: Date) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function formatDateKey(value: string | Date) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function parseDateKey(value: string | Date) {
  if (value instanceof Date) {
    const parsed = new Date(value);
    parsed.setUTCHours(0, 0, 0, 0);
    return parsed;
  }

  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}


export const __homepageFareCoverageTest = {
  getRefreshRoutes,
  computeHomepageFareMarketTargets,
  computeFreshCountsByMarket,
  getHomepageFareSmartRefreshBudget,
  isFreshHomepageFareSnapshotRecord,
  isLastKnownGoodHomepageFareSnapshotRecord,
  isUsableHomepageFareSnapshotRecord,
  getHomepageFareReplacementCandidates,
  getHomepageFareCompatibleReplacementMarkets,
  getHomepageFareRefreshPriorityScore,
  prioritizeHomepageFareRefreshRoutes,
  formatHomepageFareSnapshotResponseEntry,
  updateHomepageFareUnderfillExecutionMetadata,
};
