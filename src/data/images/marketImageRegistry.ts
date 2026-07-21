import { marketImagePacks } from "./marketImagePacks";
import type { MarketImageRegistryEntry } from "./imageTypes";

const worldwideCommercialLicense =
  "Commercial web and mobile-web license covering Kurioticket marketing, marketplace UI, paid acquisition landing pages, email crops, worldwide use, and retained receipt/license records.";

/**
 * Phase 1 seed registry for the global market image system.
 *
 * These entries establish the country -> region -> global contract without
 * changing live UI output yet. Real country packs can be added incrementally
 * as premium or owned assets are purchased and crop-approved.
 */
const globalMarketImageRegistry: MarketImageRegistryEntry[] = [
  {
    id: "global-homepage-hero-premium-traveler-city-001",
    market: undefined,
    region: "global",
    locale: "en",
    audience: "global",
    url: "/images/premium/homepage/kurioticket-homepage-hero-businesswoman-modern-city-luggage-001.jpg",
    alt: "Traveler with rolling luggage arriving in a modern city",
    product: "global",
    usage: "homepage-hero",
    source: "premium-stock",
    status: "premium-approved",
    sourcePage:
      "https://www.istockphoto.com/photo/businesswoman-arriving-in-a-modern-city-with-rolling-luggage-gm2236043419-651355204?searchscope=image%2Cfilm",
    license: "Standard",
    licenseNotes: worldwideCommercialLicense,
    vendor: "iStock",
    collection: "Essentials",
    stockFileId: "2236043419",
    dimensions: "2047 x 1380",
    pageSurfaces: ["Homepage hero", "Global fallback hero"],
    intendedSlot: "Default global homepage hero when no market or regional hero is approved.",
    cropNotes: "Global fallback seed. Desktop and mobile crop approval must be completed before enforcing as final production fallback.",
    focalPoint: "center",
    desktopApproved: false,
    mobileApproved: false,
    launchCritical: true,
    contentRole: "marketing",
    productionPriority: "p0-launch-critical",
    premiumReplacementRequired: false,
    notes:
      "Phase 1 seed entry mirrors the current premium homepage hero so the resolver has a safe global fallback contract before regional packs are added.",
  },
];

export const marketImageRegistry: MarketImageRegistryEntry[] = [
  ...globalMarketImageRegistry,
  ...marketImagePacks,
];
