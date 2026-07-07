import type { MarketImageRegistryEntry } from "../imageTypes";
import {
  auditStagedProductionMarketImagePacks,
  type StagedProductionPackAuditResult,
} from "./stagedProductionPackAudit";
import {
  stagedProductionMarketImagePacks,
  type StagedProductionMarketImagePack,
} from "./stagedProductionPacks";

export type StagedProductionPackPromotionPreview = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  batchId: string;
  market: string;
  entries: MarketImageRegistryEntry[];
  audit: StagedProductionPackAuditResult;
};

export function previewStagedProductionPackPromotion(
  batchId: string,
  market: string,
  stagedPacks: StagedProductionMarketImagePack[] = stagedProductionMarketImagePacks,
): StagedProductionPackPromotionPreview {
  const audit = auditStagedProductionMarketImagePacks(stagedPacks);
  const errors = [...audit.errors];
  const warnings = [...audit.warnings];
  const matchingPack = stagedPacks.find(
    (pack) => pack.batchId === batchId && pack.market === market,
  );

  if (!batchId.trim()) errors.push("batchId is required for promotion preview.");
  if (!market.trim()) errors.push("market is required for promotion preview.");

  if (!matchingPack) {
    errors.push(`No staged production pack found for ${market} batch ${batchId}.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    batchId,
    market,
    entries: matchingPack?.entries ?? [],
    audit,
  };
}
