import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetFirstBatchPackageTemplate } from "./marketAssetFirstBatchPackageTemplate";

describe("buildMarketAssetFirstBatchPackageTemplate", () => {
  it("creates an incomplete first batch package template", () => {
    const template = buildMarketAssetFirstBatchPackageTemplate();

    assert.deepEqual(template, {
      handoff: false,
      transferChecklist: false,
      transferCompletions: false,
      manifest: false,
      status: false,
    });
  });

  it("supports marking starter handoff and status files as present", () => {
    const template = buildMarketAssetFirstBatchPackageTemplate({
      handoff: true,
      status: true,
    });

    assert.deepEqual(template, {
      handoff: true,
      transferChecklist: false,
      transferCompletions: false,
      manifest: false,
      status: true,
    });
  });
});
