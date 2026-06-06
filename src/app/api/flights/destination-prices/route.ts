import { NextResponse } from "next/server";

import {
  DEFAULT_HOME_DISCOVERY_ELIGIBLE_FLIGHT_ROUTE_COUNT,
  getHomeDiscoveryRouteAllowlist,
} from "@/data/homeDiscovery";
import { getPopularDestinationAllowlist } from "@/data/marketHomeContent";
import {
  getHomepageFareDateStrategy,
  HOMEPAGE_FARE_DEFAULT_CURRENCY,
  HOMEPAGE_FARE_DEFAULT_ORIGIN,
  normalizeHomepageFareCode,
  normalizeHomepageFareCurrency,
  PHASE_3A_POPULAR_HOMEPAGE_FARE_ROUTES,
  readHomepageFareSnapshotResponseEntries,
} from "@/services/homepageFareSnapshotService";

const HOMEPAGE_DESTINATIONS = Object.fromEntries(
  PHASE_3A_POPULAR_HOMEPAGE_FARE_ROUTES.map((route) => [
    route.id,
    {
      code: route.destination,
      originCode: HOMEPAGE_FARE_DEFAULT_ORIGIN,
    },
  ]),
) as Record<string, { code: string; originCode: string }>;
const MARKET_HOMEPAGE_DESTINATIONS = getPopularDestinationAllowlist();
const MAX_POPULAR_DESTINATIONS = 8;
const DISCOVER_PRICE_CAP = DEFAULT_HOME_DISCOVERY_ELIGIBLE_FLIGHT_ROUTE_COUNT;
const HOME_DISCOVERY_ROUTES = getHomeDiscoveryRouteAllowlist();

type PriceDestination = {
  id: string;
  code: string;
  origin: string;
};

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

  const originValidation = normalizeHomepageFareCode(
    readStringProperty(payload, "origin"),
  );
  const origin = originValidation ?? HOMEPAGE_FARE_DEFAULT_ORIGIN;
  const originSource = originValidation ? "request" : "default";
  const currency =
    normalizeHomepageFareCurrency(readStringProperty(payload, "currency")) ??
    HOMEPAGE_FARE_DEFAULT_CURRENCY;
  const requestedRegionCode = normalizeHomepageFareRegionCode(
    readStringProperty(payload, "regionCode"),
  );
  const effectiveMarketCode = readSafeMarketCode(
    readStringProperty(payload, "effectiveMarketCode"),
    requestedRegionCode,
  );
  const fallbackLevel = readSafeFallbackLevel(
    readStringProperty(payload, "fallbackLevel"),
  );
  const fallbackUsed = readBooleanProperty(payload, "fallbackUsed");
  const destinations = readDestinations(payload, origin);
  const dateStrategy = getHomepageFareDateStrategy();

  if (!destinations.length) {
    return NextResponse.json(
      {
        origin,
        originSource,
        dateStrategy: {
          tripType: dateStrategy.tripType,
          departureDate: dateStrategy.departureDate,
        },
        requestedRegionCode,
        effectiveMarketCode,
        fallbackLevel: "none",
        fallbackUsed,
        prices: [],
      },
      { status: 200 },
    );
  }

  const prices = await readHomepageFareSnapshotResponseEntries({
    routes: destinations.map((destination) => ({
      id: destination.id,
      origin: destination.origin,
      destination: destination.code,
    })),
    departureDate: dateStrategy.departureDate,
    currency,
  });

  return NextResponse.json({
    origin,
    originSource,
    dateStrategy: {
      tripType: dateStrategy.tripType,
      departureDate: dateStrategy.departureDate,
    },
    requestedRegionCode,
    effectiveMarketCode,
    fallbackLevel,
    fallbackUsed,
    destinationMarket: effectiveMarketCode,
    prices,
  });
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
        seen.has(discoveryDestination.id) ||
        discoveryDestination.origin === discoveryDestination.code
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
      seen.has(popularDestination.id) ||
      popularDestination.origin === popularDestination.code
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
  const code = normalizeHomepageFareCode(
    typeof item.code === "string" ? item.code : undefined,
  );

  const allowedDestination = getAllowedHomepageDestination(id);
  const originCode = normalizeHomepageFareCode(
    typeof item.originCode === "string" ? item.originCode : undefined,
  );
  const requestedOrigin = originCode ?? defaultOrigin;

  if (
    !allowedDestination ||
    code !== allowedDestination.code ||
    requestedOrigin !== allowedDestination.originCode
  ) {
    return undefined;
  }

  return { id, code, origin: requestedOrigin };
}

function readDiscoveryDestination(
  item: Record<string, unknown>,
): PriceDestination | undefined {
  const id = typeof item.id === "string" ? item.id : "";
  const originCode = normalizeHomepageFareCode(
    typeof item.originCode === "string" ? item.originCode : undefined,
  );
  const destinationCode = normalizeHomepageFareCode(
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

function readBooleanProperty(payload: unknown, key: string) {
  if (!isRecord(payload)) return false;

  return payload[key] === true;
}

function readSafeMarketCode(value: string | undefined, fallback: string) {
  const normalized = value?.trim().toUpperCase();

  return normalized && /^[A-Z_]{2,20}$/.test(normalized) ? normalized : fallback;
}

function readSafeFallbackLevel(value: string | undefined) {
  return value === "exact-country" ||
    value === "regional" ||
    value === "global" ||
    value === "neutral"
    ? value
    : "exact-country";
}

function getAllowedHomepageDestination(value: string) {
  return MARKET_HOMEPAGE_DESTINATIONS.get(value) ?? HOMEPAGE_DESTINATIONS[value];
}

function normalizeHomepageFareRegionCode(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();

  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : "US";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
