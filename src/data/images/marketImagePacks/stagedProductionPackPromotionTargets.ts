import type { MarketImageRegistryEntry } from "../imageTypes";
import { priorityMarketCodes } from "./priorityMarkets";
import { previewStagedProductionPackPromotion } from "./stagedProductionPackPromotion";
import type { StagedProductionMarketImagePack } from "./stagedProductionPacks";

export type StagedPromotionTargetPlanItem = {
  targetFile: string;
  reason: string;
  entries: MarketImageRegistryEntry[];
};

export type StagedPromotionTargetPlan = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  batchId: string;
  market: string;
  targets: StagedPromotionTargetPlanItem[];
};

export function planStagedProductionPackPromotionTargets(
  batchId: string,
  market: string,
  stagedPacks?: StagedProductionMarketImagePack[],
): StagedPromotionTargetPlan {
  const preview = previewStagedProductionPackPromotion(batchId, market, stagedPacks);
  const errors = [...preview.errors];
  const warnings = [...preview.warnings];
  const isPriorityMarket = priorityMarketCodes.includes(market);

  if (!isPriorityMarket) {
    warnings.push(
      `${market} is not currently listed as a priority market; confirm whether entries should be added to priorityMarkets.ts or a regional pack.`,
    );
  }

  const targetFile = isPriorityMarket
    ? "src/data/images/marketImagePacks/priorityMarkets.ts"
    : "src/data/images/marketImagePacks/regions.ts";
  const reason = isPriorityMarket
    ? "Market-specific production entries for priority market coverage."
    : "Non-priority market entries require regional fallback review before promotion.";

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    batchId,
    market,
    targets:
      preview.entries.length > 0
        ? [
            {
              targetFile,
              reason,
              entries: preview.entries,
            },
          ]
        : [],
  };
}
