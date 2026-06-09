import { NextResponse } from "next/server";

import { getDefaultAirports } from "@/data/airports";
import { getCityAwareOriginAirports, prioritizeOriginSuggestions } from "@/lib/flights/originAirportSuggestions";
import { normalizeCountryCode } from "@/lib/geo/context";
import { resolveMaxMindGeoIpLocationForRequest } from "@/lib/geo/maxmind";
import { extractVisitorIp, resolveIpinfoLiteCountryContext } from "@/lib/geo/ipinfo";
import { searchCuratedPlaceSuggestions, searchDuffelPlaces } from "@/services/travel/providers/duffelProvider";

const MIN_QUERY_LENGTH = 1;
const MAX_QUERY_LENGTH = 80;
const SAFE_QUERY = /^[\p{L}\p{N}\s'.,\-()]+$/u;
const MAX_RADIUS_KM = 150;
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
  const maxMindLocation = context === "origin" ? await resolveMaxMindGeoIpLocationForRequest(request) : null;
  const shouldResolveIpinfoCountry = context === "origin" && !headerCountryCode && !maxMindLocation?.countryCode && Boolean(visitorIp);
  const ipinfoCountryContext = shouldResolveIpinfoCountry && visitorIp
    ? await resolveIpinfoLiteCountryContext(visitorIp)
    : null;
  const serverCountryCode = headerCountryCode || maxMindLocation?.countryCode || ipinfoCountryContext?.countryCode;
  const countryCode = context === "origin"
    ? serverCountryCode || explicitCountryCode
    : undefined;

  const isQueryValid =
    query.length >= MIN_QUERY_LENGTH && query.length <= MAX_QUERY_LENGTH && SAFE_QUERY.test(query);

  if (isQueryValid) {
    const providerResult = await searchDuffelPlaces(query, { context, lat, lng, radiusKm, countryCode, locale });
    if (providerResult.status !== "success") {
      const fallbackSuggestions = searchCuratedPlaceSuggestions(query, { context, lat, lng, radiusKm, countryCode, locale });
      const orderedFallbackSuggestions = context === "origin"
        ? prioritizeOriginSuggestions(fallbackSuggestions, maxMindLocation)
        : fallbackSuggestions;

      return NextResponse.json(
        {
          suggestions: orderedFallbackSuggestions,
          fallback: true,
          error: orderedFallbackSuggestions.length > 0 ? undefined : "Suggestions are temporarily unavailable.",
        },
        { headers: { "Cache-Control": context === "origin" ? "private, no-store" : "no-store" } },
      );
    }
    const suggestions = context === "origin"
      ? prioritizeOriginSuggestions(providerResult.results, maxMindLocation)
      : providerResult.results;
    return NextResponse.json(
      { suggestions },
      { headers: { "Cache-Control": context === "origin" ? "private, no-store" : "no-store" } },
    );
  }

  if (isDefault && query.length === 0) {
    return NextResponse.json(
      {
        suggestions: context === "origin" && maxMindLocation
          ? getCityAwareOriginAirports(maxMindLocation, 8)
          : getDefaultAirports({ context, countryCode, lat: resolvedLat, lon: resolvedLng, limit: 8 }),
        source: "curated",
      },
      { headers: { "Cache-Control": context === "origin" ? "private, no-store" : "no-store" } },
    );
  }

  return NextResponse.json({ suggestions: [] }, { headers: { "Cache-Control": "no-store" } });
}
