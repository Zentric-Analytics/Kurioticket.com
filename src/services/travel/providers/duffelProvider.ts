import {
  assertProductionLiveProvider,
  assertSandboxProviderAllowed,
  getDuffelApiMode,
  isProductionProviderMode,
} from "@/lib/env";
import type { FlightSearchParams, NormalizedFlightResult, ProviderResult } from "@/lib/types";
import { sanitizeAirportCode } from "@/lib/utils";
import { normalizeFlightResult } from "@/services/travel/normalizeFlightResult";
import { fetchJson, runProvider, skippedProvider } from "@/services/travel/providerUtils";
import { airports, type AirportOption } from "@/data/airports";
import { countryMatchesCode, normalizeCountryCode } from "@/lib/geo/context";
import { distanceKm } from "@/lib/geo/distance";

export type DuffelPlaceSuggestion = {
  code: string;
  city: string;
  airport: string;
  country?: string;
  duffelPlaceId?: string;
  type?: "airport" | "city" | string;
  latitude?: number;
  longitude?: number;
};

export type PlaceSearchContext = {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  context?: "origin" | "destination";
  countryCode?: string;
  locale?: string;
};

function getDuffelProviderBlockReason(apiKey: string) {
  const apiMode = getDuffelApiMode();

  try {
    assertProductionLiveProvider("Duffel", apiMode);

    if (apiMode === "test") {
      assertSandboxProviderAllowed("Duffel");
    }
  } catch {
    return "provider_mode_not_allowed";
  }

  if (isProductionProviderMode() && apiKey.trim().startsWith("duffel_test_")) {
    return "provider_mode_not_allowed";
  }

  return undefined;
}

const cabinClassMap: Record<FlightSearchParams["cabinClass"], string> = {
  economy: "economy",
  "premium-economy": "premium_economy",
  business: "business",
  first: "first",
};

export function searchDuffelFlights(search: FlightSearchParams): Promise<ProviderResult<NormalizedFlightResult>> {
  const apiKey = process.env.DUFFEL_API_KEY;
  if (!apiKey) {
    return Promise.resolve(skippedProvider("Duffel", "Missing DUFFEL_API_KEY."));
  }

  const blockReason = getDuffelProviderBlockReason(apiKey);
  if (blockReason) {
    return Promise.resolve(skippedProvider("Duffel", blockReason));
  }

  return runProvider("Duffel", async () => {
    const slices = [
      {
        origin: sanitizeAirportCode(search.origin),
        destination: sanitizeAirportCode(search.destination),
        departure_date: search.departureDate,
      },
    ];

    if (search.tripType === "round-trip" && search.returnDate) {
      slices.push({
        origin: sanitizeAirportCode(search.destination),
        destination: sanitizeAirportCode(search.origin),
        departure_date: search.returnDate,
      });
    }

    const passengers = [
      ...Array.from({ length: search.adults }, () => ({ type: "adult" as const })),
      ...Array.from({ length: search.children }, () => ({ type: "child" as const })),
      ...Array.from({ length: search.infants }, () => ({ type: "infant_without_seat" as const })),
    ];
    const data = await fetchJson<{ data?: { offers?: unknown[] } }>(
      "https://api.duffel.com/air/offer_requests?return_offers=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Duffel-Version": "v2",
        },
        body: JSON.stringify({
          data: {
            slices,
            passengers,
            cabin_class: cabinClassMap[search.cabinClass],
          },
        }),
      },
      16000,
    );

    return (data.data?.offers || [])
      .map((offer) => normalizeFlightResult("Duffel", offer, search))
      .filter(Boolean) as NormalizedFlightResult[];
  });
}

