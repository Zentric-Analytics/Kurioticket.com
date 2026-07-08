import type { MarketAssetManifest, MarketAssetManifestEntry } from "./marketAssetManifest";

export type MarketAssetManifestReadinessResult = {
  ready: boolean;
  errors: string[];
  warnings: string[];
};

const todoPattern = /\bTODO\b/i;
const placeholderDate = "YYYY-MM-DD";
const placeholderDimensions = "TODO x TODO";

export function checkMarketAssetManifestReadiness(
  manifest: MarketAssetManifest,
): MarketAssetManifestReadinessResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (manifest.createdAt === placeholderDate) {
    errors.push("createdAt must be replaced with a real date before readiness approval.");
  }

  checkString("batchId", manifest.batchId, errors);
  checkString("owner", manifest.owner, errors);

  manifest.entries.forEach((entry, index) => {
    const label = `entries[${index}]`;
    checkEntry(label, entry, errors, warnings);
  });

  return {
    ready: errors.length === 0,
    errors,
    warnings,
  };
}

function checkEntry(
  label: string,
  entry: MarketAssetManifestEntry,
  errors: string[],
  warnings: string[],
) {
  const stringFields: Array<[string, string | undefined]> = [
    ["id", entry.id],
    ["locale", entry.locale],
    ["sourceFilePath", entry.sourceFilePath],
    ["publicImagePath", entry.publicImagePath],
    ["alt", entry.alt],
    ["intendedSlot", entry.intendedSlot],
    ["sourcePage", entry.sourcePage],
    ["license", entry.license],
    ["licenseNotes", entry.licenseNotes],
    ["dimensions", entry.dimensions],
    ["cropNotes", entry.cropNotes],
    ["reviewer", entry.reviewer],
    ["approvedAt", entry.approvedAt],
    ["notes", entry.notes],
  ];

  for (const [field, value] of stringFields) {
    checkString(`${label}.${field}`, value, errors);
  }

  entry.pageSurfaces.forEach((surface, surfaceIndex) => {
    checkString(`${label}.pageSurfaces[${surfaceIndex}]`, surface, errors);
  });

  if (entry.dimensions === placeholderDimensions) {
    errors.push(`${label}.dimensions must be replaced with real dimensions.`);
  }

  if (!entry.desktopApproved) {
    errors.push(`${label}.desktopApproved must be true before promotion readiness.`);
  }

  if (!entry.mobileApproved) {
    errors.push(`${label}.mobileApproved must be true before promotion readiness.`);
  }

  if (!entry.approvedAt) {
    warnings.push(`${label}.approvedAt is missing; add the approval date when available.`);
  }
}

function checkString(label: string, value: string | undefined, errors: string[]) {
  if (!value) return;
  if (todoPattern.test(value)) {
    errors.push(`${label} still contains a TODO placeholder.`);
  }
}
