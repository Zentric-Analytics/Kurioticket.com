import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildMarketAssetBatchTemplate,
  marketAssetTemplatePlaceholderDimensions,
} from "./marketAssetBatchTemplate";
import { checkMarketAssetManifestReadiness } from "./marketAssetManifestReadiness";
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

describe("checkMarketAssetManifestReadiness", () => {
  it("fails generated templates that still contain placeholders", () => {
    const result = checkMarketAssetManifestReadiness(buildMarketAssetBatchTemplate("US"));

    assert.equal(result.ready, false);
    assert.ok(result.errors.some((error) => error.includes("createdAt")));
    assert.ok(result.errors.some((error) => error.includes("TODO")));
    assert.ok(result.errors.some((error) => error.includes("dimensions")));
    assert.ok(result.errors.some((error) => error.includes("desktopApproved")));
  });

  it("fails typed template placeholder dimensions", () => {
    const manifest = buildReadyManifest();
    manifest.entries[0].dimensions = marketAssetTemplatePlaceholderDimensions;

    const result = checkMarketAssetManifestReadiness(manifest);

    assert.equal(result.ready, false);
    assert.ok(result.errors.some((error) => error.includes("dimensions")));
  });

  it("passes a completed manifest", () => {
    const result = checkMarketAssetManifestReadiness(buildReadyManifest());

    assert.equal(result.ready, true);
    assert.deepEqual(result.errors, []);
  });

  it("warns when approval dates are missing", () => {
    const manifest = buildReadyManifest();
    delete manifest.entries[0].approvedAt;

    const result = checkMarketAssetManifestReadiness(manifest);

    assert.equal(result.ready, true);
    assert.ok(result.warnings.some((warning) => warning.includes("approvedAt")));
  });
});
