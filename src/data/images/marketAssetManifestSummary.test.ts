import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetBatchTemplate } from "./marketAssetBatchTemplate";
import { summarizeMarketAssetManifest } from "./marketAssetManifestSummary";

describe("summarizeMarketAssetManifest", () => {
  it("summarizes manifest counts by market, usage, and source", () => {
    const manifest = buildMarketAssetBatchTemplate("US", {
      batchId: "market-assets-2026-07-us-001",
      createdAt: "2026-07-08",
      owner: "Design ops",
    });

    const summary = summarizeMarketAssetManifest(manifest);

    assert.equal(summary.batchId, "market-assets-2026-07-us-001");
    assert.equal(summary.totalEntries, 13);
    assert.equal(summary.markets.US, 13);
    assert.equal(summary.usages["homepage-hero"], 1);
    assert.equal(summary.usages["homepage-destination-card"], 8);
    assert.equal(summary.usages["flight-inspiration-card"], 4);
    assert.equal(summary.sources["premium-stock"], 13);
  });

  it("summarizes crop approvals and missing approval dates", () => {
    const manifest = buildMarketAssetBatchTemplate("GH");
    manifest.entries[0].desktopApproved = true;
    manifest.entries[0].mobileApproved = true;
    manifest.entries[0].approvedAt = "2026-07-08";
    manifest.entries[1].desktopApproved = true;

    const summary = summarizeMarketAssetManifest(manifest);

    assert.equal(summary.approvedForDesktop, 2);
    assert.equal(summary.approvedForMobile, 1);
    assert.equal(summary.fullyCropApproved, 1);
    assert.equal(summary.missingApprovalDates, 12);
  });

  it("reports duplicate public image paths", () => {
    const manifest = buildMarketAssetBatchTemplate("BR");
    manifest.entries[1].publicImagePath = manifest.entries[0].publicImagePath;

    const summary = summarizeMarketAssetManifest(manifest);

    assert.equal(summary.uniquePublicImagePaths, 12);
    assert.deepEqual(summary.duplicatePublicImagePaths, [manifest.entries[0].publicImagePath]);
  });
});
