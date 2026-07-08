import {
  buildMarketAssetPriorityLaunchQueue,
  type MarketAssetPriorityLaunchQueue,
} from "./marketAssetPriorityLaunchQueue";

export type MarketAssetLaunchBatchStatus =
  | "planned"
  | "template-generated"
  | "metadata-complete"
  | "reviewed"
  | "conflict-checked"
  | "converted"
  | "promotion-reviewed"
  | "promoted";

export type MarketAssetLaunchBatchProgressInput = {
  batchId: string;
  status: MarketAssetLaunchBatchStatus;
};

export type MarketAssetLaunchMarketProgress = {
  market: string;
  totalBatches: number;
  totalPlannedAssets: number;
  statuses: Record<MarketAssetLaunchBatchStatus, number>;
  completedBatches: number;
  remainingBatches: number;
};

export type MarketAssetLaunchProgress = {
  createdAt: string;
  launchAssetTarget: number;
  totalMarkets: number;
  totalBatches: number;
  totalPlannedAssets: number;
  statuses: Record<MarketAssetLaunchBatchStatus, number>;
  completedBatches: number;
  remainingBatches: number;
  markets: MarketAssetLaunchMarketProgress[];
};

const launchBatchStatuses: MarketAssetLaunchBatchStatus[] = [
  "planned",
  "template-generated",
  "metadata-complete",
  "reviewed",
  "conflict-checked",
  "converted",
  "promotion-reviewed",
  "promoted",
];

export function summarizeMarketAssetLaunchProgress(
  queue: MarketAssetPriorityLaunchQueue = buildMarketAssetPriorityLaunchQueue(),
  progress: MarketAssetLaunchBatchProgressInput[] = [],
): MarketAssetLaunchProgress {
  const statusByBatchId = new Map(progress.map((item) => [item.batchId, item.status]));
  const marketProgress = queue.markets.map((marketPlan) => {
    const statuses = createEmptyStatusCounts();

    for (const batch of marketPlan.batches) {
      statuses[statusByBatchId.get(batch.batchId) ?? "planned"] += 1;
    }

    const completedBatches = statuses.promoted;

    return {
      market: marketPlan.market,
      totalBatches: marketPlan.plannedBatchCount,
      totalPlannedAssets: marketPlan.plannedAssetCount,
      statuses,
      completedBatches,
      remainingBatches: marketPlan.plannedBatchCount - completedBatches,
    };
  });

  const statuses = createEmptyStatusCounts();
  for (const market of marketProgress) {
    for (const status of launchBatchStatuses) {
      statuses[status] += market.statuses[status];
    }
  }

  const completedBatches = statuses.promoted;

  return {
    createdAt: queue.createdAt,
    launchAssetTarget: queue.launchAssetTarget,
    totalMarkets: queue.marketCount,
    totalBatches: queue.totalPlannedBatches,
    totalPlannedAssets: queue.totalPlannedAssets,
    statuses,
    completedBatches,
    remainingBatches: queue.totalPlannedBatches - completedBatches,
    markets: marketProgress,
  };
}

function createEmptyStatusCounts(): Record<MarketAssetLaunchBatchStatus, number> {
  return {
    planned: 0,
    "template-generated": 0,
    "metadata-complete": 0,
    reviewed: 0,
    "conflict-checked": 0,
    converted: 0,
    "promotion-reviewed": 0,
    promoted: 0,
  };
}
