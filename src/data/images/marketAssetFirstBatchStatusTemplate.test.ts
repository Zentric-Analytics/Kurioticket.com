import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetFirstBatchStatusTemplate } from "./marketAssetFirstBatchStatusTemplate";

describe("buildMarketAssetFirstBatchStatusTemplate", () => {
  it("creates a fully pending first batch status overlay", () => {
    const template = buildMarketAssetFirstBatchStatusTemplate();

    assert.equal(template.handoffGenerated, false);
    assert.equal(template.handoffReady, false);
    assert.equal(template.transferChecklistGenerated, false);
    assert.equal(template.transferCompletionsGenerated, false);
    assert.equal(template.manifestGenerated, false);
    assert.equal(template.transferReady, false);
    assert.equal(template.manifestReady, false);
    assert.equal(template.conflictsClear, false);
    assert.equal(template.converted, false);
  });

  it("can mark handoff generation complete when requested", () => {
    const template = buildMarketAssetFirstBatchStatusTemplate({
      handoffGenerated: true,
    });

    assert.equal(template.handoffGenerated, true);
    assert.equal(template.handoffReady, false);
    assert.equal(template.converted, false);
  });
});
