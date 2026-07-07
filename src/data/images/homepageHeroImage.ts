import { resolveMarketImage } from "./marketImageResolver";
import type { ImageMarketCode, MarketImageResolution } from "./imageTypes";

export const homepageHeroImageFallback =
  "/images/premium/homepage/kurioticket-homepage-hero-businesswoman-modern-city-luggage-001.jpg";

export function getHomepageHeroImageForMarket(
  market?: string | null,
): MarketImageResolution["image"] & { resolutionLevel?: MarketImageResolution["level"] } {
  const resolution = resolveMarketImage({
    market: normalizeMarketCode(market),
    product: "global",
    usage: "homepage-hero",
    audience: "local",
  });

  if (resolution) {
    return {
      ...resolution.image,
      resolutionLevel: resolution.level,
    };
  }

  return {
    id: "homepage-hero-safe-fallback",
    region: "global",
    audience: "global",
    url: homepageHeroImageFallback,
    alt: "Traveler with rolling luggage arriving in a modern city",
    product: "global",
    usage: "homepage-hero",
    source: "premium-stock",
    status: "premium-approved",
    pageSurfaces: ["Homepage hero"],
    intendedSlot: "Safe homepage hero fallback when market image resolution is unavailable.",
    desktopApproved: false,
    mobileApproved: false,
    launchCritical: true,
    contentRole: "marketing",
    productionPriority: "p0-launch-critical",
    premiumReplacementRequired: false,
    resolutionLevel: "global",
  };
}

function normalizeMarketCode(market?: string | null): ImageMarketCode | undefined {
  const normalized = market?.trim().toUpperCase();
  return normalized ? (normalized as ImageMarketCode) : undefined;
}
