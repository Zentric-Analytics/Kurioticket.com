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
export const marketImageRegistry: MarketImageRegistryEntry[] = [
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
  {
    id: "west-africa-homepage-hero-premium-placeholder-contract-001",
    region: "west-africa",
    locale: "en-GH",
    audience: "local",
    url: "/images/premium/homepage/kurioticket-homepage-hero-businesswoman-modern-city-luggage-001.jpg",
    alt: "Traveler with rolling luggage arriving in a modern city",
    product: "global",
    usage: "homepage-hero",
    source: "premium-stock",
    status: "replace-before-launch",
    sourcePage:
      "https://www.istockphoto.com/photo/businesswoman-arriving-in-a-modern-city-with-rolling-luggage-gm2236043419-651355204?searchscope=image%2Cfilm",
    license: "Standard",
    licenseNotes: worldwideCommercialLicense,
    vendor: "iStock",
    collection: "Essentials",
    stockFileId: "2236043419",
    dimensions: "2047 x 1380",
    pageSurfaces: ["Homepage hero", "West Africa regional fallback hero"],
    intendedSlot: "Temporary contract entry for West Africa homepage hero fallback until a true West Africa asset is purchased and approved.",
    cropNotes: "Replace with a culturally relevant West Africa premium or owned asset before launch-critical enforcement.",
    focalPoint: "center",
    desktopApproved: false,
    mobileApproved: false,
    launchCritical: false,
    contentRole: "replacement-needed",
    productionPriority: "p0-launch-critical",
    premiumReplacementRequired: true,
    notes:
      "This is intentionally not launch-critical until a real West Africa asset is added. It lets the resolver and audit contract be reviewed without changing UI.",
  },
  {
    id: "latin-america-homepage-hero-premium-placeholder-contract-001",
    region: "latin-america",
    locale: "pt-BR",
    audience: "local",
    url: "/images/premium/homepage/kurioticket-homepage-hero-businesswoman-modern-city-luggage-001.jpg",
    alt: "Traveler with rolling luggage arriving in a modern city",
    product: "global",
    usage: "homepage-hero",
    source: "premium-stock",
    status: "replace-before-launch",
    sourcePage:
      "https://www.istockphoto.com/photo/businesswoman-arriving-in-a-modern-city-with-rolling-luggage-gm2236043419-651355204?searchscope=image%2Cfilm",
    license: "Standard",
    licenseNotes: worldwideCommercialLicense,
    vendor: "iStock",
    collection: "Essentials",
    stockFileId: "2236043419",
    dimensions: "2047 x 1380",
    pageSurfaces: ["Homepage hero", "Latin America regional fallback hero"],
    intendedSlot: "Temporary contract entry for Latin America homepage hero fallback until a true Latin America asset is purchased and approved.",
    cropNotes: "Replace with a culturally relevant Latin America premium or owned asset before launch-critical enforcement.",
    focalPoint: "center",
    desktopApproved: false,
    mobileApproved: false,
    launchCritical: false,
    contentRole: "replacement-needed",
    productionPriority: "p0-launch-critical",
    premiumReplacementRequired: true,
    notes:
      "This is intentionally not launch-critical until a real Latin America asset is added. It lets Brazil and nearby markets resolve regionally in early implementation tests.",
  },
];
