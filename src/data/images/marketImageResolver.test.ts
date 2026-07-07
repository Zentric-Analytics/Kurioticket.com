import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveMarketImage } from "./marketImageResolver";
import type { MarketImageRegistryEntry } from "./imageTypes";

const baseImage = {
  url: "/images/test/global.jpg",
  alt: "Traveler walking through a modern airport terminal",
  product: "global",
  usage: "homepage-hero",
  source: "premium-stock",
  status: "premium-approved",
  license: "Test commercial license",
  pageSurfaces: ["Homepage hero"],
  intendedSlot: "Test homepage hero",
  desktopApproved: true,
  mobileApproved: true,
  launchCritical: true,
  contentRole: "marketing",
  productionPriority: "p0-launch-critical",
  premiumReplacementRequired: false,
} satisfies Omit<MarketImageRegistryEntry, "id" | "audience">;

const registry: MarketImageRegistryEntry[] = [
  {
    ...baseImage,
    id: "global-hero",
    region: "global",
    audience: "global",
  },
  {
    ...baseImage,
    id: "west-africa-hero",
    region: "west-africa",
    audience: "local",
    url: "/images/test/west-africa.jpg",
  },
  {
    ...baseImage,
    id: "ghana-hero",
    market: "GH",
    region: "west-africa",
    audience: "local",
    url: "/images/test/ghana.jpg",
  },
];

describe("resolveMarketImage", () => {
  it("prefers an exact market image over regional and global fallbacks", () => {
    const resolution = resolveMarketImage(
      { market: "GH", product: "global", usage: "homepage-hero" },
      registry,
    );

    assert.equal(resolution?.level, "market");
    assert.equal(resolution?.image.id, "ghana-hero");
  });

  it("falls back to a default region when a market image is missing", () => {
    const resolution = resolveMarketImage(
      { market: "NG", product: "global", usage: "homepage-hero" },
      registry,
    );

    assert.equal(resolution?.level, "region");
    assert.equal(resolution?.image.id, "west-africa-hero");
  });

  it("falls back to the global image when no market or regional image exists", () => {
    const resolution = resolveMarketImage(
      { market: "JP", product: "global", usage: "homepage-hero" },
      registry,
    );

    assert.equal(resolution?.level, "global");
    assert.equal(resolution?.image.id, "global-hero");
  });
});
