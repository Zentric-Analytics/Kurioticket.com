import {
  getProductionAssetRequirementsForMarket,
  type ProductionAssetIntakeMarket,
} from "./productionMarketAssetRequirements";

export const defaultLaunchAssetTarget = 130;

export type MarketAssetLaunchBatchPlanItem = {
  batchId: string;
  market: ProductionAssetIntakeMarket;
  sequence: number;
  plannedAssetCount: number;
};

export type MarketAssetLaunchBatchPlan = {
  market: ProductionAssetIntakeMarket;
  launchAssetTarget: number;
  configuredBatchSize: number;
  plannedBatchCount: number;
  plannedAssetCount: number;
  remainingAssetCount: number;
  batches: MarketAssetLaunchBatchPlanItem[];
};

export type MarketAssetLaunchBatchPlanOptions = {
  createdAt?: string;
  launchAssetTarget?: number;
};

export function buildMarketAssetLaunchBatchPlan(
  market: ProductionAssetIntakeMarket,
  options: MarketAssetLaunchBatchPlanOptions = {},
): MarketAssetLaunchBatchPlan {
  const createdAt = options.createdAt ?? "YYYY-MM-DD";
  const launchAssetTarget = options.launchAssetTarget ?? defaultLaunchAssetTarget;
  const configuredBatchSize = getProductionAssetRequirementsForMarket(market).reduce(
    (total, requirement) => total + requirement.requiredCount,
    0,
  );

  if (configuredBatchSize <= 0) {
    throw new Error(`${market} does not have configured production asset requirements.`);
  }

  const plannedBatchCount = Math.ceil(launchAssetTarget / configuredBatchSize);
  const batches = Array.from({ length: plannedBatchCount }, (_, index) => {
    const sequence = index + 1;
    const previouslyPlanned = index * configuredBatchSize;
    const remainingTarget = Math.max(launchAssetTarget - previouslyPlanned, 0);
    const plannedAssetCount = Math.min(configuredBatchSize, remainingTarget);

    return {
      batchId: `market-assets-${createdAt}-${market.toLowerCase()}-${String(sequence).padStart(3, "0")}`,
      market,
      sequence,
      plannedAssetCount,
    };
  });

  const plannedAssetCount = batches.reduce((total, batch) => total + batch.plannedAssetCount, 0);

  return {
    market,
    launchAssetTarget,
    configuredBatchSize,
    plannedBatchCount,
    plannedAssetCount,
    remainingAssetCount: Math.max(launchAssetTarget - plannedAssetCount, 0),
    batches,
  };
}
