import { HomepageFareSnapshotStatus, Prisma } from "@/generated/prisma/client";

import {
  DEFAULT_HOME_DISCOVERY_REGION,
  getHomeDiscoveryByRegion,
  HOME_DISCOVERY_PRICE_CAP,
} from "@/data/homeDiscovery";
import { getOptionalPrisma } from "@/lib/prisma";
import type { NormalizedFlightResult } from "@/lib/types";

const AIRPORT_OR_CITY_CODE_PATTERN = /^[A-Z]{3}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const DEFAULT_TRIP_TYPE = "one-way";
const DEFAULT_CABIN_CLASS = "economy";
const DEFAULT_TRAVELERS = 1;
const DEFAULT_CURRENCY = "USD";
const ACTIVE_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
const UNAVAILABLE_SNAPSHOT_TTL_MS = 6 * 60 * 60 * 1000;
const FAILED_SNAPSHOT_TTL_MS = 60 * 60 * 1000;

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

export type HomepageFareSnapshotStatusResponse = {
  routes: HomepageFareSnapshotStatusRoute[];
  summary: HomepageFareSnapshotStatusSummary;
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

export function normalizeHomepageFareCurrency(value: string | undefined | null) {
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
  const returnDate = input.returnDate ? formatDateKey(input.returnDate) : "none";

  if (!origin || !destination) {
    throw new Error("Homepage fare snapshot routes require valid airport codes.");
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
  const discoverRoutes = getHomeDiscoveryByRegion(DEFAULT_HOME_DISCOVERY_REGION)
    .slice(0, HOME_DISCOVERY_PRICE_CAP)
    .map((route) => ({
      id: `discover-${route.id}`,
      label: route.title,
      origin: route.originCode,
      destination: route.destinationCode,
    }));

  return dedupeHomepageFareRoutes([...popularRoutes, ...discoverRoutes]);
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

  if (!eligibleRoutes.length) return { routes: [], summary };

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

  return { routes: statusRoutes, summary };
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
    throw new Error("Active homepage fare snapshots require a finite provider price.");
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

function normalizeRoute(route: HomepageFareRoute): HomepageFareRoute | undefined {
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
    throw new Error("Homepage fare snapshot writes require valid airport codes.");
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
