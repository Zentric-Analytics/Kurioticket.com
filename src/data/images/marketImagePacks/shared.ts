import type {
  ImageLocaleCode,
  ImageMarketAudience,
  ImageMarketCode,
  ImageRegionCode,
  MarketImageRegistryEntry,
} from "../imageTypes";

export const marketPackCommercialLicense =
  "Commercial web and mobile web use for Kurioticket public product surfaces with retained license records.";

export const marketPackSeedHero = {
  url: "/images/premium/homepage/kurioticket-homepage-hero-businesswoman-modern-city-luggage-001.jpg",
  sourcePage:
    "https://www.istockphoto.com/photo/businesswoman-arriving-in-a-modern-city-with-rolling-luggage-gm2236043419-651355204?searchscope=image%2Cfilm",
  vendor: "iStock" as const,
  collection: "Essentials",
  stockFileId: "2236043419",
  dimensions: "2047 x 1380" as const,
};

type MarketHeroContractInput = {
  id: string;
  market?: ImageMarketCode;
  region: ImageRegionCode;
  locale: ImageLocaleCode;
  audience?: ImageMarketAudience;
  label: string;
  alt?: string;
  notes?: string;
};

export function marketHeroContract({
  id,
  market,
  region,
  locale,
  audience = "local",
  label,
  alt = "Traveler with rolling luggage arriving in a modern city",
  notes,
}: MarketHeroContractInput): MarketImageRegistryEntry {
  return {
    id,
    market,
    region,
    locale,
    audience,
    url: marketPackSeedHero.url,
    alt,
    product: "global",
    usage: "homepage-hero",
    source: "premium-stock",
    status: "replace-before-launch",
    sourcePage: marketPackSeedHero.sourcePage,
    license: "Standard",
    licenseNotes: marketPackCommercialLicense,
    vendor: marketPackSeedHero.vendor,
    collection: marketPackSeedHero.collection,
    stockFileId: marketPackSeedHero.stockFileId,
    dimensions: marketPackSeedHero.dimensions,
    pageSurfaces: ["Homepage hero", label],
    intendedSlot: `Temporary contract entry for ${label} until a true local premium or owned asset is approved.`,
    cropNotes: `Replace with a culturally relevant ${label} asset before launch enforcement.`,
    focalPoint: "center",
    desktopApproved: false,
    mobileApproved: false,
    launchCritical: false,
    contentRole: "replacement-needed",
    productionPriority: "p0-launch-critical",
    premiumReplacementRequired: true,
    notes:
      notes ??
      "Contract-only market image pack entry. It provides resolver coverage without changing live UI or claiming final production image approval.",
  };
}
