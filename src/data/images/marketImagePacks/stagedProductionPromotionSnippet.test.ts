import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildStagedProductionPromotionSnippet } from "./stagedProductionPromotionSnippet";
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

describe("buildStagedProductionPromotionSnippet", () => {
  it("returns a valid snippet result for an approved staged pack", () => {
    const result = buildStagedProductionPromotionSnippet(
      "market-assets-2026-07-us-001",
      "US",
      [stagedPack],
    );

    assert.equal(result.valid, true);
    assert.equal(result.entriesToPromote, 1);
    assert.deepEqual(result.targetFiles, ["src/data/images/marketImagePacks/priorityMarkets.ts"]);
    assert.equal(result.checklist.valid, true);
  });

  it("includes promotion metadata, staged entries, and review safety note", () => {
    const result = buildStagedProductionPromotionSnippet(
      "market-assets-2026-07-us-001",
      "US",
      [stagedPack],
    );

    assert.match(result.snippet, /market-assets-2026-07-us-001/);
    assert.match(result.snippet, /Market: US/);
    assert.match(result.snippet, /src\/data\/images\/marketImagePacks\/priorityMarkets\.ts/);
    assert.match(result.snippet, /us-homepage-hero-premium-001/);
    assert.match(result.snippet, /Review before committing/i);
  });

  it("returns invalid when the requested staged pack is missing", () => {
    const result = buildStagedProductionPromotionSnippet(
      "market-assets-2026-07-ca-001",
      "CA",
      [stagedPack],
    );

    assert.equal(result.valid, false);
    assert.equal(result.snippet, "");
    assert.ok(result.errors.some((error) => error.includes("No staged production pack")));
  });

  it("does not mutate staged pack entries", () => {
    const packs = [structuredClone(stagedPack)];
    const before = structuredClone(packs);

    buildStagedProductionPromotionSnippet("market-assets-2026-07-us-001", "US", packs);

    assert.deepEqual(packs, before);
  });
});
