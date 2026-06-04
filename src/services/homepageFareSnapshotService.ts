import { HomepageFareSnapshotStatus, Prisma } from "@/generated/prisma/client";

import { getDefaultHomeDiscoveryPriceRoutes } from "@/data/homeDiscovery";
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

export type HomepageFareSnapshotStatusResponse = {
  routes: HomepageFareSnapshotStatusRoute[];
  summary: HomepageFareSnapshotStatusSummary;
  health: HomepageFareSnapshotHealth;
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

export type HomepageFareRefreshCounts = {
  refreshed: number;
  unavailable: number;
  failed: number;
  skipped: number;
};

export type HomepageFareRefreshScope =
  | "popular"
  | "discover"
  | "discover-default"
  | "discover-first-6"
  | "all-phase-3a";

type HomepageRefreshRoute = {
  origin: string;
  destination: string;
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
  const popularRoutes = PHASE_3A_POPULAR_HOMEPAGE_FARE_ROUTES.map((route) => ({
    id: `popular-${route.id}`,
    label: route.label,
    origin: HOMEPAGE_FARE_DEFAULT_ORIGIN,
    destination: route.destination,
  }));
  const discoverRoutes = getDefaultHomeDiscoveryPriceRoutes().map((route) => ({
    id: `discover-${route.id}`,
    label: route.label ?? route.id,
    origin: route.originCode,
    destination: route.destinationCode,
  }));

  return dedupeHomepageFareRoutes([...popularRoutes, ...discoverRoutes]);
}

export async function refreshPhase3AHomepageFareSnapshots({
  scope = "all-phase-3a",
  dateStrategy = getHomepageFareDateStrategy(),
}: {
  scope?: HomepageFareRefreshScope;
  dateStrategy?: HomepageFareDateStrategy;
} = {}): Promise<HomepageFareRefreshCounts> {
  const counts: HomepageFareRefreshCounts = {
    refreshed: 0,
    unavailable: 0,
    failed: 0,
    skipped: 0,
  };
  const routes = getRefreshRoutes(scope);

  for (const route of routes) {
    await refreshHomepageFareRoute({
      route,
      departureDate: dateStrategy.departureDate,
      counts,
    });
  }

  return counts;
}

async function refreshHomepageFareRoute({
  route,
  departureDate,
  counts,
}: {
  route: HomepageRefreshRoute;
  departureDate: string;
  counts: HomepageFareRefreshCounts;
}) {
  const { origin, destination } = route;

  if (isSameHomepageFareRoute(origin, destination)) {
    counts.skipped += 1;
    return;
  }

  try {
    const search = buildHomepageFareSearch({
      origin,
      destination,
      departureDate,
      currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
    });
    const providerSearch: FlightSearchParams = {
      ...search,
      sort: "cheapest",
    };
    const providerResult = await searchDuffelFlights(providerSearch);
    const result = selectProviderFare(providerResult.results, search.currency);

    if (
      providerResult.status === "success" &&
      !providerResult.error &&
      result
    ) {
      await upsertActiveHomepageFareSnapshot({
        origin,
        destination,
        departureDate: search.departureDate,
        currency: search.currency,
        provider: providerResult.provider || PROVIDER_NAME,
        result,
      });
      counts.refreshed += 1;
      return;
    }

    if (providerResult.status === "failed") {
      const classification =
        classifyHomepageFareProviderFailure(providerResult);

      if (classification.status === HomepageFareSnapshotStatus.UNAVAILABLE) {
        await upsertUnavailableHomepageFareSnapshot({
          origin,
          destination,
          departureDate: search.departureDate,
          currency: search.currency,
          provider: providerResult.provider || PROVIDER_NAME,
          reason: classification.reason,
        });
        counts.unavailable += 1;
        return;
      }

      await upsertFailedHomepageFareSnapshot({
        origin,
        destination,
        departureDate: search.departureDate,
        currency: search.currency,
        provider: providerResult.provider || PROVIDER_NAME,
        reason: classification.reason,
      });
      counts.failed += 1;
      return;
    }

    await upsertUnavailableHomepageFareSnapshot({
      origin,
      destination,
      departureDate: search.departureDate,
      currency: search.currency,
      provider: providerResult.provider || PROVIDER_NAME,
      reason:
        providerResult.status === "skipped"
          ? "provider_skipped"
          : "no_fare_returned",
    });
    counts.unavailable += 1;
  } catch {
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

  return {
    status: HomepageFareSnapshotStatus.FAILED,
    reason: "provider_failed",
  };
}

function getRefreshRoutes(
  scope: HomepageFareRefreshScope,
): HomepageRefreshRoute[] {
  const routes: HomepageRefreshRoute[] = [];

  for (const route of getPhase3AHomepageFareRoutes()) {
    const isPopularRoute = route.id.startsWith("popular-");
    const isDiscoverRoute = route.id.startsWith("discover-");

    if (
      scope === "all-phase-3a" ||
      (scope === "popular" && isPopularRoute) ||
      ((scope === "discover" ||
        scope === "discover-default" ||
        scope === "discover-first-6") &&
        isDiscoverRoute)
    ) {
      routes.push({
        origin: route.origin,
        destination: route.destination,
      });
    }
  }

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
    return {
      routes: [],
      summary,
      health: classifyHomepageFareSnapshotHealth(summary),
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

  return {
    routes: statusRoutes,
    summary,
    health: classifyHomepageFareSnapshotHealth(summary),
  };
}

export async function upsertActiveHomepageFareSnapshot({
  origin,
  destination,
  departureDate,
  currency = DEFAULT_CURRENCY,
  provider,
  result,
  searchedAt = new Date(),
}: {
  origin: string;
  destination: string;
  departureDate: string;
  currency?: string;
  provider: string;
  result: NormalizedFlightResult;
  searchedAt?: Date;
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
  const snapshotKey = buildHomepageFareSnapshotKey({
    origin,
    destination,
    tripType: input.tripType,
    departureDate,
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

function classifyHomepageFareSnapshotHealth(
  summary: HomepageFareSnapshotStatusSummary,
): HomepageFareSnapshotHealth {
  const total = summary.total;

  if (total <= 0) {
    return {
      status: "attention",
      label: "Needs attention",
      message: "Homepage fare routes are not configured for the status panel.",
    };
  }

  const freshRatio = summary.fresh / total;
  const failedRatio = summary.failed / total;
  const staleOrMissingRatio =
    (summary.expired + summary.failed + summary.missing) / total;
  const affectedRatio =
    (summary.expired + summary.unavailable + summary.failed + summary.missing) /
    total;
  const lowFailedCount = summary.failed <= Math.max(1, Math.floor(total * 0.1));

  if (
    summary.fresh === 0 ||
    staleOrMissingRatio > 0.5 ||
    affectedRatio >= 0.7 ||
    failedRatio >= 0.5
  ) {
    return {
      status: "attention",
      label: "Needs attention",
      message:
        "Homepage fares are missing or stale. Refresh fares before relying on homepage prices.",
    };
  }

  if (freshRatio >= 0.7 && lowFailedCount) {
    return {
      status: "healthy",
      label: "Healthy",
      message: "Most homepage fares are fresh and ready to display.",
    };
  }

  return {
    status: "warning",
    label: "Warning",
    message:
      "Some homepage fare snapshots need attention. Refresh fares or check provider status.",
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
  };
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
