import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planStagedProductionPackPromotionTargets } from "./stagedProductionPackPromotionTargets";
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

describe("planStagedProductionPackPromotionTargets", () => {
  it("routes priority market staged entries to priorityMarkets.ts", () => {
    const result = planStagedProductionPackPromotionTargets(
      "market-assets-2026-07-us-001",
      "US",
      [stagedPack],
    );

    assert.equal(result.valid, true);
    assert.equal(result.targets.length, 1);
    assert.equal(
      result.targets[0].targetFile,
      "src/data/images/marketImagePacks/priorityMarkets.ts",
    );
    assert.equal(result.targets[0].entries[0].id, stagedEntry.id);
  });

  it("warns and routes non-priority market staged entries to regional review", () => {
    const result = planStagedProductionPackPromotionTargets(
      "market-assets-2026-07-cl-001",
      "CL",
      [
        {
          ...stagedPack,
          batchId: "market-assets-2026-07-cl-001",
          market: "CL",
          entries: [{ ...stagedEntry, id: "cl-homepage-hero-premium-001", market: "CL" }],
        },
      ],
    );

    assert.equal(result.valid, true);
    assert.equal(result.targets[0].targetFile, "src/data/images/marketImagePacks/regions.ts");
    assert.ok(result.warnings.some((warning) => warning.includes("not currently listed")));
  });

  it("fails when the requested staged pack is missing", () => {
    const result = planStagedProductionPackPromotionTargets(
      "market-assets-2026-07-ca-001",
      "CA",
      [stagedPack],
    );

    assert.equal(result.valid, false);
    assert.deepEqual(result.targets, []);
  });
});
