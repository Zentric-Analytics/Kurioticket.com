import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkMarketAssetFirstBatchStatusIntegrity } from "./marketAssetFirstBatchStatusIntegrity";
import { buildMarketAssetFirstBatchStatusTemplate } from "./marketAssetFirstBatchStatusTemplate";

describe("checkMarketAssetFirstBatchStatusIntegrity", () => {
  it("passes for an empty first batch status template", () => {
    const result = checkMarketAssetFirstBatchStatusIntegrity(
      buildMarketAssetFirstBatchStatusTemplate(),
    );

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("passes when gates are completed in order", () => {
    const result = checkMarketAssetFirstBatchStatusIntegrity({
      handoffGenerated: true,
      handoffReady: true,
      transferChecklistGenerated: true,
      transferCompletionsGenerated: true,
      manifestGenerated: true,
      transferReady: true,
      manifestReady: false,
      conflictsClear: false,
      converted: false,
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("fails when a later gate is completed before an earlier gate", () => {
    const result = checkMarketAssetFirstBatchStatusIntegrity({
      handoffGenerated: true,
      handoffReady: false,
      transferChecklistGenerated: true,
      transferCompletionsGenerated: false,
      manifestGenerated: false,
      transferReady: false,
      manifestReady: false,
      conflictsClear: false,
      converted: false,
    });

    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 1);
    assert.ok(result.errors[0].includes("transfer checklist generation"));
    assert.ok(result.errors[0].includes("handoff readiness"));
  });
});
