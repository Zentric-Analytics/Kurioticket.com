import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildMarketAssetBatchTemplate,
  isProductionAssetIntakeMarket,
  marketAssetTemplatePlaceholderDimensions,
} from "./marketAssetBatchTemplate";

describe("buildMarketAssetBatchTemplate", () => {
  it("builds a complete starter manifest for an intake market", () => {
    const result = buildMarketAssetBatchTemplate("US", {
      batchId: "market-assets-2026-07-us-001",
      createdAt: "2026-07-08",
      owner: "Design ops",
    });

    assert.equal(result.batchId, "market-assets-2026-07-us-001");
    assert.equal(result.createdAt, "2026-07-08");
    assert.equal(result.owner, "Design ops");
    assert.equal(result.entries.length, 13);
    assert.equal(result.entries[0].market, "US");
    assert.equal(result.entries[0].locale, "en-US");
  });

  it("keeps placeholder templates unapproved by default", () => {
    const result = buildMarketAssetBatchTemplate("GH");

    assert.ok(result.entries.every((entry) => entry.desktopApproved === false));
    assert.ok(result.entries.every((entry) => entry.mobileApproved === false));
    assert.ok(result.entries.every((entry) => entry.dimensions === marketAssetTemplatePlaceholderDimensions));
    assert.ok(result.entries.every((entry) => entry.notes?.includes("Do not convert")));
  });

  it("creates required usage counts", () => {
    const result = buildMarketAssetBatchTemplate("BR");
    const counts = new Map<string, number>();

    for (const entry of result.entries) {
      counts.set(entry.usage, (counts.get(entry.usage) ?? 0) + 1);
    }

    assert.equal(counts.get("homepage-hero"), 1);
    assert.equal(counts.get("homepage-destination-card"), 8);
    assert.equal(counts.get("flight-inspiration-card"), 4);
  });

  it("checks supported production intake markets", () => {
    assert.equal(isProductionAssetIntakeMarket("US"), true);
    assert.equal(isProductionAssetIntakeMarket("ZZ"), false);
  });
});
