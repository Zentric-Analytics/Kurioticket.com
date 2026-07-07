import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateMarketAssetManifest,
  type MarketAssetManifest,
} from "./marketAssetManifest";

const validManifest: MarketAssetManifest = {
  batchId: "market-assets-2026-07-us-001",
  createdAt: "2026-07-07",
  owner: "Zentric Analytics",
  entries: [
    {
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
      sourcePage: "https://example.com/asset/us-hero",
      license: "Commercial license",
      licenseNotes: "Commercial web and mobile-web use approved.",
      vendor: "iStock",
      collection: "Essentials",
      stockFileId: "example-123",
      dimensions: "2400 x 1600",
      cropNotes: "Safe for desktop and mobile hero crops.",
      focalPoint: "center",
      desktopApproved: true,
      mobileApproved: true,
      pageSurfaces: ["Homepage hero"],
      reviewer: "Design review",
      approvedAt: "2026-07-07",
    },
  ],
};

describe("validateMarketAssetManifest", () => {
  it("accepts a complete market asset manifest", () => {
    const result = validateMarketAssetManifest(validManifest);

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("requires uppercase market codes and lowercase region codes", () => {
    const result = validateMarketAssetManifest({
      ...validManifest,
      entries: [{ ...validManifest.entries[0], market: "us", region: "North-America" }],
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("market must be uppercase")));
    assert.ok(result.errors.some((error) => error.includes("region must be lowercase")));
  });

  it("requires approved desktop and mobile crops", () => {
    const result = validateMarketAssetManifest({
      ...validManifest,
      entries: [{ ...validManifest.entries[0], desktopApproved: false, mobileApproved: false }],
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("desktopApproved must be true")));
    assert.ok(result.errors.some((error) => error.includes("mobileApproved must be true")));
  });

  it("rejects duplicate public image paths", () => {
    const result = validateMarketAssetManifest({
      ...validManifest,
      entries: [
        validManifest.entries[0],
        { ...validManifest.entries[0], id: "us-homepage-hero-premium-002" },
      ],
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("publicImagePath duplicates")));
  });
});
