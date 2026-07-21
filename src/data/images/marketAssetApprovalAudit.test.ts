import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { auditMarketAssetApprovals } from "./marketAssetApprovalAudit";
import type { MarketImageRegistryEntry } from "./imageTypes";
import type { ProductionMarketAssetRequirement } from "./productionMarketAssetRequirements";

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

const approvedImage: MarketImageRegistryEntry = {
  id: "us-homepage-hero-approved-001",
  market: "US",
  region: "north-america",
  locale: "en-US",
  audience: "local",
  url: "/images/markets/us/homepage/hero.jpg",
  alt: "Traveler in a city",
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

describe("auditMarketAssetApprovals", () => {
  it("marks a requirement complete when enough approved images exist", () => {
    const result = auditMarketAssetApprovals([requirement], [approvedImage]);

    assert.equal(result.isComplete, true);
    assert.equal(result.totalRequiredImages, 1);
    assert.equal(result.totalApprovedImages, 1);
    assert.equal(result.totalMissingImages, 0);
  });

  it("does not count replacement-needed images as approved", () => {
    const result = auditMarketAssetApprovals(
      [requirement],
      [{ ...approvedImage, status: "replace-before-launch", premiumReplacementRequired: true }],
    );

    assert.equal(result.isComplete, false);
    assert.equal(result.totalApprovedImages, 0);
    assert.equal(result.totalMissingImages, 1);
  });

  it("does not count uncropped images as approved", () => {
    const result = auditMarketAssetApprovals(
      [requirement],
      [{ ...approvedImage, desktopApproved: false }],
    );

    assert.equal(result.isComplete, false);
    assert.equal(result.totalApprovedImages, 0);
    assert.equal(result.totalMissingImages, 1);
  });
});
