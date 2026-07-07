import type {
  ImageDimensions,
  ImageFocalPoint,
  ImageMarketAudience,
  ImageMarketCode,
  ImageProduct,
  ImageRegionCode,
  ImageSource,
  ImageUsage,
  ImageVendor,
} from "./imageTypes";

export type MarketAssetManifestEntry = {
  id: string;
  market: ImageMarketCode;
  region: ImageRegionCode;
  locale: string;
  audience: ImageMarketAudience;
  product: ImageProduct;
  usage: ImageUsage;
  source: Exclude<ImageSource, "temporary" | "unsplash" | "pexels">;
  sourceFilePath: string;
  publicImagePath: string;
  alt: string;
  intendedSlot: string;
  sourcePage?: string;
  license: string;
  licenseNotes: string;
  vendor?: ImageVendor;
  collection?: string;
  stockFileId?: string;
  dimensions: ImageDimensions;
  cropNotes: string;
  focalPoint: ImageFocalPoint;
  desktopApproved: boolean;
  mobileApproved: boolean;
  pageSurfaces: string[];
  reviewer: string;
  approvedAt?: string;
  notes?: string;
};

export type MarketAssetManifest = {
  batchId: string;
  createdAt: string;
  owner: string;
  entries: MarketAssetManifestEntry[];
};

export type MarketAssetManifestValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateMarketAssetManifest(
  manifest: MarketAssetManifest,
): MarketAssetManifestValidationResult {
  const errors: string[] = [];

  if (!manifest.batchId.trim()) errors.push("batchId is required.");
  if (!manifest.createdAt.trim()) errors.push("createdAt is required.");
  if (!manifest.owner.trim()) errors.push("owner is required.");
  if (manifest.entries.length === 0) errors.push("entries must include at least one asset.");

  const ids = new Set<string>();
  const publicPaths = new Set<string>();

  manifest.entries.forEach((entry, index) => {
    const label = `entries[${index}]`;

    if (!entry.id.trim()) errors.push(`${label}.id is required.`);
    if (ids.has(entry.id)) errors.push(`${label}.id duplicates ${entry.id}.`);
    ids.add(entry.id);

    if (!entry.market.trim()) errors.push(`${label}.market is required.`);
    if (entry.market !== entry.market.toUpperCase()) errors.push(`${label}.market must be uppercase.`);
    if (!entry.region.trim()) errors.push(`${label}.region is required.`);
    if (entry.region !== entry.region.toLowerCase()) errors.push(`${label}.region must be lowercase.`);
    if (!entry.locale.trim()) errors.push(`${label}.locale is required.`);
    if (!entry.alt.trim()) errors.push(`${label}.alt is required.`);
    if (!entry.intendedSlot.trim()) errors.push(`${label}.intendedSlot is required.`);
    if (!entry.license.trim()) errors.push(`${label}.license is required.`);
    if (!entry.licenseNotes.trim()) errors.push(`${label}.licenseNotes is required.`);
    if (!entry.dimensions.trim()) errors.push(`${label}.dimensions is required.`);
    if (!entry.cropNotes.trim()) errors.push(`${label}.cropNotes is required.`);
    if (!entry.reviewer.trim()) errors.push(`${label}.reviewer is required.`);
    if (entry.pageSurfaces.length === 0) errors.push(`${label}.pageSurfaces must include at least one surface.`);

    if (!entry.sourceFilePath.startsWith("assets/")) {
      errors.push(`${label}.sourceFilePath must start with assets/.`);
    }

    if (!entry.publicImagePath.startsWith("/images/")) {
      errors.push(`${label}.publicImagePath must start with /images/.`);
    }

    if (publicPaths.has(entry.publicImagePath)) {
      errors.push(`${label}.publicImagePath duplicates ${entry.publicImagePath}.`);
    }
    publicPaths.add(entry.publicImagePath);

    if (entry.source === "provider" && entry.product !== "hotels") {
      errors.push(`${label}.source provider is reserved for provider-backed product imagery.`);
    }

    if (!entry.desktopApproved) errors.push(`${label}.desktopApproved must be true before intake approval.`);
    if (!entry.mobileApproved) errors.push(`${label}.mobileApproved must be true before intake approval.`);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
