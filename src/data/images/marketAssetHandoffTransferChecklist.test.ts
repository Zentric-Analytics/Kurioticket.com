import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetHandoffTransferChecklist } from "./marketAssetHandoffTransferChecklist";
import { buildMarketAssetIntakeHandoffTemplate } from "./marketAssetIntakeHandoffTemplate";

describe("buildMarketAssetHandoffTransferChecklist", () => {
  it("creates transfer checklist entries for every handoff item", () => {
    const handoff = buildMarketAssetIntakeHandoffTemplate("US", {
      batchId: "market-assets-2026-07-us-001",
      createdAt: "2026-07-08",
      owner: "Design ops",
    });

    const checklist = buildMarketAssetHandoffTransferChecklist(handoff);

    assert.equal(checklist.batchId, "market-assets-2026-07-us-001");
    assert.equal(checklist.market, "US");
    assert.equal(checklist.totalItems, 13);
    assert.equal(checklist.entries.length, 13);
    assert.equal(checklist.entries[0].checklist.length, 8);
    assert.ok(
      checklist.entries[0].checklist.some((item) => item.label.includes("sourceFilePath")),
    );
    assert.ok(checklist.entries[0].checklist.some((item) => item.label.includes("0 x 0")));
  });
});
