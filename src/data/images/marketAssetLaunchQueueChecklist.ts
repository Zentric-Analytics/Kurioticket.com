import {
  buildMarketAssetPriorityLaunchQueue,
  type MarketAssetPriorityLaunchQueue,
} from "./marketAssetPriorityLaunchQueue";

export type MarketAssetLaunchQueueChecklistItem = {
  id: string;
  label: string;
  command?: string;
};

export type MarketAssetLaunchQueueChecklistBatch = {
  batchId: string;
  market: string;
  sequence: number;
  plannedAssetCount: number;
  checklist: MarketAssetLaunchQueueChecklistItem[];
};

export type MarketAssetLaunchQueueChecklist = {
  createdAt: string;
  launchAssetTarget: number;
  totalMarkets: number;
  totalBatches: number;
  totalPlannedAssets: number;
  batches: MarketAssetLaunchQueueChecklistBatch[];
};

export function buildMarketAssetLaunchQueueChecklist(
  queue: MarketAssetPriorityLaunchQueue = buildMarketAssetPriorityLaunchQueue(),
): MarketAssetLaunchQueueChecklist {
  const batches = queue.markets.flatMap((marketPlan) =>
    marketPlan.batches.map((batch) => ({
      batchId: batch.batchId,
      market: batch.market,
      sequence: batch.sequence,
      plannedAssetCount: batch.plannedAssetCount,
      checklist: buildChecklistItems(batch.batchId, batch.market),
    })),
  );

  return {
    createdAt: queue.createdAt,
    launchAssetTarget: queue.launchAssetTarget,
    totalMarkets: queue.marketCount,
    totalBatches: batches.length,
    totalPlannedAssets: queue.totalPlannedAssets,
    batches,
  };
}

function buildChecklistItems(batchId: string, market: string): MarketAssetLaunchQueueChecklistItem[] {
  const manifestPath = `manifests/${batchId}.json`;

  return [
    {
      id: "generate-template",
      label: "Generate the manifest template.",
      command: `node scripts/build-market-asset-batch-template.mjs ${market} ${batchId} YYYY-MM-DD > ${manifestPath}`,
    },
    {
      id: "fill-production-metadata",
      label: "Replace placeholders with approved production assets, licenses, alt text, dimensions, crop notes, reviewer, and approval dates.",
    },
    {
      id: "combined-review",
      label: "Run the combined manifest review and require ready=true.",
      command: `node scripts/review-market-asset-manifest.mjs ${manifestPath}`,
    },
    {
      id: "conflict-check",
      label: "Run manifest conflict checks before conversion.",
      command: `node scripts/check-market-asset-manifest-conflicts.mjs ${manifestPath}`,
    },
    {
      id: "convert-staged",
      label: "Convert only after review and conflict checks pass.",
      command: `node scripts/convert-market-asset-manifest.mjs ${manifestPath}`,
    },
    {
      id: "promotion-preview",
      label: "Preview staged promotion before touching active packs.",
      command: `node scripts/preview-staged-market-image-promotion.mjs ${batchId} ${market}`,
    },
    {
      id: "promotion-checklist",
      label: "Build and complete the staged promotion checklist.",
      command: `node scripts/build-staged-market-image-promotion-checklist.mjs ${batchId} ${market}`,
    },
    {
      id: "active-audit",
      label: "After manual active-pack copy, audit active promotion for the market.",
      command: `node scripts/audit-active-market-image-promotion.mjs ${market}`,
    },
  ];
}
