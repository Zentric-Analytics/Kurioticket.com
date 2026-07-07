import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { previewStagedProductionPackPromotion } from "./stagedProductionPackPromotion";
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

describe("previewStagedProductionPackPromotion", () => {
  it("returns promotion-ready entries for a matching staged pack", () => {
    const result = previewStagedProductionPackPromotion(
      "market-assets-2026-07-us-001",
      "US",
      [stagedPack],
    );

    assert.equal(result.valid, true);
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].id, stagedEntry.id);
    assert.equal(result.audit.valid, true);
  });

  it("fails when the requested staged pack is missing", () => {
    const result = previewStagedProductionPackPromotion(
      "market-assets-2026-07-ca-001",
      "CA",
      [stagedPack],
    );

    assert.equal(result.valid, false);
    assert.equal(result.entries.length, 0);
    assert.ok(result.errors.some((error) => error.includes("No staged production pack found")));
  });

  it("fails when staged packs do not pass audit", () => {
    const result = previewStagedProductionPackPromotion(
      "market-assets-2026-07-us-001",
      "US",
      [
        {
          ...stagedPack,
          entries: [{ ...stagedEntry, desktopApproved: false }],
        },
      ],
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("crop approval")));
  });
});