export async function checkDuffelHealth() {
  const apiKey = process.env.DUFFEL_API_KEY;
  const checkedAt = new Date().toISOString();

  if (!apiKey) {
    return {
      configured: false,
      connected: false,
      latencyMs: 0,
      lastError: "Missing DUFFEL_API_KEY.",
      checkedAt,
    };
  }

  const blockReason = getDuffelProviderBlockReason(apiKey);
  if (blockReason) {
    return {
      configured: true,
      connected: false,
      latencyMs: 0,
      lastError: blockReason,
      checkedAt,
    };
  }

  const result = await runProvider("Duffel", async () => {
    await fetchJson<{ data?: unknown[] }>(
      "https://api.duffel.com/air/offer_requests?limit=1",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Duffel-Version": "v2",
        },
      },
      9000,
    );

    return [{ ok: true }];
  });

  return {
    configured: true,
    connected: result.status === "success",
    latencyMs: result.latencyMs,
    lastError: result.error,
    checkedAt,
  };
}

type DuffelPlaceApiResponse = {
  data?: Array<{
    id?: string;
    type?: string;
    iata_code?: string;
    city_name?: string;
    city?: { name?: string };
    name?: string;
    country_name?: string;
    latitude?: number | string;
    longitude?: number | string;
  }>;
};

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const normalizeSuggestionText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();

const MAX_PLACE_SUGGESTIONS = 8;

const rankPlaces = (places: DuffelPlaceSuggestion[], searchContext?: PlaceSearchContext) => {
  const normalizedCountryCode = normalizeCountryCode(searchContext?.countryCode);
  const withIndex = places.map((place, index) => ({ place, index }));

  const distanceFor = (place: DuffelPlaceSuggestion) => {
    if (
      typeof searchContext?.lat !== "number" ||
      typeof searchContext?.lng !== "number" ||
      typeof place.latitude !== "number" ||
      typeof place.longitude !== "number"
    ) {
      return Number.POSITIVE_INFINITY;
    }

    return distanceKm(searchContext.lat, searchContext.lng, place.latitude, place.longitude);
  };

  const destinationBoost = searchContext?.context === "destination" ? 0.12 : 1;

  return withIndex
    .sort((a, b) => {
      const aDistance = distanceFor(a.place);
      const bDistance = distanceFor(b.place);

      if (normalizedCountryCode) {
        const aCountryMatch = countryMatchesCode(a.place.country, normalizedCountryCode) ? 1 : 0;
        const bCountryMatch = countryMatchesCode(b.place.country, normalizedCountryCode) ? 1 : 0;

        if (aCountryMatch !== bCountryMatch) {
          return bCountryMatch - aCountryMatch;
        }
      }

      if (searchContext?.context === "origin" && Number.isFinite(aDistance) && Number.isFinite(bDistance) && aDistance !== bDistance) {
        return aDistance - bDistance;
      }

      if (searchContext?.context === "destination") {
        const aScore = Number.isFinite(aDistance) ? aDistance * destinationBoost : Number.POSITIVE_INFINITY;
        const bScore = Number.isFinite(bDistance) ? bDistance * destinationBoost : Number.POSITIVE_INFINITY;
        if (aScore !== bScore) {
          return aScore - bScore;
        }
      }

      return a.index - b.index;
    })
    .map((item) => item.place);
};


const airportMatchesQuery = (airport: AirportOption, normalizedQuery: string) => {
  const haystack = [airport.code, airport.city, airport.airport, airport.country]
    .filter(Boolean)
    .map((value) => normalizeSuggestionText(value || ""));

  return haystack.some((value) => value.includes(normalizedQuery));
};

const curatedAirportToSuggestion = (airport: AirportOption): DuffelPlaceSuggestion => ({
  code: airport.code,
  city: airport.city,
  airport: airport.airport,
  country: airport.country,
  type: "airport",
  latitude: airport.lat,
  longitude: airport.lon,
});

const curatedQueryScore = (airport: AirportOption, normalizedQuery: string) => {
  const code = normalizeSuggestionText(airport.code);
  const city = normalizeSuggestionText(airport.city);
  const airportName = normalizeSuggestionText(airport.airport);

  if (code === normalizedQuery) return 0;
  if (code.startsWith(normalizedQuery)) return 1;
  if (city.startsWith(normalizedQuery)) return 2;
  if (airportName.startsWith(normalizedQuery)) return 3;
  if (city.includes(normalizedQuery)) return 4;
  if (airportName.includes(normalizedQuery)) return 5;
  return 6;
};

