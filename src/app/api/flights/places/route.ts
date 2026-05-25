import { NextResponse } from "next/server";

import { airports, getDefaultAirports, type AirportOption } from "@/data/airports";
import { localeToCountryCode, normalizeCountryCode } from "@/lib/geo/context";
import { extractVisitorIp, resolveIpinfoLiteCountryContext } from "@/lib/geo/ipinfo";
import { searchDuffelPlaces } from "@/services/travel/providers/duffelProvider";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;
const SAFE_QUERY = /^[\p{L}\p{N}\s'.,\-()]+$/u;
const MAX_RADIUS_KM = 150;
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

const normalizeName = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();

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
  const headerCity =
    request.headers.get("x-vercel-ip-city") ||
    request.headers.get("cf-ipcity") ||
    request.headers.get("x-city");
  const normalizedHeaderCity = headerCity ? normalizeName(headerCity) : "";
  const headerLat = toBoundedNumber(
    request.headers.get("x-vercel-ip-latitude") || request.headers.get("cf-iplatitude"),
    -90,
    90,
  );
  const headerLng = toBoundedNumber(
    request.headers.get("x-vercel-ip-longitude") || request.headers.get("cf-iplongitude"),
    -180,
    180,
  );
  const resolvedLat = typeof lat === "number" ? lat : headerLat;
  const resolvedLng = typeof lng === "number" ? lng : headerLng;

  const explicitCountryCode = normalizeCountryCode(searchParams.get("countryCode"));
  const headerCountryCode = [
    request.headers.get("cf-ipcountry"),
    request.headers.get("x-vercel-ip-country"),
    request.headers.get("x-country"),
  ]
    .map((value) => normalizeCountryCode(value))
    .find(Boolean);
  const visitorIp = extractVisitorIp(request.headers);
  const ipinfoCountryContext = !explicitCountryCode && !headerCountryCode && visitorIp
    ? await resolveIpinfoLiteCountryContext(visitorIp)
    : null;
  const localeCountryCode = localeToCountryCode(locale);
  const countryCode = explicitCountryCode || headerCountryCode || ipinfoCountryContext?.countryCode || localeCountryCode;

  if (defaultOriginRequested && context === "origin" && query.length === 0) {
    let recommended: AirportOption | undefined;
    let confidence = 0;
    let source: "latlng" | "city" | undefined;

    if (typeof resolvedLat === "number" && typeof resolvedLng === "number") {
      recommended = getDefaultAirports({
        context: "origin",
        lat: resolvedLat,
        lon: resolvedLng,
        limit: 1,
      })[0];
      confidence = recommended ? 0.92 : 0;
      source = recommended ? "latlng" : undefined;
    } else if (normalizedHeaderCity) {
      recommended = airports.find((airport) => normalizeName(airport.city) === normalizedHeaderCity);
      confidence = recommended ? 0.85 : 0;
      source = recommended ? "city" : undefined;
    }

    if (!recommended || confidence < CONFIDENT_RECOMMENDATION_THRESHOLD) {
      return NextResponse.json({ recommendedOrigin: null });
    }

    return NextResponse.json({
      recommendedOrigin: toRecommendedOrigin(recommended, confidence),
      source,
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
