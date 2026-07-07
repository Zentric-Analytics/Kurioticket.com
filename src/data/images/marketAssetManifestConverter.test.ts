import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  convertMarketAssetManifestEntry,
  convertMarketAssetManifestToRegistryEntries,
} from "./marketAssetManifestConverter";
import type { MarketAssetManifest, MarketAssetManifestEntry } from "./marketAssetManifest";

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
};

const manifest: MarketAssetManifest = {
  batchId: "market-assets-2026-07-us-001",
  createdAt: "2026-07-07",
  owner: "Zentric Analytics",
  entries: [manifestEntry],
};

describe("convertMarketAssetManifestEntry", () => {
  it("converts a manifest entry into a market image registry entry", () => {
    const registryEntry = convertMarketAssetManifestEntry(manifestEntry, manifest);

    assert.equal(registryEntry.id, manifestEntry.id);
    assert.equal(registryEntry.market, "US");
    assert.equal(registryEntry.region, "north-america");
    assert.equal(registryEntry.url, manifestEntry.publicImagePath);
    assert.equal(registryEntry.status, "premium-approved");
    assert.equal(registryEntry.launchCritical, true);
    assert.equal(registryEntry.productionPriority, "p0-launch-critical");
    assert.equal(registryEntry.premiumReplacementRequired, false);
    assert.match(registryEntry.notes ?? "", /Manifest batch: market-assets-2026-07-us-001/);
  });

  it("marks non-hero marketing assets as public-important", () => {
    const registryEntry = convertMarketAssetManifestEntry(
      { ...manifestEntry, usage: "homepage-destination-card" },
      manifest,
    );

    assert.equal(registryEntry.launchCritical, false);
    assert.equal(registryEntry.productionPriority, "p1-public-important");
  });
});

describe("convertMarketAssetManifestToRegistryEntries", () => {
  it("converts every entry in a valid manifest", () => {
    const result = convertMarketAssetManifestToRegistryEntries(manifest);

    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
    assert.equal(result.entries.length, 1);
  });

  it("does not convert invalid manifests", () => {
    const result = convertMarketAssetManifestToRegistryEntries({
      ...manifest,
      entries: [{ ...manifestEntry, market: "us" }],
    });

    assert.equal(result.valid, false);
    assert.equal(result.entries.length, 0);
    assert.ok(result.errors.some((error) => error.includes("market must be uppercase")));
  });
});
