import type { MarketImageRegistryEntry } from "./imageTypes";
import {
  validateMarketAssetManifest,
  type MarketAssetManifest,
  type MarketAssetManifestEntry,
} from "./marketAssetManifest";

export type MarketAssetManifestConversionResult = {
  valid: boolean;
  errors: string[];
  entries: MarketImageRegistryEntry[];
};

export function convertMarketAssetManifestToRegistryEntries(
  manifest: MarketAssetManifest,
): MarketAssetManifestConversionResult {
  const validation = validateMarketAssetManifest(manifest);

  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
      entries: [],
    };
  }

  return {
    valid: true,
    errors: [],
    entries: manifest.entries.map((entry) => convertMarketAssetManifestEntry(entry, manifest)),
  };
}

export function convertMarketAssetManifestEntry(
  entry: MarketAssetManifestEntry,
  manifest: Pick<MarketAssetManifest, "batchId" | "owner" | "createdAt">,
): MarketImageRegistryEntry {
  return {
    id: entry.id,
    market: entry.market,
    region: entry.region,
    locale: entry.locale,
    audience: entry.audience,
    url: entry.publicImagePath,
    alt: entry.alt,
    product: entry.product,
    usage: entry.usage,
    source: entry.source,
    status: entry.source === "provider" ? "provider-real" : "premium-approved",
    sourcePage: entry.sourcePage,
    license: entry.license,
    licenseNotes: entry.licenseNotes,
    vendor: entry.vendor,
    collection: entry.collection,
    stockFileId: entry.stockFileId,
    dimensions: entry.dimensions,
    pageSurfaces: entry.pageSurfaces,
    intendedSlot: entry.intendedSlot,
    cropNotes: entry.cropNotes,
    focalPoint: entry.focalPoint,
    desktopApproved: entry.desktopApproved,
    mobileApproved: entry.mobileApproved,
    launchCritical: entry.usage === "homepage-hero",
    contentRole: entry.source === "provider" ? "provider-real" : "marketing",
    productionPriority: entry.usage === "homepage-hero" ? "p0-launch-critical" : "p1-public-important",
    premiumReplacementRequired: false,
    notes: [
      entry.notes,
      `Manifest batch: ${manifest.batchId}`,
      `Manifest owner: ${manifest.owner}`,
      `Manifest created: ${manifest.createdAt}`,
      `Manifest reviewer: ${entry.reviewer}`,
      entry.approvedAt ? `Manifest approved: ${entry.approvedAt}` : undefined,
    ]
      .filter(Boolean)
      .join(" | "),
  };
}
