import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetPriorityLaunchQueue } from "./marketAssetPriorityLaunchQueue";
import { buildMarketAssetLaunchQueueChecklist } from "./marketAssetLaunchQueueChecklist";

describe("buildMarketAssetLaunchQueueChecklist", () => {
  it("builds checklist items for every planned priority launch batch", () => {
    const queue = buildMarketAssetPriorityLaunchQueue({ createdAt: "2026-07" });
    const checklist = buildMarketAssetLaunchQueueChecklist(queue);

    assert.equal(checklist.createdAt, "2026-07");
    assert.equal(checklist.totalMarkets, 10);
    assert.equal(checklist.totalBatches, 100);
    assert.equal(checklist.totalPlannedAssets, 1300);
    assert.equal(checklist.batches[0].batchId, "market-assets-2026-07-us-001");
    assert.equal(checklist.batches[0].checklist.length, 8);
    assert.ok(
      checklist.batches[0].checklist.some(
        (item) => item.id === "combined-review" && item.command?.includes("review-market-asset-manifest"),
      ),
    );
  });

  it("supports subset queues", () => {
    const queue = buildMarketAssetPriorityLaunchQueue({
      createdAt: "2026-07",
      markets: ["US"],
    });
    const checklist = buildMarketAssetLaunchQueueChecklist(queue);

    assert.equal(checklist.totalMarkets, 1);
    assert.equal(checklist.totalBatches, 10);
    assert.ok(checklist.batches.every((batch) => batch.market === "US"));
  });
});
