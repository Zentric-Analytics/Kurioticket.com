import { NextResponse } from "next/server";

import { searchHotelDestinations } from "@/data/hotelDestinations";

const MIN_QUERY_LENGTH = 0;
const MAX_QUERY_LENGTH = 80;
const MAX_LIMIT = 10;
const SAFE_LOCALE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;
const SAFE_QUERY = /^[\p{L}\p{N}\s'.,\-()]+$/u;

const normalizeCountryHint = (value: string | null) => {
  const normalized = value?.trim().toUpperCase() || "";
  if (normalized === "EU") return normalized;
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
};

const normalizeLimit = (value: string | null) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return 8;
  return Math.max(1, Math.min(MAX_LIMIT, parsed));
};

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = (searchParams.get("q") || "").trim();
  const countryCode = normalizeCountryHint(searchParams.get("countryCode"));
  const requestedLocale = searchParams.get("locale")?.trim() || "";
  const locale = requestedLocale && SAFE_LOCALE.test(requestedLocale) ? requestedLocale : undefined;
  const limit = normalizeLimit(searchParams.get("limit"));

  const isQueryValid =
    query.length >= MIN_QUERY_LENGTH &&
    query.length <= MAX_QUERY_LENGTH &&
    (query.length === 0 || SAFE_QUERY.test(query));

  if (!isQueryValid) {
    return NextResponse.json({ suggestions: [] });
  }

  return NextResponse.json({
    suggestions: searchHotelDestinations({ query, countryCode, limit }),
    source: "curated",
    locale,
  });
}
