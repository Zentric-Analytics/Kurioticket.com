import { NextResponse } from "next/server";

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
const MAX_DESTINATIONS = 5;
const CACHE_TTL_MS = 20 * 60 * 1000;
const UNAVAILABLE_TTL_MS = 5 * 60 * 1000;
const CONCURRENCY_LIMIT = 2;
const AIRPORT_OR_CITY_CODE_PATTERN = /^[A-Z]{3}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

type HomepageDestinationId = keyof typeof HOMEPAGE_DESTINATIONS;

type DestinationPrice = {
  id: string;
  code: string;
  price?: number;
  currency?: string;
  providerBacked: boolean;
  searchedAt: string;
  expiresAt?: string;
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
    return NextResponse.json({ error: "Invalid destination price request." }, { status: 400 });
  }

  const originValidation = validateCode(readStringProperty(payload, "origin"));
  const origin = originValidation ?? DEFAULT_ORIGIN;
  const originSource = originValidation ? "request" : "default";
  const currency = validateCurrency(readStringProperty(payload, "currency")) ?? DEFAULT_CURRENCY;
  const destinations = readDestinations(payload).slice(0, MAX_DESTINATIONS);
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

  const prices = await mapWithConcurrency(destinations, CONCURRENCY_LIMIT, (destination) =>
    getDestinationPrice({
      origin,
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
  origin,
  destination,
  departureDate,
  currency,
}: {
  origin: string;
  destination: { id: HomepageDestinationId; code: string };
  departureDate: string;
  currency: string;
}): Promise<DestinationPrice> {
  const cacheKey = [origin, destination.code, "one-way", departureDate, "economy", "1-0-0", currency].join(":");
  const cached = destinationPriceCache.get(cacheKey);
  const nowMs = Date.now();

  if (cached && cached.expiresAtMs > nowMs) {
    return cached.value;
  }

  const searchedAt = new Date(nowMs).toISOString();

  try {
    const search: FlightSearchParams = {
      tripType: "one-way",
      origin,
      destination: destination.code,
      departureDate,
      adults: 1,
      children: 0,
      infants: 0,
      travelers: 1,
      cabinClass: "economy",
      sort: "cheapest",
      currency,
    };
    const providerResult = await searchDuffelFlights(search);
    const hasProviderIssue =
      providerResult.status !== "success" ||
      Boolean(providerResult.error) ||
      providerResult.provider.toLowerCase().includes("fallback");
    const result = providerResult.results.find(
      (flight) => Number.isFinite(flight.price) && flight.price > 0 && validateCurrency(flight.currency),
    );

    if (!hasProviderIssue && result) {
      const expiresAtMs = nowMs + CACHE_TTL_MS;
      const value: DestinationPrice = {
        id: destination.id,
        code: destination.code,
        price: result.price,
        currency: result.currency,
        providerBacked: true,
        searchedAt,
        expiresAt: new Date(expiresAtMs).toISOString(),
      };

      destinationPriceCache.set(cacheKey, { value, expiresAtMs });
      return value;
    }
  } catch {
    // Keep passive homepage checks safe and partial. Provider details and credentials are never returned.
  }

  const expiresAtMs = nowMs + UNAVAILABLE_TTL_MS;
  const value: DestinationPrice = {
    id: destination.id,
    code: destination.code,
    providerBacked: false,
    searchedAt,
    expiresAt: new Date(expiresAtMs).toISOString(),
    unavailable: true,
  };

  destinationPriceCache.set(cacheKey, { value, expiresAtMs });
  return value;
}

function readDestinations(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.destinations)) return [];

  const seen = new Set<string>();
  const destinations: Array<{ id: HomepageDestinationId; code: string }> = [];

  for (const item of payload.destinations) {
    if (!isRecord(item)) continue;

    const id = typeof item.id === "string" ? item.id : "";
    const code = validateCode(typeof item.code === "string" ? item.code : undefined);

    if (!isHomepageDestinationId(id) || code !== HOMEPAGE_DESTINATIONS[id] || seen.has(id)) continue;

    seen.add(id);
    destinations.push({ id, code });
  }

  return destinations;
}

function readStringProperty(payload: unknown, key: string) {
  if (!isRecord(payload)) return undefined;
  const value = payload[key];
  return typeof value === "string" ? value : undefined;
}

function validateCode(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && AIRPORT_OR_CITY_CODE_PATTERN.test(normalized) ? normalized : undefined;
}

function validateCurrency(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && CURRENCY_PATTERN.test(normalized) ? normalized : undefined;
}

function isHomepageDestinationId(value: string): value is HomepageDestinationId {
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
  const daysToAdd = daysUntilFriday <= daysUntilSaturday ? daysUntilFriday : daysUntilSaturday;

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

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
