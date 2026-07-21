import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { summarizeMarketAssetFirstBatchStatus } from "./marketAssetFirstBatchStatusSummary";

describe("summarizeMarketAssetFirstBatchStatus", () => {
  it("shows the first pending gate when no work is complete", () => {
    const summary = summarizeMarketAssetFirstBatchStatus();

    assert.equal(summary.batchId, "market-assets-2026-07-us-001");
    assert.equal(summary.market, "US");
    assert.equal(summary.readyForConversion, false);
    assert.equal(summary.converted, false);
    assert.equal(summary.completedGateCount, 0);
    assert.equal(summary.totalGateCount, 9);
    assert.equal(summary.nextGate?.id, "handoffGenerated");
  });

  it("marks the batch ready for conversion after readiness, review, and conflicts pass", () => {
    const summary = summarizeMarketAssetFirstBatchStatus({
      handoffGenerated: true,
      handoffReady: true,
      transferChecklistGenerated: true,
      transferCompletionsGenerated: true,
      manifestGenerated: true,
      transferReady: true,
      manifestReady: true,
      conflictsClear: true,
    });

    assert.equal(summary.readyForConversion, true);
    assert.equal(summary.converted, false);
    assert.equal(summary.completedGateCount, 8);
    assert.equal(summary.nextGate?.id, "converted");
  });

  it("marks the batch converted when conversion is complete", () => {
    const summary = summarizeMarketAssetFirstBatchStatus({
      handoffGenerated: true,
      handoffReady: true,
      transferChecklistGenerated: true,
      transferCompletionsGenerated: true,
      manifestGenerated: true,
      transferReady: true,
      manifestReady: true,
      conflictsClear: true,
      converted: true,
    });

    assert.equal(summary.readyForConversion, true);
    assert.equal(summary.converted, true);
    assert.equal(summary.completedGateCount, 9);
    assert.equal(summary.nextGate, null);
  });
});
