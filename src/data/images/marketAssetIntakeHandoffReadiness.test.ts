import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildMarketAssetIntakeHandoffTemplate,
  type MarketAssetIntakeHandoff,
} from "./marketAssetIntakeHandoffTemplate";
import { checkMarketAssetIntakeHandoffReadiness } from "./marketAssetIntakeHandoffReadiness";

function buildReadyHandoff(): MarketAssetIntakeHandoff {
  const handoff = buildMarketAssetIntakeHandoffTemplate("US", {
    batchId: "market-assets-2026-07-us-001",
    createdAt: "2026-07-08",
    owner: "Design ops",
  });

  return {
    ...handoff,
    items: handoff.items.map((item, index) => ({
      ...item,
      sourceAssetPath: `assets/markets/us/source/${index + 1}.jpg`,
      purchaseOrSourceUrl: `https://example.com/source/${index + 1}`,
      licenseType: "Commercial web and mobile-web license",
      licenseNotes: "Approved for web and mobile-web production use.",
      altText: `Approved US market asset alt text ${index + 1}`,
      dimensions: "2400 x 1600",
      desktopCropNotes: "Desktop crop approved.",
      mobileCropNotes: "Mobile crop approved.",
      reviewer: "Design review",
      approvedAt: "2026-07-08",
      readyForManifest: true,
      notes: "Ready for manifest transfer.",
    })),
  };
}

describe("checkMarketAssetIntakeHandoffReadiness", () => {
  it("fails generated handoff templates that still contain placeholders", () => {
    const result = checkMarketAssetIntakeHandoffReadiness(
      buildMarketAssetIntakeHandoffTemplate("US"),
    );

    assert.equal(result.ready, false);
    assert.ok(result.errors.some((error) => error.includes("createdAt")));
    assert.ok(result.errors.some((error) => error.includes("TODO")));
    assert.ok(result.errors.some((error) => error.includes("readyForManifest")));
  });

  it("passes a completed handoff", () => {
    const result = checkMarketAssetIntakeHandoffReadiness(buildReadyHandoff());

    assert.equal(result.ready, true);
    assert.deepEqual(result.errors, []);
  });

  it("warns when notes are missing", () => {
    const handoff = buildReadyHandoff();
    handoff.items[0].notes = "";

    const result = checkMarketAssetIntakeHandoffReadiness(handoff);

    assert.equal(result.ready, true);
    assert.ok(result.warnings.some((warning) => warning.includes("notes")));
  });
});
