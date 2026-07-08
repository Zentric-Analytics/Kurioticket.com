import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetLaunchBatchPlan } from "./marketAssetLaunchBatchPlan";

describe("buildMarketAssetLaunchBatchPlan", () => {
  it("plans ten 13-image US batches for a 130-image launch target", () => {
    const plan = buildMarketAssetLaunchBatchPlan("US", {
      createdAt: "2026-07",
    });

    assert.equal(plan.market, "US");
    assert.equal(plan.launchAssetTarget, 130);
    assert.equal(plan.configuredBatchSize, 13);
    assert.equal(plan.plannedBatchCount, 10);
    assert.equal(plan.plannedAssetCount, 130);
    assert.equal(plan.remainingAssetCount, 0);
    assert.equal(plan.batches[0].batchId, "market-assets-2026-07-us-001");
    assert.equal(plan.batches[9].batchId, "market-assets-2026-07-us-010");
    assert.ok(plan.batches.every((batch) => batch.plannedAssetCount === 13));
  });

  it("supports custom launch targets with a partial final batch", () => {
    const plan = buildMarketAssetLaunchBatchPlan("GB", {
      createdAt: "2026-07",
      launchAssetTarget: 27,
    });

    assert.equal(plan.configuredBatchSize, 13);
    assert.equal(plan.plannedBatchCount, 3);
    assert.deepEqual(
      plan.batches.map((batch) => batch.plannedAssetCount),
      [13, 13, 1],
    );
    assert.equal(plan.plannedAssetCount, 27);
    assert.equal(plan.remainingAssetCount, 0);
  });
});
