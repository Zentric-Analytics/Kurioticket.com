import { NextResponse } from "next/server";

import { getDefaultAirports } from "@/data/airports";
import { resolveCountryCode } from "@/lib/geo/context";
import { searchDuffelPlaces } from "@/services/travel/providers/duffelProvider";

const MIN_QUERY_LENGTH = 2;
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

  const countryCode = resolveCountryCode({
    explicitCountryCode: searchParams.get("countryCode"),
    headerCountryCodes: [
      request.headers.get("cf-ipcountry"),
      request.headers.get("x-vercel-ip-country"),
      request.headers.get("x-country"),
    ],
    locale,
  });

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
