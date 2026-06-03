import { NextResponse } from "next/server";

import { getHomeDiscoveryRouteAllowlist } from "@/data/homeDiscovery";
import type { FlightSearchParams } from "@/lib/types";
import { searchDuffelFlights } from "@/services/travel/providers/duffelProvider";

const HOMEPAGE_DESTINATIONS = {
  dubai: "DXB",
  london: "LHR",
  paris: "CDG",
  bali: "DPS",
  "new-york": "JFK",
} as const;

const DEFAULT_ORIGIN = "JFK";
const DEFAULT_CURRENCY = "USD";
const MAX_POPULAR_DESTINATIONS = 5;
const DISCOVER_PRICE_CAP = 6;
const CACHE_TTL_MS = 20 * 60 * 1000;
const UNAVAILABLE_TTL_MS = 5 * 60 * 1000;
const CONCURRENCY_LIMIT = 2;
const AIRPORT_OR_CITY_CODE_PATTERN = /^[A-Z]{3}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const HOME_DISCOVERY_ROUTES = getHomeDiscoveryRouteAllowlist();
const ENABLE_HOMEPAGE_LIVE_PRICES =
  process.env.ENABLE_HOMEPAGE_LIVE_PRICES === "true";

type HomepageDestinationId = keyof typeof HOMEPAGE_DESTINATIONS;

type PriceDestination = {
  id: string;
  code: string;
  origin: string;
};

type DestinationPriceSearch = {
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

type DestinationPrice = {
  id: string;
  code: string;
  price?: number;
  currency?: string;
  providerBacked: boolean;
  searchedAt: string;
  expiresAt?: string;
  search?: DestinationPriceSearch;
  unavailable?: boolean;
};

type CacheRecord = {
  value: DestinationPrice;
  expiresAtMs: number;
};

const destinationPriceCache = new Map<string, CacheRecord>();

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid destination price request." },
      { status: 400 },
    );
  }

  const originValidation = validateCode(readStringProperty(payload, "origin"));
  const origin = originValidation ?? DEFAULT_ORIGIN;
  const originSource = originValidation ? "request" : "default";
  const currency =
    validateCurrency(readStringProperty(payload, "currency")) ??
    DEFAULT_CURRENCY;
  const destinations = readDestinations(payload, origin);
  const departureDate = getNextWeekendDateAroundDaysOut(45);

  if (!destinations.length) {
    return NextResponse.json(
      {
        origin,
        originSource,
        dateStrategy: {
          tripType: "one-way",
          departureDate,
        },
        prices: [],
      },
      { status: 200 },
    );
  }

  const prices = await mapWithConcurrency(
    destinations,
    CONCURRENCY_LIMIT,
    (destination) =>
      getDestinationPrice({
        destination,
        departureDate,
        currency,
      }),
  );

  return NextResponse.json({
    origin,
    originSource,
    dateStrategy: {
      tripType: "one-way",
      departureDate,
    },
    prices,
  });
}

async function getDestinationPrice({
  destination,
  departureDate,
  currency,
}: {
  destination: PriceDestination;
  departureDate: string;
  currency: string;
}): Promise<DestinationPrice> {
  const cacheKey = [
    destination.origin,
    destination.code,
    "one-way",
    departureDate,
    "economy",
    "1-0-0",
    currency,
    ENABLE_HOMEPAGE_LIVE_PRICES ? "live" : "unavailable",
  ].join(":");
  const cached = destinationPriceCache.get(cacheKey);
  const nowMs = Date.now();

  if (cached && cached.expiresAtMs > nowMs) {
    return { ...cached.value, id: destination.id, code: destination.code };
  }

  const searchedAt = new Date(nowMs).toISOString();

  const resultSearch: DestinationPriceSearch = {
    tripType: "one-way",
    origin: destination.origin,
    destination: destination.code,
    departureDate,
    travelers: 1,
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "economy",
    currency,
  };

  if (!ENABLE_HOMEPAGE_LIVE_PRICES) {
    const value = createUnavailableDestinationPrice({
      destination,
      nowMs,
      searchedAt,
    });

    destinationPriceCache.set(cacheKey, {
      value,
      expiresAtMs: nowMs + UNAVAILABLE_TTL_MS,
    });
    return value;
  }

  try {
    const providerSearch: FlightSearchParams = {
      ...resultSearch,
      sort: "cheapest",
    };
    const providerResult = await searchDuffelFlights(providerSearch);
    const hasProviderIssue =
      providerResult.status !== "success" ||
      Boolean(providerResult.error) ||
      providerResult.provider.toLowerCase().includes("fallback");
    const result = providerResult.results.find(
      (flight) =>
        Number.isFinite(flight.price) &&
        flight.price > 0 &&
        validateCurrency(flight.currency) === currency,
    );

    if (!hasProviderIssue && result) {
      const expiresAtMs = nowMs + CACHE_TTL_MS;
      const value: DestinationPrice = {
        id: destination.id,
        code: destination.code,
        price: result.price,
        currency,
        providerBacked: true,
        searchedAt,
        expiresAt: new Date(expiresAtMs).toISOString(),
        search: resultSearch,
      };

      destinationPriceCache.set(cacheKey, { value, expiresAtMs });
      return value;
    }
  } catch {
    // Keep passive homepage checks safe and partial. Provider details and credentials are never returned.
  }

  const value = createUnavailableDestinationPrice({
    destination,
    nowMs,
    searchedAt,
  });

  destinationPriceCache.set(cacheKey, {
    value,
    expiresAtMs: nowMs + UNAVAILABLE_TTL_MS,
  });
  return value;
}

