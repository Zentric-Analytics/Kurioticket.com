import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetBatchTemplate } from "./marketAssetBatchTemplate";
import { reviewMarketAssetManifest } from "./marketAssetManifestReview";
import type { MarketAssetManifest } from "./marketAssetManifest";

function buildReadyManifest(): MarketAssetManifest {
  const manifest = buildMarketAssetBatchTemplate("US", {
    batchId: "market-assets-2026-07-us-001",
    createdAt: "2026-07-08",
    owner: "Design ops",
  });

  return {
    ...manifest,
    entries: manifest.entries.map((entry, index) => ({
      ...entry,
      sourcePage: `https://example.com/assets/${index}`,
      license: "Commercial license",
      licenseNotes: "Commercial web and mobile-web use approved.",
      dimensions: "2400 x 1600",
      cropNotes: "Reviewed for desktop and mobile crops.",
      desktopApproved: true,
      mobileApproved: true,
      reviewer: "Design review",
      approvedAt: "2026-07-08",
      notes: "Approved manifest entry.",
    })),
  };
}

describe("reviewMarketAssetManifest", () => {
  it("combines summary and readiness for a completed manifest", () => {
    const review = reviewMarketAssetManifest(buildReadyManifest());

    assert.equal(review.ready, true);
    assert.equal(review.summary.totalEntries, 13);
    assert.equal(review.summary.fullyCropApproved, 13);
    assert.deepEqual(review.readiness.errors, []);
  });

  it("marks generated templates as not ready", () => {
    const review = reviewMarketAssetManifest(buildMarketAssetBatchTemplate("GH"));

    assert.equal(review.ready, false);
    assert.equal(review.summary.totalEntries, 13);
    assert.ok(review.readiness.errors.length > 0);
  });
});
