import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildMarketAssetPriorityLaunchQueue,
  priorityLaunchMarkets,
} from "./marketAssetPriorityLaunchQueue";

describe("buildMarketAssetPriorityLaunchQueue", () => {
  it("plans 130 production assets for each priority launch market", () => {
    const queue = buildMarketAssetPriorityLaunchQueue({ createdAt: "2026-07" });

    assert.equal(queue.createdAt, "2026-07");
    assert.equal(queue.launchAssetTarget, 130);
    assert.equal(queue.marketCount, 10);
    assert.equal(queue.totalPlannedBatches, 100);
    assert.equal(queue.totalPlannedAssets, 1300);
    assert.deepEqual(
      queue.markets.map((plan) => plan.market),
      [...priorityLaunchMarkets],
    );
    assert.ok(queue.markets.every((plan) => plan.plannedBatchCount === 10));
    assert.ok(queue.markets.every((plan) => plan.plannedAssetCount === 130));
  });

  it("supports a subset of priority launch markets", () => {
    const queue = buildMarketAssetPriorityLaunchQueue({
      createdAt: "2026-07",
      markets: ["US", "GB"],
    });

    assert.equal(queue.marketCount, 2);
    assert.equal(queue.totalPlannedBatches, 20);
    assert.equal(queue.totalPlannedAssets, 260);
    assert.deepEqual(
      queue.markets.map((plan) => plan.market),
      ["US", "GB"],
    );
  });
});
