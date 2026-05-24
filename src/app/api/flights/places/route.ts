import { NextResponse } from "next/server";

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

const normalizeContext = (value: string | null): SearchContext | undefined => {
  if (value === "origin" || value === "destination") return value;
  return undefined;
};

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = (searchParams.get("q") || "").trim();
  const context = normalizeContext(searchParams.get("context"));
  const lat = toBoundedNumber(searchParams.get("lat"), -90, 90);
  const lng = toBoundedNumber(searchParams.get("lng"), -180, 180);
  const rawRadius = toBoundedNumber(searchParams.get("radius"), 1, MAX_RADIUS_KM);
  const radiusKm = rawRadius ? Math.min(rawRadius, MAX_RADIUS_KM) : undefined;

  const hasValidGeo = typeof lat === "number" && typeof lng === "number";

  const isQueryValid =
    query.length >= MIN_QUERY_LENGTH && query.length <= MAX_QUERY_LENGTH && SAFE_QUERY.test(query);

  const allowNearbyWithoutQuery = context === "origin" && hasValidGeo && query.length === 0;

  if (!isQueryValid && !allowNearbyWithoutQuery) {
    return NextResponse.json({ suggestions: [] });
  }

  const providerResult = await searchDuffelPlaces(query, {
    context,
    lat,
    lng,
    radiusKm,
  });

  if (providerResult.status !== "success") {
    return NextResponse.json({
      suggestions: [],
      fallback: true,
      error: "Suggestions are temporarily unavailable.",
    });
  }

  return NextResponse.json({ suggestions: providerResult.results });
}
