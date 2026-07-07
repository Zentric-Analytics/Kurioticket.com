import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkMarketAssetManifestConflicts } from "./marketAssetManifestConflictCheck";
import type { MarketImageRegistryEntry } from "./imageTypes";
import type { MarketAssetManifest, MarketAssetManifestEntry } from "./marketAssetManifest";
import type { ProductionMarketAssetRequirement } from "./productionMarketAssetRequirements";

const manifestEntry: MarketAssetManifestEntry = {
  id: "us-homepage-hero-premium-001",
  market: "US",
  region: "north-america",
  locale: "en-US",
  audience: "local",
  product: "global",
  usage: "homepage-hero",
  source: "premium-stock",
  sourceFilePath: "assets/markets/us/homepage/hero-source.jpg",
  publicImagePath: "/images/markets/us/homepage/hero.jpg",
  alt: "Traveler arriving in a modern city",
  intendedSlot: "US homepage hero",
  license: "Commercial license",
  licenseNotes: "Commercial web and mobile-web use approved.",
  dimensions: "2400 x 1600",
  cropNotes: "Safe for desktop and mobile hero crops.",
  focalPoint: "center",
  desktopApproved: true,
  mobileApproved: true,
  pageSurfaces: ["Homepage hero"],
  reviewer: "Design review",
};

const manifest: MarketAssetManifest = {
  batchId: "market-assets-2026-07-us-001",
  createdAt: "2026-07-07",
  owner: "Zentric Analytics",
  entries: [manifestEntry],
};

const requirement: ProductionMarketAssetRequirement = {
  id: "us-homepage-hero-production-asset-requirement",
  market: "US",
  region: "north-america",
  usage: "homepage-hero",
  requiredCount: 1,
  priority: "p0",
  brief: "US homepage hero",
  mustHave: [],
  mustAvoid: [],
  recommendedAspectRatios: ["16:9"],
  status: "needed",
};

const registryEntry: MarketImageRegistryEntry = {
  id: manifestEntry.id,
  market: "US",
  region: "north-america",
  locale: "en-US",
  audience: "local",
  url: manifestEntry.publicImagePath,
  alt: manifestEntry.alt,
  product: "global",
  usage: "homepage-hero",
  source: "premium-stock",
  status: "premium-approved",
  license: "Commercial license",
  pageSurfaces: ["Homepage hero"],
  intendedSlot: "US homepage hero",
  desktopApproved: true,
  mobileApproved: true,
  launchCritical: true,
  contentRole: "marketing",
  productionPriority: "p0-launch-critical",
  premiumReplacementRequired: false,
};

describe("checkMarketAssetManifestConflicts", () => {
  it("passes when manifest entries are new and match intake requirements", () => {
    const result = checkMarketAssetManifestConflicts(manifest, [], [requirement]);

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
  });

  it("fails when a manifest entry id already exists in the registry", () => {
    const result = checkMarketAssetManifestConflicts(
      { ...manifest, entries: [{ ...manifestEntry, publicImagePath: "/images/markets/us/homepage/new.jpg" }] },
      [registryEntry],
      [requirement],
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("id already exists")));
  });

  it("fails when a manifest entry url already exists in the registry", () => {
    const result = checkMarketAssetManifestConflicts(
      { ...manifest, entries: [{ ...manifestEntry, id: "us-homepage-hero-premium-002" }] },
      [registryEntry],
      [requirement],
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("publicImagePath already exists")));
  });

  it("warns when a manifest entry does not match current intake requirements", () => {
    const result = checkMarketAssetManifestConflicts(manifest, [], []);

    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((warning) => warning.includes("does not match")));
  });
});
