import type { FlightSearchParams, NormalizedFlightResult, ProviderResult } from "@/lib/types";
import { sanitizeAirportCode } from "@/lib/utils";
import { normalizeFlightResult } from "@/services/travel/normalizeFlightResult";
import { fetchJson, runProvider, skippedProvider } from "@/services/travel/providerUtils";
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
};

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

    const passengers = Array.from({ length: search.travelers }, () => ({ type: "adult" as const }));
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

const rankPlaces = (places: DuffelPlaceSuggestion[], searchContext?: PlaceSearchContext) => {
  if (!searchContext?.lat || !searchContext?.lng || !searchContext.context) {
    return places;
  }

  const withIndex = places.map((place, index) => ({ place, index }));

  const distanceFor = (place: DuffelPlaceSuggestion) => {
    if (typeof place.latitude !== "number" || typeof place.longitude !== "number") {
      return Number.POSITIVE_INFINITY;
    }

    return distanceKm(searchContext.lat!, searchContext.lng!, place.latitude, place.longitude);
  };

  const destinationBoost = searchContext.context === "destination" ? 0.12 : 1;

  return withIndex
    .sort((a, b) => {
      const aDistance = distanceFor(a.place);
      const bDistance = distanceFor(b.place);

      if (searchContext.context === "origin") {
        if (aDistance !== bDistance) {
          return aDistance - bDistance;
        }
      }

      if (searchContext.context === "destination") {
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

export async function searchDuffelPlaces(query: string, searchContext?: PlaceSearchContext): Promise<ProviderResult<DuffelPlaceSuggestion>> {
  const apiKey = process.env.DUFFEL_API_KEY;
  if (!apiKey) {
    return skippedProvider("DuffelPlaces", "Missing DUFFEL_API_KEY.");
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

    const seen = new Set<string>();
    const results: DuffelPlaceSuggestion[] = [];

    for (const item of response.data || []) {
      const code = (item.iata_code || "").trim().toUpperCase();
      const city = (item.city_name || item.city?.name || item.name || "").trim();
      const airport = (item.name || city || code).trim();

      if (!code || !city || !airport) continue;

      const key = `${code}|${airport}`;
      if (seen.has(key)) continue;
      seen.add(key);

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

    return rankPlaces(results, searchContext).slice(0, 8);
  });
}