function createUnavailableDestinationPrice({
  destination,
  nowMs,
  searchedAt,
}: {
  destination: PriceDestination;
  nowMs: number;
  searchedAt: string;
}): DestinationPrice {
  const expiresAtMs = nowMs + UNAVAILABLE_TTL_MS;

  return {
    id: destination.id,
    code: destination.code,
    providerBacked: false,
    searchedAt,
    expiresAt: new Date(expiresAtMs).toISOString(),
    unavailable: true,
  };
}

function readDestinations(payload: unknown, defaultOrigin: string) {
  if (!isRecord(payload) || !Array.isArray(payload.destinations)) return [];

  const seen = new Set<string>();
  const destinations: PriceDestination[] = [];
  let popularCount = 0;
  let discoveryCount = 0;

  for (const item of payload.destinations) {
    if (!isRecord(item)) continue;

    const discoveryDestination = readDiscoveryDestination(item);

    if (discoveryDestination) {
      if (
        discoveryCount >= DISCOVER_PRICE_CAP ||
        seen.has(discoveryDestination.id)
      )
        continue;

      seen.add(discoveryDestination.id);
      destinations.push(discoveryDestination);
      discoveryCount += 1;
      continue;
    }

    const popularDestination = readPopularDestination(item, defaultOrigin);

    if (!popularDestination) continue;
    if (
      popularCount >= MAX_POPULAR_DESTINATIONS ||
      seen.has(popularDestination.id)
    )
      continue;

    seen.add(popularDestination.id);
    destinations.push(popularDestination);
    popularCount += 1;
  }

  return destinations;
}

function readPopularDestination(
  item: Record<string, unknown>,
  defaultOrigin: string,
): PriceDestination | undefined {
  const id = typeof item.id === "string" ? item.id : "";
  const code = validateCode(
    typeof item.code === "string" ? item.code : undefined,
  );

  if (!isHomepageDestinationId(id) || code !== HOMEPAGE_DESTINATIONS[id])
    return undefined;

  return { id, code, origin: defaultOrigin };
}

function readDiscoveryDestination(
  item: Record<string, unknown>,
): PriceDestination | undefined {
  const id = typeof item.id === "string" ? item.id : "";
  const originCode = validateCode(
    typeof item.originCode === "string" ? item.originCode : undefined,
  );
  const destinationCode = validateCode(
    typeof item.destinationCode === "string"
      ? item.destinationCode
      : typeof item.code === "string"
        ? item.code
        : undefined,
  );
  const allowedRoute = HOME_DISCOVERY_ROUTES.get(id);

  if (!allowedRoute || !originCode || !destinationCode) return undefined;
  if (
    originCode !== allowedRoute.originCode ||
    destinationCode !== allowedRoute.destinationCode
  )
    return undefined;

  return { id, code: destinationCode, origin: originCode };
}

function readStringProperty(payload: unknown, key: string) {
  if (!isRecord(payload)) return undefined;
  const value = payload[key];
  return typeof value === "string" ? value : undefined;
}

function validateCode(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && AIRPORT_OR_CITY_CODE_PATTERN.test(normalized)
    ? normalized
    : undefined;
}

function validateCurrency(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && CURRENCY_PATTERN.test(normalized)
    ? normalized
    : undefined;
}

function isHomepageDestinationId(
  value: string,
): value is HomepageDestinationId {
  return Object.prototype.hasOwnProperty.call(HOMEPAGE_DESTINATIONS, value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getNextWeekendDateAroundDaysOut(daysOut: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + daysOut);

  const day = date.getUTCDay();
  const daysUntilFriday = (5 - day + 7) % 7;
  const daysUntilSaturday = (6 - day + 7) % 7;
  const daysToAdd =
    daysUntilFriday <= daysUntilSaturday ? daysUntilFriday : daysUntilSaturday;

  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}
