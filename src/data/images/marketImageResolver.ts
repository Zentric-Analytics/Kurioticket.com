import { marketImageRegistry } from "./marketImageRegistry";
import type {
  ImageMarketAudience,
  ImageMarketCode,
  ImageRegionCode,
  MarketImageRegistryEntry,
  MarketImageRequest,
  MarketImageResolution,
} from "./imageTypes";

const defaultMarketRegions: Partial<Record<ImageMarketCode, ImageRegionCode>> = {
  US: "north-america",
  CA: "north-america",
  MX: "latin-america",
  BR: "latin-america",
  AR: "latin-america",
  CL: "latin-america",
  CO: "latin-america",
  GH: "west-africa",
  NG: "west-africa",
  CI: "west-africa",
  SN: "west-africa",
  KE: "east-africa",
  TZ: "east-africa",
  UG: "east-africa",
  RW: "east-africa",
  ZA: "southern-africa",
  AE: "middle-east",
  SA: "middle-east",
  IN: "south-asia",
  GB: "western-europe",
  FR: "western-europe",
  DE: "western-europe",
  ES: "western-europe",
  IT: "western-europe",
  NL: "western-europe",
  TR: "middle-east",
  JP: "east-asia",
  KR: "east-asia",
  AU: "oceania",
};

export function getDefaultRegionForMarket(market?: ImageMarketCode): ImageRegionCode | undefined {
  if (!market) return undefined;
  return defaultMarketRegions[market.toUpperCase() as ImageMarketCode];
}

export function resolveMarketImage(
  request: MarketImageRequest,
  registry: MarketImageRegistryEntry[] = marketImageRegistry,
): MarketImageResolution | undefined {
  const market = normalizeMarket(request.market);
  const region = normalizeRegion(request.region) ?? getDefaultRegionForMarket(market);
  const audience = request.audience ?? "local";
  const candidates = registry.filter((image) => imageMatchesRequest(image, request, audience));

  const marketMatch = market
    ? candidates.find((image) => normalizeMarket(image.market) === market)
    : undefined;

  if (marketMatch) {
    return { image: marketMatch, level: "market", requestedMarket: market, requestedRegion: region };
  }

  const regionMatch = region
    ? candidates.find((image) => !image.market && normalizeRegion(image.region) === region)
    : undefined;

  if (regionMatch) {
    return { image: regionMatch, level: "region", requestedMarket: market, requestedRegion: region };
  }

  const globalMatch = candidates.find((image) => !image.market && normalizeRegion(image.region) === "global");

  if (globalMatch) {
    return { image: globalMatch, level: "global", requestedMarket: market, requestedRegion: region };
  }

  return undefined;
}

function imageMatchesRequest(
  image: MarketImageRegistryEntry,
  request: MarketImageRequest,
  audience: ImageMarketAudience,
) {
  return (
    image.product === request.product &&
    includesUsage(image.usage, request.usage) &&
    (image.audience === audience || image.audience === "global") &&
    image.status !== "blocked" &&
    image.status !== "temporary"
  );
}

function includesUsage(imageUsage: MarketImageRegistryEntry["usage"], requestedUsage: MarketImageRequest["usage"]) {
  return Array.isArray(imageUsage) ? imageUsage.includes(requestedUsage) : imageUsage === requestedUsage;
}

function normalizeMarket(market?: ImageMarketCode) {
  return market?.trim().toUpperCase() as ImageMarketCode | undefined;
}

function normalizeRegion(region?: ImageRegionCode) {
  return region?.trim().toLowerCase() as ImageRegionCode | undefined;
}
