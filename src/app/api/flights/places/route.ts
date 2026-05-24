import { NextResponse } from "next/server";

import { getDefaultAirports, type AirportOption } from "@/data/airports";
import { resolveCountryCode } from "@/lib/geo/context";
import { searchDuffelPlaces } from "@/services/travel/providers/duffelProvider";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;
const SAFE_QUERY = /^[\p{L}\p{N}\s'.,\-()]+$/u;
const MAX_RADIUS_KM = 150;
const COUNTRY_NAME_BY_CODE: Record<string, string> = {
  US: "United States",
  NG: "Nigeria",
  GB: "United Kingdom",
  CA: "Canada",
  AE: "United Arab Emirates",
  FR: "France",
  DE: "Germany",
  NL: "Netherlands",
  ES: "Spain",
  IT: "Italy",
};


const CONFIDENT_RECOMMENDATION_THRESHOLD = 0.7;

type RecommendedOrigin = {
  code: string;
  city: string;
  airport: string;
  country?: string;
  lat?: number;
  lon?: number;
  confidence: number;
};

const toRecommendedOrigin = (airport: AirportOption, confidence: number): RecommendedOrigin => ({
  code: airport.code,
  city: airport.city,
  airport: airport.airport,
  country: airport.country,
  lat: airport.lat,
  lon: airport.lon,
  confidence,
});

type SearchContext = "origin" | "destination";

const toBoundedNumber = (value: string | null, min: number, max: number) => {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined;
  return parsed;
};

const normalizeContext = (value: string | null): SearchContext => {
  if (value === "destination") return "destination";
  return "origin";
};

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = (searchParams.get("q") || "").trim();
  const context = normalizeContext(searchParams.get("context"));
  const locale = searchParams.get("locale") || undefined;
  const lat = toBoundedNumber(searchParams.get("lat"), -90, 90);
  const lng = toBoundedNumber(searchParams.get("lng"), -180, 180);
  const rawRadius = toBoundedNumber(searchParams.get("radius"), 1, MAX_RADIUS_KM);
  const radiusKm = rawRadius ? Math.min(rawRadius, MAX_RADIUS_KM) : undefined;
  const isDefault = searchParams.get("default") === "true";
  const defaultOriginRequested = searchParams.get("defaultOrigin") === "true";

  const countryCode = resolveCountryCode({
    explicitCountryCode: searchParams.get("countryCode"),
    headerCountryCodes: [
      request.headers.get("cf-ipcountry"),
      request.headers.get("x-vercel-ip-country"),
      request.headers.get("x-country"),
    ],
    locale,
  });

  if (defaultOriginRequested && context === "origin" && query.length === 0) {
    const ranked = getDefaultAirports({ context: "origin", countryCode, limit: 2 });
    const topMatch = ranked[0];

    if (!topMatch || !countryCode) {
      return NextResponse.json({ recommendedOrigin: null });
    }

    const secondMatch = ranked[1];
    const expectedCountryName = countryCode ? COUNTRY_NAME_BY_CODE[countryCode] : undefined;
    const topCountryMatch = Boolean(expectedCountryName && topMatch.country === expectedCountryName);
    const confidence = topCountryMatch && (!secondMatch || secondMatch.country !== topMatch.country) ? 0.85 : 0.75;

    if (confidence < CONFIDENT_RECOMMENDATION_THRESHOLD) {
      return NextResponse.json({ recommendedOrigin: null });
    }

    return NextResponse.json({
      recommendedOrigin: toRecommendedOrigin(topMatch, confidence),
      source: "coarse-context",
    });
  }

  const isQueryValid =
    query.length >= MIN_QUERY_LENGTH && query.length <= MAX_QUERY_LENGTH && SAFE_QUERY.test(query);

  if (isQueryValid) {
    const providerResult = await searchDuffelPlaces(query, { context, lat, lng, radiusKm, countryCode, locale });
    if (providerResult.status !== "success") {
      return NextResponse.json({ suggestions: [], fallback: true, error: "Suggestions are temporarily unavailable." });
    }
    return NextResponse.json({ suggestions: providerResult.results });
  }

  if (isDefault && query.length === 0) {
    return NextResponse.json({
      suggestions: getDefaultAirports({ context, countryCode, lat, lon: lng, limit: 8 }),
      source: "curated",
    });
  }

  return NextResponse.json({ suggestions: [] });
}
