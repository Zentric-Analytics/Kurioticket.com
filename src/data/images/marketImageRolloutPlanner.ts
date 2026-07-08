import { auditMarketAssetApprovals } from "./marketAssetApprovalAudit";
import {
  productionAssetIntakeMarkets,
  type ProductionAssetIntakeMarket,
  type ProductionMarketAssetRequirement,
} from "./productionMarketAssetRequirements";
import { stagedProductionMarketImagePacks } from "./marketImagePacks/stagedProductionPacks";
import type { MarketImageRegistryEntry } from "./imageTypes";

export type MarketImageRolloutPlanItem = {
  market: ProductionAssetIntakeMarket;
  totalRequiredImages: number;
  approvedImages: number;
  missingImages: number;
  completeRequirements: number;
  incompleteRequirements: number;
  stagedBatches: number;
  stagedEntries: number;
  readyForPromotion: boolean;
  blockers: string[];
};

export type MarketImageRolloutPlan = {
  markets: MarketImageRolloutPlanItem[];
  readyMarkets: MarketImageRolloutPlanItem[];
  blockedMarkets: MarketImageRolloutPlanItem[];
};

export function buildMarketImageRolloutPlan(
  markets: readonly ProductionAssetIntakeMarket[] = productionAssetIntakeMarkets,
  stagedPacks = stagedProductionMarketImagePacks,
): MarketImageRolloutPlan {
  const approvalAudit = auditMarketAssetApprovals();

  const rolloutMarkets = markets.map((market) => {
    const coverage = approvalAudit.coverage.filter((item) => item.requirement.market === market);
    const completeRequirements = coverage.filter((item) => item.complete);
    const incompleteRequirements = coverage.filter((item) => !item.complete);
    const totalRequiredImages = coverage.reduce(
      (total, item) => total + item.requirement.requiredCount,
      0,
    );
    const approvedImages = coverage.reduce(
      (total, item) => total + Math.min(item.approvedCount, item.requirement.requiredCount),
      0,
    );
    const missingImages = coverage.reduce((total, item) => total + item.missingCount, 0);
    const marketStagedPacks = stagedPacks.filter((pack) => pack.market === market);
    const stagedEntries = marketStagedPacks.reduce((total, pack) => total + pack.entries.length, 0);
    const blockers = buildRolloutBlockers(incompleteRequirements.map((item) => item.requirement), stagedEntries);
    const readyForPromotion = blockers.length === 0;

    return {
      market,
      totalRequiredImages,
      approvedImages,
      missingImages,
      completeRequirements: completeRequirements.length,
      incompleteRequirements: incompleteRequirements.length,
      stagedBatches: marketStagedPacks.length,
      stagedEntries,
      readyForPromotion,
      blockers,
    };
  });

  const sortedMarkets = [...rolloutMarkets].sort((left, right) => {
    if (left.readyForPromotion !== right.readyForPromotion) return left.readyForPromotion ? -1 : 1;
    if (left.missingImages !== right.missingImages) return left.missingImages - right.missingImages;
    return right.stagedEntries - left.stagedEntries;
  });

  return {
    markets: sortedMarkets,
    readyMarkets: sortedMarkets.filter((market) => market.readyForPromotion),
    blockedMarkets: sortedMarkets.filter((market) => !market.readyForPromotion),
  };
}

function buildRolloutBlockers(
  incompleteRequirements: ProductionMarketAssetRequirement[],
  stagedEntries: number,
): string[] {
  const blockers: string[] = [];

  if (incompleteRequirements.length > 0) {
    blockers.push(
      `${incompleteRequirements.length} production asset requirement group(s) still missing approved active coverage.`,
    );
  }

  if (stagedEntries === 0) {
    blockers.push("No staged production entries are available for promotion review yet.");
  }

  return blockers;
}
