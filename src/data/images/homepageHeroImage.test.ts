import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getHomepageHeroImageForMarket, homepageHeroImageFallback } from "./homepageHeroImage";

describe("getHomepageHeroImageForMarket", () => {
  it("resolves a priority market through the market image registry", () => {
    const heroImage = getHomepageHeroImageForMarket("GH");

    assert.equal(heroImage.market, "GH");
    assert.equal(heroImage.resolutionLevel, "market");
  });

  it("normalizes lowercase market codes", () => {
    const heroImage = getHomepageHeroImageForMarket("br");

    assert.equal(heroImage.market, "BR");
    assert.equal(heroImage.resolutionLevel, "market");
  });

  it("keeps a safe global fallback when no explicit market is provided", () => {
    const heroImage = getHomepageHeroImageForMarket(null);

    assert.equal(heroImage.url, homepageHeroImageFallback);
    assert.equal(heroImage.resolutionLevel, "global");
  });
});
