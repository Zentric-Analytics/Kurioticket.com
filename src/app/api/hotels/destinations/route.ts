import { NextResponse } from "next/server";

import { searchCanonicalHotelCatalog } from "@/lib/locations/hotelCatalogService";
import { normalizeCountryCode } from "@/lib/geo/context";
import { extractVisitorIp, resolveIpinfoLiteCountryContext } from "@/lib/geo/ipinfo";
import { countryToRegion, normalizeRegion } from "@/lib/region/detectRegion";
import { discoverLocations } from "@/lib/locations/discovery";
import { availableDiscoveryAdapters } from "@/lib/locations/providerDiscoveryAdapters";
import { hotelDestinations } from "@/data/hotelDestinations";
import { fromHotelDestination } from "@/lib/locations/adapters";

const MIN_QUERY_LENGTH = 0;
const MAX_QUERY_LENGTH = 80;
const MAX_LIMIT = 10;
const SAFE_LOCALE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;
const SAFE_QUERY = /^[\p{L}\p{N}\s'.,\-()]+$/u;

type HotelDestinationSource = "curated-destinations";
type CountryResolutionSource = "selected" | "detected-param" | "request-header" | "ipinfo-lite" | "none";

const normalizeCountryHint = (value: string | null) => {
  const normalized = value?.trim().toUpperCase() || "";
  if (normalized === "EU") return normalized;
  return normalizeCountryCode(normalized) || "";
};

const normalizeLimit = (value: string | null) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return 8;
  return Math.max(1, Math.min(MAX_LIMIT, parsed));
};

const readHeaderCountry = (headers: Headers) =>
  [
    headers.get("x-vercel-ip-country"),
    headers.get("cf-ipcountry"),
    headers.get("x-country"),
    headers.get("x-kurioticket-detected-region"),
  ]
    .map((value) => normalizeCountryHint(value))
    .find(Boolean) || "";

const resolveCountryContext = async (request: Request, selectedCountryCode: string, detectedCountryCode: string) => {
  if (selectedCountryCode) {
    return { countryCode: selectedCountryCode, countrySource: "selected" as CountryResolutionSource };
  }

  if (detectedCountryCode) {
    return { countryCode: detectedCountryCode, countrySource: "detected-param" as CountryResolutionSource };
  }

  const headerCountryCode = readHeaderCountry(request.headers);
  const headerRegion = normalizeRegion(headerCountryCode) ?? countryToRegion(headerCountryCode);
  if (headerRegion) {
    return { countryCode: headerRegion, countrySource: "request-header" as CountryResolutionSource };
  }

  const visitorIp = extractVisitorIp(request.headers);
  const ipinfoCountryContext = visitorIp ? await resolveIpinfoLiteCountryContext(visitorIp) : null;
  const ipinfoRegion = ipinfoCountryContext?.countryCode
    ? (normalizeRegion(ipinfoCountryContext.countryCode) ?? countryToRegion(ipinfoCountryContext.countryCode))
    : null;

  if (ipinfoRegion) {
    return { countryCode: ipinfoRegion, countrySource: "ipinfo-lite" as CountryResolutionSource };
  }

  return { countryCode: "", countrySource: "none" as CountryResolutionSource };
};

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = (searchParams.get("q") || "").trim();
  const selectedCountryCode = normalizeCountryHint(searchParams.get("countryCode"));
  const detectedCountryCode = normalizeCountryHint(searchParams.get("detectedCountryCode"));
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

  const { countryCode, countrySource } = await resolveCountryContext(
    request,
    selectedCountryCode,
    detectedCountryCode,
  );

  const catalogResult = searchCanonicalHotelCatalog({ query, countryCode, locale, limit });
  if (query) {
    const discovery = await discoverLocations({ query, product: "hotels", catalog: hotelDestinations.map(fromHotelDestination), adapters: availableDiscoveryAdapters(request, "hotels"), limit, timeoutMs: 900 });
    const suggestions = discovery.suggestions.map((canonical) => ({
      id: canonical.id, name: canonical.primaryLabel, region: canonical.region || canonical.supportingLabel.split(",")[0] || "",
      country: canonical.country?.name || canonical.supportingLabel.split(",").at(-1)?.trim() || "",
      countryCode: canonical.country?.code, kind: canonical.kind === "airport" ? "airport-area" : ["district", "landmark"].includes(canonical.kind) ? canonical.kind : "city",
      searchValue: canonical.submittedValue, canonical,
    }));
    return NextResponse.json({ suggestions, canonicalLocations: discovery.suggestions, provenance: catalogResult.provenance,
      recovery: suggestions.length ? undefined : catalogResult.recovery, discovery: discovery.sources, source: "curated-destinations" satisfies HotelDestinationSource, countryCode: countryCode || null, countrySource, locale, isLiveAvailability: false },
      { headers: { "Cache-Control": "private, no-store" } });
  }
  const canonicalLocations = catalogResult.suggestions.map((suggestion) => suggestion.canonical);

  return NextResponse.json({
    ...catalogResult,
    canonicalLocations,
    source: "curated-destinations" satisfies HotelDestinationSource,
    countryCode: countryCode || null,
    countrySource,
    locale,
    isLiveAvailability: false,
  });
}
