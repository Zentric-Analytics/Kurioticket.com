import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetFirstBatchStatusReport } from "./marketAssetFirstBatchStatusReport";
import { buildMarketAssetFirstBatchStatusTemplate } from "./marketAssetFirstBatchStatusTemplate";

describe("buildMarketAssetFirstBatchStatusReport", () => {
  it("marks the report trusted when status integrity is valid", () => {
    const report = buildMarketAssetFirstBatchStatusReport(
      buildMarketAssetFirstBatchStatusTemplate(),
    );

    assert.equal(report.integrity.valid, true);
    assert.equal(report.trusted, true);
    assert.equal(report.summary.batchId, "market-assets-2026-07-us-001");
    assert.equal(report.summary.completedGateCount, 0);
  });

  it("marks the report untrusted when status gates are out of order", () => {
    const report = buildMarketAssetFirstBatchStatusReport({
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

    assert.equal(report.integrity.valid, false);
    assert.equal(report.trusted, false);
    assert.equal(report.integrity.errors.length, 1);
    assert.equal(report.summary.completedGateCount, 2);
  });
});
