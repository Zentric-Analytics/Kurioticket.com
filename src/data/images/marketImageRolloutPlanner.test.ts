import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketImageRolloutPlan } from "./marketImageRolloutPlanner";

describe("buildMarketImageRolloutPlan", () => {
  it("returns rollout status for requested intake markets", () => {
    const result = buildMarketImageRolloutPlan(["US", "GH"]);

    assert.equal(result.markets.length, 2);
    assert.ok(result.markets.some((item) => item.market === "US"));
    assert.ok(result.markets.every((item) => item.totalRequiredImages > 0));
  });

  it("blocks markets without staged production entries", () => {
    const result = buildMarketImageRolloutPlan(["US"], []);
    const us = result.markets[0];

    assert.equal(us.readyForPromotion, false);
    assert.ok(us.blockers.some((blocker) => blocker.includes("No staged production entries")));
  });

  it("sorts markets with fewer missing images first", () => {
    const result = buildMarketImageRolloutPlan(["US", "GH", "NG"], []);
    const missingCounts = result.markets.map((item) => item.missingImages);
    const sortedMissingCounts = [...missingCounts].sort((left, right) => left - right);

    assert.deepEqual(missingCounts, sortedMissingCounts);
  });
});
