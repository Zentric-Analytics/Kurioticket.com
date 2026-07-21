import { marketImageRegistry } from "./marketImageRegistry";
import {
  productionMarketAssetRequirements,
  type ProductionMarketAssetRequirement,
} from "./productionMarketAssetRequirements";
import type { MarketImageRegistryEntry } from "./imageTypes";
import type { MarketAssetManifest } from "./marketAssetManifest";

export type MarketAssetManifestConflictCheckResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function checkMarketAssetManifestConflicts(
  manifest: MarketAssetManifest,
  registry: MarketImageRegistryEntry[] = marketImageRegistry,
  requirements: ProductionMarketAssetRequirement[] = productionMarketAssetRequirements,
): MarketAssetManifestConflictCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const existingIds = new Set(registry.map((entry) => entry.id));
  const existingUrls = new Set(registry.map((entry) => entry.url));
  const manifestIds = new Set<string>();
  const manifestUrls = new Set<string>();

  manifest.entries.forEach((entry, index) => {
    const label = `entries[${index}]`;

    if (existingIds.has(entry.id)) {
      errors.push(`${label}.id already exists in marketImageRegistry: ${entry.id}`);
    }

    if (existingUrls.has(entry.publicImagePath)) {
      errors.push(`${label}.publicImagePath already exists in marketImageRegistry: ${entry.publicImagePath}`);
    }

    if (manifestIds.has(entry.id)) {
      errors.push(`${label}.id duplicates another manifest entry: ${entry.id}`);
    }

    if (manifestUrls.has(entry.publicImagePath)) {
      errors.push(`${label}.publicImagePath duplicates another manifest entry: ${entry.publicImagePath}`);
    }

    manifestIds.add(entry.id);
    manifestUrls.add(entry.publicImagePath);

    const matchingRequirement = requirements.find(
      (requirement) =>
        requirement.market === entry.market &&
        requirement.region === entry.region &&
        requirement.usage === entry.usage,
    );

    if (!matchingRequirement) {
      warnings.push(
        `${label} does not match a current production asset intake requirement: ${entry.market} ${entry.region} ${entry.usage}`,
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
