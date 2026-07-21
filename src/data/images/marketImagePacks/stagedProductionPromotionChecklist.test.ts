import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildStagedProductionPromotionChecklist } from "./stagedProductionPromotionChecklist";
import type { StagedProductionMarketImagePack } from "./stagedProductionPacks";
import type { MarketImageRegistryEntry } from "../imageTypes";

const stagedEntry: MarketImageRegistryEntry = {
  id: "us-homepage-hero-premium-001",
  market: "US",
  region: "north-america",
  locale: "en-US",
  audience: "local",
  url: "/images/markets/us/homepage/hero.jpg",
  alt: "Traveler arriving in a modern city",
  product: "global",
  usage: "homepage-hero",
  source: "premium-stock",
  status: "premium-approved",
  license: "Commercial license",
  licenseNotes: "Commercial web and mobile-web use approved.",
  pageSurfaces: ["Homepage hero"],
  intendedSlot: "US homepage hero",
  desktopApproved: true,
  mobileApproved: true,
  launchCritical: true,
  contentRole: "marketing",
  productionPriority: "p0-launch-critical",
  premiumReplacementRequired: false,
};

const stagedPack: StagedProductionMarketImagePack = {
  batchId: "market-assets-2026-07-us-001",
  market: "US",
  entries: [stagedEntry],
  notes: "Reviewed output from manifest conversion.",
};

describe("buildStagedProductionPromotionChecklist", () => {
  it("builds a checklist for a valid staged batch", () => {
    const result = buildStagedProductionPromotionChecklist(
      "market-assets-2026-07-us-001",
      "US",
      [stagedPack],
    );

    assert.equal(result.valid, true);
    assert.equal(result.entriesToPromote, 1);
    assert.deepEqual(result.targetFiles, ["src/data/images/marketImagePacks/priorityMarkets.ts"]);
    assert.ok(result.items.some((item) => item.label.includes("Product/design") && !item.complete));
    assert.ok(result.postPromotionCommands.includes("npm run audit:market-images"));
  });

  it("fails when no target entries are found", () => {
    const result = buildStagedProductionPromotionChecklist(
      "market-assets-2026-07-ca-001",
      "CA",
      [stagedPack],
    );

    assert.equal(result.valid, false);
    assert.equal(result.entriesToPromote, 0);
    assert.ok(result.errors.some((error) => error.includes("No promotion target entries")));
  });
});