export const searchCuratedPlaceSuggestions = (query: string, searchContext?: PlaceSearchContext) => {
  const normalizedQuery = normalizeSuggestionText(query);
  const normalizedCountryCode = normalizeCountryCode(searchContext?.countryCode);

  if (!normalizedQuery || !normalizedCountryCode) return [];

  const matchingAirports = airports.filter((airport) => airportMatchesQuery(airport, normalizedQuery));
  const orderByCode = new Map(airports.map((airport, index) => [airport.code, index]));

  return rankPlaces(
    matchingAirports
      .sort((a, b) => {
        const aScore = curatedQueryScore(a, normalizedQuery);
        const bScore = curatedQueryScore(b, normalizedQuery);
        if (aScore !== bScore) return aScore - bScore;

        return (orderByCode.get(a.code) ?? 9999) - (orderByCode.get(b.code) ?? 9999);
      })
      .map(curatedAirportToSuggestion),
    searchContext,
  ).slice(0, MAX_PLACE_SUGGESTIONS);
};

const mergeProviderAndCuratedPlaces = (
  providerPlaces: DuffelPlaceSuggestion[],
  curatedPlaces: DuffelPlaceSuggestion[],
  searchContext?: PlaceSearchContext,
) => {
  const placesByCode = new Map<string, DuffelPlaceSuggestion>();

  for (const providerPlace of providerPlaces) {
    placesByCode.set(providerPlace.code, providerPlace);
  }

  for (const curatedPlace of curatedPlaces) {
    if (!placesByCode.has(curatedPlace.code)) {
      placesByCode.set(curatedPlace.code, curatedPlace);
    }
  }

  return rankPlaces([...placesByCode.values()], searchContext).slice(0, MAX_PLACE_SUGGESTIONS);
};

export async function searchDuffelPlaces(query: string, searchContext?: PlaceSearchContext): Promise<ProviderResult<DuffelPlaceSuggestion>> {
  const apiKey = process.env.DUFFEL_API_KEY;
  if (!apiKey) {
    return skippedProvider("DuffelPlaces", "Missing DUFFEL_API_KEY.");
  }

  const blockReason = getDuffelProviderBlockReason(apiKey);
  if (blockReason) {
    return skippedProvider("DuffelPlaces", blockReason);
  }

  return runProvider("DuffelPlaces", async () => {
    const response = await fetchJson<DuffelPlaceApiResponse>(
      `https://api.duffel.com/places/suggestions?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Duffel-Version": "v2",
        },
      },
      7000,
    );

    const seenCodes = new Set<string>();
    const seenNames = new Set<string>();
    const results: DuffelPlaceSuggestion[] = [];

    for (const item of response.data || []) {
      const code = (item.iata_code || "").trim().toUpperCase();
      const city = (item.city_name || item.city?.name || item.name || "").trim();
      const airport = (item.name || city || code).trim();

      if (!code || !city || !airport) continue;

      if (seenCodes.has(code)) continue;
      const nameKey = `${normalizeSuggestionText(city)}|${normalizeSuggestionText(airport)}`;
      if (seenNames.has(nameKey)) continue;

      seenCodes.add(code);
      seenNames.add(nameKey);

      results.push({
        code,
        city,
        airport,
        country: item.country_name?.trim() || undefined,
        duffelPlaceId: item.id?.trim() || undefined,
        type: item.type === "city" ? "city" : item.type === "airport" ? "airport" : item.type,
        latitude: toNumber(item.latitude),
        longitude: toNumber(item.longitude),
      });
    }

    return mergeProviderAndCuratedPlaces(results, searchCuratedPlaceSuggestions(query, searchContext), searchContext);
  });
}
