import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { auditActiveProductionPromotionForMarket } from "./activeProductionPromotionAudit";
import type { MarketImageRegistryEntry } from "../imageTypes";

const productionEntry: MarketImageRegistryEntry = {
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

describe("auditActiveProductionPromotionForMarket", () => {
  it("passes production-approved active entries", () => {
    const result = auditActiveProductionPromotionForMarket("US", [productionEntry]);

    assert.equal(result.valid, true);
    assert.equal(result.productionEntryCount, 1);
    assert.deepEqual(result.errors, []);
  });

  it("fails entries that still require replacement or crop approval", () => {
    const result = auditActiveProductionPromotionForMarket("US", [
      {
        ...productionEntry,
        desktopApproved: false,
        premiumReplacementRequired: true,
      },
    ]);

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("premium replacement")));
    assert.ok(result.errors.some((error) => error.includes("crop approval")));
  });

  it("fails launch-critical entries that are not production-approved", () => {
    const result = auditActiveProductionPromotionForMarket("US", [
      {
        ...productionEntry,
        status: "free-approved",
      },
    ]);

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("launch-critical")));
  });

  it("warns when a market has no active production-promoted entries", () => {
    const result = auditActiveProductionPromotionForMarket("CA", [productionEntry]);

    assert.equal(result.valid, true);
    assert.equal(result.productionEntryCount, 0);
    assert.ok(result.warnings.some((warning) => warning.includes("does not have active")));
  });
});
