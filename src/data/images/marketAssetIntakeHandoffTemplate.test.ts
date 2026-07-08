import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetIntakeHandoffTemplate } from "./marketAssetIntakeHandoffTemplate";

describe("buildMarketAssetIntakeHandoffTemplate", () => {
  it("creates a handoff row for each configured market asset slot", () => {
    const handoff = buildMarketAssetIntakeHandoffTemplate("US", {
      batchId: "market-assets-2026-07-us-001",
      createdAt: "2026-07-08",
      owner: "Design ops",
    });

    assert.equal(handoff.batchId, "market-assets-2026-07-us-001");
    assert.equal(handoff.market, "US");
    assert.equal(handoff.items.length, 13);
    assert.equal(handoff.items[0].usage, "homepage-hero");
    assert.ok(handoff.items.every((item) => item.readyForManifest === false));
    assert.ok(handoff.items.every((item) => item.purchaseOrSourceUrl.includes("TODO")));
  });

  it("preserves batch metadata defaults from the manifest template", () => {
    const handoff = buildMarketAssetIntakeHandoffTemplate("GB");

    assert.equal(handoff.createdAt, "YYYY-MM-DD");
    assert.equal(handoff.owner, "Zentric Analytics");
    assert.equal(handoff.batchId, "market-assets-YYYY-MM-DD-gb-001");
  });
});
