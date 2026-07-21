import {
  buildMarketAssetLaunchBatchPlan,
  defaultLaunchAssetTarget,
  type MarketAssetLaunchBatchPlan,
} from "./marketAssetLaunchBatchPlan";
import type { ProductionAssetIntakeMarket } from "./productionMarketAssetRequirements";

export const priorityLaunchMarkets = [
  "US",
  "GB",
  "CA",
  "BR",
  "GH",
  "NG",
  "KE",
  "ZA",
  "AE",
  "IN",
] as const satisfies ProductionAssetIntakeMarket[];

export type PriorityLaunchMarket = (typeof priorityLaunchMarkets)[number];

export type MarketAssetPriorityLaunchQueue = {
  createdAt: string;
  launchAssetTarget: number;
  marketCount: number;
  totalPlannedBatches: number;
  totalPlannedAssets: number;
  markets: MarketAssetLaunchBatchPlan[];
};

export type MarketAssetPriorityLaunchQueueOptions = {
  createdAt?: string;
  launchAssetTarget?: number;
  markets?: readonly PriorityLaunchMarket[];
};

export function buildMarketAssetPriorityLaunchQueue(
  options: MarketAssetPriorityLaunchQueueOptions = {},
): MarketAssetPriorityLaunchQueue {
  const createdAt = options.createdAt ?? "YYYY-MM-DD";
  const launchAssetTarget = options.launchAssetTarget ?? defaultLaunchAssetTarget;
  const markets = options.markets ?? priorityLaunchMarkets;
  const marketPlans = markets.map((market) =>
    buildMarketAssetLaunchBatchPlan(market, {
      createdAt,
      launchAssetTarget,
    }),
  );

  return {
    createdAt,
    launchAssetTarget,
    marketCount: marketPlans.length,
    totalPlannedBatches: marketPlans.reduce((total, plan) => total + plan.plannedBatchCount, 0),
    totalPlannedAssets: marketPlans.reduce((total, plan) => total + plan.plannedAssetCount, 0),
    markets: marketPlans,
  };
}
