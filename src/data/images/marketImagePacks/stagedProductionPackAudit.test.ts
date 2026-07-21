import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { auditStagedProductionMarketImagePacks } from "./stagedProductionPackAudit";
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

describe("auditStagedProductionMarketImagePacks", () => {
  it("passes clean staged packs", () => {
    const result = auditStagedProductionMarketImagePacks([stagedPack], []);

    assert.equal(result.valid, true);
    assert.equal(result.stagedPackCount, 1);
    assert.equal(result.stagedImageCount, 1);
    assert.deepEqual(result.errors, []);
  });

  it("fails when a staged entry conflicts with active registry ids", () => {
    const result = auditStagedProductionMarketImagePacks([stagedPack], [stagedEntry]);

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("id already exists")));
    assert.ok(result.errors.some((error) => error.includes("url already exists")));
  });

  it("fails when a staged entry market does not match its pack", () => {
    const result = auditStagedProductionMarketImagePacks(
      [{ ...stagedPack, market: "CA" }],
      [],
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("market must match")));
  });

  it("fails when a staged entry is replacement-needed or missing crop approval", () => {
    const result = auditStagedProductionMarketImagePacks(
      [
        {
          ...stagedPack,
          entries: [
            {
              ...stagedEntry,
              premiumReplacementRequired: true,
              desktopApproved: false,
            },
          ],
        },
      ],
      [],
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("premiumReplacementRequired")));
    assert.ok(result.errors.some((error) => error.includes("crop approval")));
  });
});
