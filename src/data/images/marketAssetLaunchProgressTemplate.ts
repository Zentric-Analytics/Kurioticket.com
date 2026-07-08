import {
  buildMarketAssetPriorityLaunchQueue,
  type MarketAssetPriorityLaunchQueue,
} from "./marketAssetPriorityLaunchQueue";
import type {
  MarketAssetLaunchBatchProgressInput,
  MarketAssetLaunchBatchStatus,
} from "./marketAssetLaunchProgress";

export type MarketAssetLaunchProgressTemplateOptions = {
  initialStatus?: MarketAssetLaunchBatchStatus;
};

export function buildMarketAssetLaunchProgressTemplate(
  queue: MarketAssetPriorityLaunchQueue = buildMarketAssetPriorityLaunchQueue(),
  options: MarketAssetLaunchProgressTemplateOptions = {},
): MarketAssetLaunchBatchProgressInput[] {
  const initialStatus = options.initialStatus ?? "planned";

  return queue.markets.flatMap((marketPlan) =>
    marketPlan.batches.map((batch) => ({
      batchId: batch.batchId,
      status: initialStatus,
    })),
  );
}
