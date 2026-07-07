import { marketImageRegistry } from "../marketImageRegistry";
import type { MarketImageRegistryEntry } from "../imageTypes";
import {
  stagedProductionMarketImagePacks,
  type StagedProductionMarketImagePack,
} from "./stagedProductionPacks";

export type StagedProductionPackAuditResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stagedPackCount: number;
  stagedImageCount: number;
};

export function auditStagedProductionMarketImagePacks(
  stagedPacks: StagedProductionMarketImagePack[] = stagedProductionMarketImagePacks,
  activeRegistry: MarketImageRegistryEntry[] = marketImageRegistry,
): StagedProductionPackAuditResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const activeIds = new Set(activeRegistry.map((entry) => entry.id));
  const activeUrls = new Set(activeRegistry.map((entry) => entry.url));
  const stagedIds = new Set<string>();
  const stagedUrls = new Set<string>();
  let stagedImageCount = 0;

  stagedPacks.forEach((pack, packIndex) => {
    const packLabel = `stagedPacks[${packIndex}]`;

    if (!pack.batchId.trim()) errors.push(`${packLabel}.batchId is required.`);
    if (!pack.market.trim()) errors.push(`${packLabel}.market is required.`);
    if (!pack.notes.trim()) warnings.push(`${packLabel}.notes should describe the staging decision.`);

    pack.entries.forEach((entry, entryIndex) => {
      stagedImageCount += 1;
      const entryLabel = `${packLabel}.entries[${entryIndex}]`;

      if (entry.market !== pack.market) {
        errors.push(`${entryLabel}.market must match parent staged pack market ${pack.market}.`);
      }

      if (activeIds.has(entry.id)) {
        errors.push(`${entryLabel}.id already exists in active marketImageRegistry: ${entry.id}`);
      }

      if (activeUrls.has(entry.url)) {
        errors.push(`${entryLabel}.url already exists in active marketImageRegistry: ${entry.url}`);
      }

      if (stagedIds.has(entry.id)) {
        errors.push(`${entryLabel}.id duplicates another staged entry: ${entry.id}`);
      }

      if (stagedUrls.has(entry.url)) {
        errors.push(`${entryLabel}.url duplicates another staged entry: ${entry.url}`);
      }

      stagedIds.add(entry.id);
      stagedUrls.add(entry.url);

      if (entry.premiumReplacementRequired) {
        errors.push(`${entryLabel}.premiumReplacementRequired must be false for staged production entries.`);
      }

      if (!entry.desktopApproved || !entry.mobileApproved) {
        errors.push(`${entryLabel} must have desktop and mobile crop approval before staging.`);
      }

      if (!entry.license && !entry.licenseNotes) {
        errors.push(`${entryLabel} must include license metadata before staging.`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stagedPackCount: stagedPacks.length,
    stagedImageCount,
  };
}
