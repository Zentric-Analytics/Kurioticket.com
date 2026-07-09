import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetFirstBatchCommandPlan } from "./marketAssetFirstBatchCommandPlan";

describe("buildMarketAssetFirstBatchCommandPlan", () => {
  it("builds the default first US batch command plan", () => {
    const plan = buildMarketAssetFirstBatchCommandPlan();

    assert.equal(plan.batchId, "market-assets-2026-07-us-001");
    assert.equal(plan.market, "US");
    assert.equal(plan.files.handoff, "intake-handoff-us-001.json");
    assert.equal(plan.files.transferChecklist, "transfer-checklist-us-001.json");
    assert.equal(plan.files.transferCompletions, "transfer-completions-us-001.json");
    assert.equal(plan.files.manifest, "manifest-us-001.json");
    assert.ok(plan.commands.buildHandoff.includes("build-market-asset-intake-handoff-template"));
    assert.ok(plan.commands.checkTransferReadiness.includes("transfer-completions-us-001.json"));
    assert.ok(plan.commands.convertManifest.includes("convert-market-asset-manifest"));
  });

  it("supports custom batch metadata", () => {
    const plan = buildMarketAssetFirstBatchCommandPlan({
      batchId: "market-assets-2026-07-gb-001",
      market: "GB",
      createdAt: "2026-07-09",
      owner: "Brand team",
      fileSuffix: "gb-001",
    });

    assert.equal(plan.files.handoff, "intake-handoff-gb-001.json");
    assert.ok(plan.commands.buildHandoff.includes("GB market-assets-2026-07-gb-001 2026-07-09"));
    assert.ok(plan.commands.buildHandoff.includes('"Brand team"'));
  });
});
