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
  popularVisibleTarget: 5,
  discoverVisibleTarget: HOME_DISCOVERY_VISIBLE_CARD_COUNT,
  discoverBackupFreshTarget: 3,
  maxRouteAttemptsPerRun: 36,
  maxProviderCallsPerRun: 96,
  maxDateCandidatesPerRoute: 3,
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
  origin: string;
  destination: string;
  label?: string;
};

export type HomepageFareSnapshotStatusValue =
  | "fresh"
  | "expired"
  | "unavailable"
  | "failed"
  | "missing";

export type HomepageFareSnapshotStatusRoute = {
  id: string;
  label: string;
  origin: string;
  destination: string;
  price?: number;
  currency?: string;
  status: HomepageFareSnapshotStatusValue;
  providerBacked: boolean;
  searchedAt?: string;
  expiresAt?: string;
  errorReason?: SafeHomepageFareErrorReason;
  errorCategory?: SafeHomepageFareErrorCategory;
};

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

export type HomepageFareDisplayReadiness = HomepageFareSnapshotHealth & {
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
  maxDateCandidatesPerRoute: number;
};

export type HomepageFareSnapshotStatusResponse = {
  routes: HomepageFareSnapshotStatusRoute[];
  summary: HomepageFareSnapshotStatusSummary;
  health: HomepageFareSnapshotHealth;
  displayReadiness: HomepageFareDisplayReadiness;
  candidatePoolHealth: HomepageFareCandidatePoolHealth;
  refreshBudget: HomepageFareRefreshBudget;
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
  priceState: "fresh" | "none";
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
  | "all_remaining_cooldown_or_unavailable";

export type HomepageFareMarketTarget = {
  popularTarget: number;
  popularFresh: number;
  discoveryTarget: number;
  discoveryFresh: number;
  targetMet: boolean;
  reason?: string;
};

export type HomepageFareUnderfilledMarket = HomepageFareMarketTarget & {
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
  readinessBefore: HomepageFareRefreshReadiness;
  readinessAfter: HomepageFareRefreshReadiness;
  refreshBudget: HomepageFareRefreshBudget;
  marketsConsidered: string[];
  marketTargets: Record<string, HomepageFareMarketTarget>;
  marketTargetMet: Record<string, boolean>;
  underfilledMarkets: HomepageFareUnderfilledMarket[];
  marketRoutesAttempted: Record<string, number>;
  marketFreshCounts: Record<string, number>;
  popularFreshByMarket: Record<string, number>;
  discoveryFreshByMarket: Record<string, number>;
  providerCallsByMarket: Record<string, number>;
  failedByMarket: Record<string, number>;
  unavailableByMarket: Record<string, number>;
  skippedCooldownByMarket: Record<string, number>;
  skippedByMarket: Record<string, number>;
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

function computeFreshCountsByMarket(
  routes: HomepageRefreshRoute[],
  freshRouteIds: Set<string>,
) {
  const marketFreshCounts = createEmptyRefreshMarketCounts();
  const popularFreshByMarket = createEmptyRefreshMarketCounts();
  const discoveryFreshByMarket = createEmptyRefreshMarketCounts();

  for (const route of routes) {
    if (!freshRouteIds.has(route.id)) continue;

    marketFreshCounts[route.market] = (marketFreshCounts[route.market] ?? 0) + 1;

    if (route.isPopular) {
      popularFreshByMarket[route.market] =
        (popularFreshByMarket[route.market] ?? 0) + 1;
    }

    if (route.isDiscover) {
      discoveryFreshByMarket[route.market] =
        (discoveryFreshByMarket[route.market] ?? 0) + 1;
    }
  }

  return { marketFreshCounts, popularFreshByMarket, discoveryFreshByMarket };
}

function updateRefreshMarketFreshMetadata(
  counts: HomepageFareRefreshCounts,
  routes: HomepageRefreshRoute[],
  freshRouteIds: Set<string>,
) {
  const { marketFreshCounts, popularFreshByMarket, discoveryFreshByMarket } =
    computeFreshCountsByMarket(routes, freshRouteIds);

  counts.marketFreshCounts = marketFreshCounts;
  counts.popularFreshByMarket = popularFreshByMarket;
  counts.discoveryFreshByMarket = discoveryFreshByMarket;
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
}

function computeHomepageFareMarketTargets(
  routes: HomepageRefreshRoute[],
  freshRouteIds: Set<string>,
  budget: HomepageFareRefreshBudget,
): Record<string, HomepageFareMarketTarget> {
  return Object.fromEntries(
    HOMEPAGE_FARE_REFRESH_MARKETS.map((market) => {
      const marketRoutes = routes.filter((route) => route.market === market);
      const popularTarget = Math.min(
        budget.popularVisibleTarget,
        marketRoutes.filter((route) => route.isPopular).length,
      );
      const discoveryTarget = Math.min(
        budget.discoverVisibleTarget + budget.discoverBackupFreshTarget,
        marketRoutes.filter((route) => route.isDiscover).length,
      );
      const popularFresh = marketRoutes.filter(
        (route) => route.isPopular && freshRouteIds.has(route.id),
      ).length;
      const discoveryFresh = marketRoutes.filter(
        (route) => route.isDiscover && freshRouteIds.has(route.id),
      ).length;
      const targetMet =
        popularFresh >= popularTarget && discoveryFresh >= discoveryTarget;
      const missingPopular = Math.max(0, popularTarget - popularFresh);
      const missingDiscovery = Math.max(0, discoveryTarget - discoveryFresh);

      return [
        market,
        {
          popularTarget,
          popularFresh,
          discoveryTarget,
          discoveryFresh,
          targetMet,
          ...(targetMet
            ? {}
            : {
                reason: `missing ${missingPopular} popular and ${missingDiscovery} discovery fresh fares`,
              }),
        },
      ];
    }),
  );
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
        isFreshHomepageFareSnapshotRecord({
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
    readinessBefore,
    readinessAfter: readinessBefore,
    refreshBudget,
    marketsConsidered: [...HOMEPAGE_FARE_REFRESH_MARKETS],
    marketTargets: {},
    marketTargetMet: {},
    underfilledMarkets: [],
    marketRoutesAttempted: createEmptyRefreshMarketCounts(),
    marketFreshCounts: createEmptyRefreshMarketCounts(),
    popularFreshByMarket: createEmptyRefreshMarketCounts(),
    discoveryFreshByMarket: createEmptyRefreshMarketCounts(),
    providerCallsByMarket: createEmptyRefreshMarketCounts(),
    failedByMarket: createEmptyRefreshMarketCounts(),
    unavailableByMarket: createEmptyRefreshMarketCounts(),
    skippedCooldownByMarket: createEmptyRefreshMarketCounts(),
    skippedByMarket: createEmptyRefreshMarketCounts(),
  };
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
    return counts;
  }

  let providerIncidentDetected = false;
  const prioritizedRoutes = prioritizeHomepageFareRefreshRoutes({
    routes: refreshRoutes,
    snapshotsByRouteId,
    freshRouteIds,
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
    return counts;
  }

  for (const route of prioritizedRoutes) {
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

    if (counts.routeAttempts >= refreshBudget.maxRouteAttemptsPerRun) {
      counts.stoppedReason = "route_budget_exhausted";
      break;
    }

    if (counts.providerCalls >= refreshBudget.maxProviderCallsPerRun) {
      counts.stoppedReason = "provider_budget_exhausted";
      break;
    }

    if (providerIncidentDetected) {
      counts.stoppedReason = "completed";
      break;
    }

    counts.routeAttempts += 1;
    counts.marketRoutesAttempted[route.market] =
      (counts.marketRoutesAttempted[route.market] ?? 0) + 1;
    const result = await refreshHomepageFareRoute({
      route,
      departureDate: dateStrategy.departureDate,
      counts,
      existingSnapshot: snapshotsByRouteId.get(route.id),
      refreshBudget,
    });

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

    if (result === "skipped") {
      counts.skippedByMarket[route.market] =
        (counts.skippedByMarket[route.market] ?? 0) + 1;
    }

    if (result === "provider_incident") {
      providerIncidentDetected = true;
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

  return counts;
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
  const existingFresh = isFreshHomepageFareSnapshotRecord({
    snapshot: existingSnapshot,
    now: new Date(),
    currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
  });

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
      if (existingFresh) {
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

    if (existingFresh) {
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

    return terminalResult && isProviderWideHomepageFareIncident(terminalResult.reason)
      ? "provider_incident"
      : "failed";
  } catch {
    if (existingFresh) {
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
  return { ...HOMEPAGE_FARE_SMART_REFRESH_DEFAULTS };
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
    const marketRoutes = routes.filter((route) => route.market === market);
    const popularTarget = Math.min(
      budget.popularVisibleTarget,
      marketRoutes.filter((route) => route.isPopular).length,
    );
    const discoveryTarget = Math.min(
      budget.discoverVisibleTarget + budget.discoverBackupFreshTarget,
      marketRoutes.filter((route) => route.isDiscover).length,
    );
    const freshPopular = marketRoutes.filter(
      (route) => route.isPopular && freshRouteIds.has(route.id),
    ).length;
    const freshDiscover = marketRoutes.filter(
      (route) => route.isDiscover && freshRouteIds.has(route.id),
    ).length;

    return freshPopular >= popularTarget && freshDiscover >= discoveryTarget;
  });
}

function prioritizeHomepageFareRefreshRoutes({
  routes,
  snapshotsByRouteId,
  freshRouteIds,
  now,
}: {
  routes: HomepageRefreshRoute[];
  snapshotsByRouteId: Map<string, HomepageFareSnapshotRecord>;
  freshRouteIds: Set<string>;
  now: Date;
}) {
  const scoredRoutes = [...routes]
    .filter((route) => {
      const snapshot = snapshotsByRouteId.get(route.id);

      if (isRefreshCooldownSnapshot(snapshot, now)) return false;

      return !freshRouteIds.has(route.id) || isNearExpirySnapshot(snapshot, now);
    })
    .map((route) => ({
      route,
      score: getHomepageFareRefreshPriorityScore({
        route,
        snapshot: snapshotsByRouteId.get(route.id),
        now,
      }),
    }))
    .sort(
      (first, second) =>
        first.score - second.score || first.route.priority - second.route.priority,
    );

  const routesByScore = new Map<number, HomepageRefreshRoute[]>();

  for (const { route, score } of scoredRoutes) {
    routesByScore.set(score, [...(routesByScore.get(score) ?? []), route]);
  }

  return [...routesByScore.entries()]
    .sort(([firstScore], [secondScore]) => firstScore - secondScore)
    .flatMap(([, sameScoreRoutes]) =>
      roundRobinHomepageFareRoutesByMarket(sameScoreRoutes),
    );
}

function roundRobinHomepageFareRoutesByMarket(routes: HomepageRefreshRoute[]) {
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

    for (const market of HOMEPAGE_FARE_REFRESH_MARKETS) {
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
  now,
}: {
  route: HomepageRefreshRoute;
  snapshot?: HomepageFareSnapshotRecord;
  now: Date;
}) {
  const isFresh = isFreshHomepageFareSnapshotRecord({
    snapshot,
    now,
    currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
  });
  const status = getSnapshotPriorityStatus(snapshot, now);

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

  const requestedResult = await buildHomepageDiscoveryFareCardsForCandidates({
    candidates: requestedCandidates,
    requested,
    currency: normalizedCurrency,
  });

  if (requestedResult.freshCount > 0) {
    return buildHomepageDiscoveryFareCardsResponse({
      ...requestedResult,
      requested,
      requestedRegionCode,
      effectiveRegionCode: requestedRegionCode,
      fallbackUsed: false,
      fallbackReason: "none",
      fallbackScope: "requested-region",
      usDomesticFallbackBlocked: false,
      currencyRequested: normalizedCurrency,
      snapshotCurrency: normalizedCurrency,
    });
  }

  const fallbackReason: HomepageDiscoveryFareFallbackReason =
    requestedCandidates.length
      ? "requested_region_no_fresh_fares"
      : "requested_region_no_candidates";

  const regionalCandidates = getRegionalHomeDiscoveryFareCandidates(
    requestedRegionCode,
  );
  const shouldTryRegionalFallback =
    regionalCandidates.length > 0 &&
    !areSameCandidateSets(requestedCandidates, regionalCandidates);

  let regionalResult: HomepageDiscoveryFareCandidateBuildResult | undefined;

  if (shouldTryRegionalFallback) {
    regionalResult = await buildHomepageDiscoveryFareCardsForCandidates({
      candidates: regionalCandidates,
      requested,
      currency: normalizedCurrency,
    });

    if (regionalResult.freshCount > 0) {
      return buildHomepageDiscoveryFareCardsResponse({
        ...regionalResult,
        requested,
        requestedRegionCode,
        effectiveRegionCode: getEffectiveRegionCodeForCandidates(
          regionalCandidates,
          requestedRegionCode,
        ),
        fallbackUsed: true,
        fallbackReason,
        fallbackScope: "regional",
        usDomesticFallbackBlocked: isNonUsRegion,
        currencyRequested: normalizedCurrency,
        snapshotCurrency: normalizedCurrency,
      });
    }
  }

  const globalCandidates = getGlobalHomeDiscoveryFareCandidates();
  const shouldTryGlobalFallback = !areSameCandidateSets(
    requestedCandidates,
    globalCandidates,
  );

  if (shouldTryGlobalFallback) {
    const globalResult = await buildHomepageDiscoveryFareCardsForCandidates({
      candidates: globalCandidates,
      requested,
      currency: normalizedCurrency,
    });

    if (globalResult.freshCount > 0) {
      return buildHomepageDiscoveryFareCardsResponse({
        ...globalResult,
        requested,
        requestedRegionCode,
        effectiveRegionCode: GLOBAL_HOME_DISCOVERY_REGION,
        fallbackUsed: true,
        fallbackReason: shouldTryRegionalFallback
          ? "regional_fallback_no_fresh_fares"
          : fallbackReason,
        fallbackScope: "global-international",
        usDomesticFallbackBlocked: isNonUsRegion,
        currencyRequested: normalizedCurrency,
        snapshotCurrency: normalizedCurrency,
      });
    }
  }

  if (requestedResult.cards.length > 0) {
    return buildHomepageDiscoveryFareCardsResponse({
      ...requestedResult,
      requested,
      requestedRegionCode,
      effectiveRegionCode: requestedRegionCode,
      fallbackUsed: false,
      fallbackReason,
      fallbackScope: "requested-region",
      usDomesticFallbackBlocked: isNonUsRegion,
      currencyRequested: normalizedCurrency,
      snapshotCurrency: normalizedCurrency,
    });
  }

  if (regionalResult?.cards.length) {
    return buildHomepageDiscoveryFareCardsResponse({
      ...regionalResult,
      requested,
      requestedRegionCode,
      effectiveRegionCode: getEffectiveRegionCodeForCandidates(
        regionalCandidates,
        requestedRegionCode,
      ),
      fallbackUsed: true,
      fallbackReason: "regional_fallback_no_fresh_fares",
      fallbackScope: "regional",
      usDomesticFallbackBlocked: isNonUsRegion,
      currencyRequested: normalizedCurrency,
      snapshotCurrency: normalizedCurrency,
    });
  }

  const globalNeutralResult = await buildHomepageDiscoveryFareCardsForCandidates({
    candidates: globalCandidates,
    requested,
    currency: normalizedCurrency,
  });

  return buildHomepageDiscoveryFareCardsResponse({
    ...globalNeutralResult,
    requested,
    requestedRegionCode,
    effectiveRegionCode: GLOBAL_HOME_DISCOVERY_REGION,
    fallbackUsed: true,
    fallbackReason: shouldTryGlobalFallback
      ? "global_fallback_no_fresh_fares"
      : fallbackReason,
    fallbackScope: globalNeutralResult.cards.length
      ? "global-international"
      : "none",
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

    if (isFreshHomepageDiscoveryFareForCandidate(candidate, fare)) {
      freshCards.push({
        item,
        fare: {
          price: fare.price,
          currency: fare.currency,
          providerBacked: true,
          searchedAt: fare.searchedAt,
          expiresAt: fare.expiresAt,
          search: fare.search,
        },
        priceState: "fresh",
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
    freshCount: cards.filter((card) => card.priceState === "fresh").length,
  };
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
  return `${candidate.id}:${candidate.originCode}:${candidate.destinationCode}`;
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
  const freshCount = cards.filter((card) => card.priceState === "fresh").length;
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

function normalizeHomepageDiscoveryRegionCode(regionCode: string) {
  const normalized = regionCode.trim().toUpperCase();

  return /^[A-Z]{2}$/.test(normalized)
    ? normalized
    : DEFAULT_HOME_DISCOVERY_REGION;
}

function isFreshHomepageDiscoveryFareForCandidate(
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
    isFreshHomepageFareSnapshotResponseEntry(fare) &&
    fare.search.origin === candidate.originCode &&
    fare.search.destination === candidate.destinationCode &&
    fare.search.currency === fare.currency &&
    Date.parse(fare.expiresAt) > Date.now()
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

function isFreshHomepageFareSnapshotResponseEntry(
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
  routes = getPhase3AHomepageFareRoutes(),
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
    const displayReadiness = classifyHomepageFareDisplayReadiness([], getHomepageFareSmartRefreshBudget());

    return {
      routes: [],
      summary,
      health: displayReadiness,
      displayReadiness,
      candidatePoolHealth: summary,
      refreshBudget: getHomepageFareSmartRefreshBudget(),
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
  const displayReadiness = classifyHomepageFareDisplayReadiness(
    statusRoutes,
    refreshBudget,
  );

  return {
    routes: statusRoutes,
    summary,
    health: displayReadiness,
    displayReadiness,
    candidatePoolHealth: summary,
    refreshBudget,
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
    id: route.id,
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
  snapshotKey: string;
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

function createEmptyHomepageFareSnapshotStatusSummary(): HomepageFareSnapshotStatusSummary {
  return {
    fresh: 0,
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
): HomepageFareDisplayReadiness {
  const popularFresh = routes.filter(
    (route) => route.id.startsWith("popular-") && route.status === "fresh",
  ).length;
  const discoverFresh = routes.filter(
    (route) => route.id.startsWith("discover-") && route.status === "fresh",
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

  if (
    popularFresh >= budget.popularVisibleTarget &&
    discoverDisplayedFresh >= budget.discoverVisibleTarget
  ) {
    return {
      status: "healthy",
      label: "Homepage display ready",
      message:
        "Enough fresh provider-backed fares exist to fill the visible homepage pricing slots.",
      popularFresh,
      popularTarget: budget.popularVisibleTarget,
      discoverFresh,
      discoverVisibleTarget: budget.discoverVisibleTarget,
      discoverDisplayedFresh,
      discoverBackupFresh,
      publicFreshTarget,
    };
  }

  if (visibleFresh > 0) {
    return {
      status: "warning",
      label: "Partial homepage pricing",
      message:
        "Some visible homepage pricing slots have fresh provider-backed fares, but the display target is not full yet.",
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
    label: "Homepage pricing needs attention",
    message:
      "Fresh provider-backed fares are not available for the visible homepage pricing slots.",
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
  const base = {
    id: route.id,
    label: route.label ?? `${route.origin} → ${route.destination}`,
    origin: route.origin,
    destination: route.destination,
  };

  if (!snapshot) {
    return {
      ...base,
      status: "missing",
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
  const status = getOperationalSnapshotStatus({
    snapshotStatus: snapshot.status,
    isExpired,
    isFresh,
  });

  const safeError =
    status !== "fresh"
      ? readSafeHomepageFareSnapshotError(snapshot.payload)
      : undefined;

  return {
    ...base,
    ...(isFresh && price
      ? {
          price,
          currency: snapshot.currency,
        }
      : {}),
    status,
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
}: {
  snapshotStatus: HomepageFareSnapshotStatus;
  isExpired: boolean;
  isFresh: boolean;
}): HomepageFareSnapshotStatusValue {
  if (isFresh) return "fresh";
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
    providerBacked: false,
    searchedAt: snapshot?.searchedAt?.toISOString() ?? fallbackSearchedAt,
    expiresAt: snapshot?.expiresAt?.toISOString(),
    unavailable: true,
  };

  if (!snapshot) return unavailableEntry;

  const price = readFinitePrice(snapshot.price);
  const expiresAtMs = snapshot.expiresAt.getTime();
  const providerBacked =
    snapshot.providerBacked === true &&
    snapshot.status === HomepageFareSnapshotStatus.ACTIVE &&
    expiresAtMs > now.getTime() &&
    Boolean(price) &&
    normalizeHomepageFareCurrency(snapshot.currency) === currency;

  if (!providerBacked || !price) return unavailableEntry;

  const search = buildHomepageFareSearch({
    origin: snapshot.origin,
    destination: snapshot.destination,
    departureDate: formatDateKey(snapshot.departureDate) || departureDate,
    currency: snapshot.currency,
  });

  return {
    id: route.id,
    code: route.destination,
    price,
    currency: snapshot.currency,
    providerBacked: true,
    searchedAt: snapshot.searchedAt.toISOString(),
    expiresAt: snapshot.expiresAt.toISOString(),
    search,
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
