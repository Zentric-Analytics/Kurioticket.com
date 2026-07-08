import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetPriorityLaunchQueue } from "./marketAssetPriorityLaunchQueue";
import { summarizeMarketAssetLaunchProgress } from "./marketAssetLaunchProgress";

describe("summarizeMarketAssetLaunchProgress", () => {
  it("summarizes an untouched priority launch queue as planned", () => {
    const queue = buildMarketAssetPriorityLaunchQueue({ createdAt: "2026-07" });
    const progress = summarizeMarketAssetLaunchProgress(queue);

    assert.equal(progress.totalMarkets, 10);
    assert.equal(progress.totalBatches, 100);
    assert.equal(progress.totalPlannedAssets, 1300);
    assert.equal(progress.statuses.planned, 100);
    assert.equal(progress.completedBatches, 0);
    assert.equal(progress.remainingBatches, 100);
  });

  it("overlays known batch statuses", () => {
    const queue = buildMarketAssetPriorityLaunchQueue({
      createdAt: "2026-07",
      markets: ["US"],
    });
    const progress = summarizeMarketAssetLaunchProgress(queue, [
      { batchId: "market-assets-2026-07-us-001", status: "reviewed" },
      { batchId: "market-assets-2026-07-us-002", status: "converted" },
      { batchId: "market-assets-2026-07-us-003", status: "promoted" },
    ]);

    assert.equal(progress.totalBatches, 10);
    assert.equal(progress.statuses.planned, 7);
    assert.equal(progress.statuses.reviewed, 1);
    assert.equal(progress.statuses.converted, 1);
    assert.equal(progress.statuses.promoted, 1);
    assert.equal(progress.completedBatches, 1);
    assert.equal(progress.remainingBatches, 9);
    assert.equal(progress.markets[0].statuses.planned, 7);
  });
});
