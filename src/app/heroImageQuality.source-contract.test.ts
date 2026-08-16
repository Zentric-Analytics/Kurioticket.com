import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { carsHeroImage, tripStyleCards } from "@/data/carsLandingContent";

const carsPageSource = readFileSync("src/app/cars/page.tsx", "utf8");
const homepageSource = readFileSync("src/app/page.tsx", "utf8");

const imageTagsUsing = (source: string, expression: string) =>
  [...source.matchAll(/<Image\b[\s\S]*?\/>/g)]
    .map(([tag]) => tag)
    .filter((tag) => tag.includes(`src={${expression}}`));

describe("hero image quality source contracts", () => {
  it("uses a dedicated, hero-sized Cars source while retaining the SUV card source", () => {
    const suvCardUrl = new URL(tripStyleCards[1].image);

    assert.equal(
      carsHeroImage,
      "/images/premium/cars/kurioticket-cars-hero-coastal-convertible-001.jpg",
    );
    assert.equal(suvCardUrl.searchParams.get("w"), "1200");
    assert.equal(suvCardUrl.searchParams.get("q"), "80");
    assert.doesNotMatch(carsPageSource, /tripStyleCards\[1\]\.image/);
  });

  it("keeps both Cars hero Image components responsive, prioritized, and full quality", () => {
    const heroImages = imageTagsUsing(carsPageSource, "carsHeroImage");

    assert.equal(heroImages.length, 2);
    for (const image of heroImages) {
      assert.match(image, /\bfill\b/);
      assert.match(image, /\bpriority\b/);
      assert.match(image, /sizes="100vw"/);
      assert.match(image, /quality=\{100\}/);
      assert.doesNotMatch(image, /\b(?:blur|unoptimized)\b|image-rendering/);
    }
  });

  it("keeps the mobile Cars photograph clean instead of darkening or color-filtering it", () => {
    const mobileHero = carsPageSource.slice(
      carsPageSource.indexOf('aria-labelledby="cars-mobile-search-heading"'),
      carsPageSource.indexOf('aria-labelledby="cars-search-heading"'),
    );

    assert.doesNotMatch(mobileHero, /brightness-|saturate-|contrast-/);
    assert.doesNotMatch(mobileHero, /from-slate-950|via-slate-950|to-slate-950/);
  });

  it("keeps Cars hero dimensions and search positioning unchanged", () => {
    assert.match(carsPageSource, /min-h-\[24\.25rem\]/);
    assert.match(carsPageSource, /min-h-\[25rem\].*lg:min-h-\[27rem\]/);
    assert.match(carsPageSource, /absolute inset-x-0 bottom-\[-23rem\] z-30/);
    assert.match(
      carsPageSource,
      /absolute inset-x-0 bottom-\[-64px\] z-30 lg:bottom-\[-68px\]/,
    );
  });

  it("keeps the market-aware homepage hero at quality 92 without image hacks", () => {
    const [heroImage] = imageTagsUsing(homepageSource, "homepageHeroImage.url");

    assert.ok(heroImage);
    assert.match(homepageSource, /getHomepageHeroImageForMarket/);
    assert.match(heroImage, /\bfill\b/);
    assert.match(heroImage, /\bpriority\b/);
    assert.match(heroImage, /sizes="100vw"/);
    assert.match(heroImage, /quality=\{92\}/);
    assert.doesNotMatch(heroImage, /\b(?:blur|unoptimized)\b|image-rendering/);
  });

  it("aligns the 3rem mobile product row with the hero boundary without changing desktop", () => {
    assert.match(
      homepageSource,
      /min-h-\[420px\].*sm:min-h-\[550px\].*lg:min-h-\[610px\]/,
    );
    assert.match(homepageSource, /data-testid="mobile-homepage-hero"/);
    assert.match(homepageSource, /top-\[calc\(100%-3rem\)\] z-30 sm:hidden/);
    assert.match(
      homepageSource,
      /pt-\[max\(1\.75rem,calc\(var\(--mobile-search-card-height\)_-_1\.25rem\)\)\]/,
    );
    assert.match(homepageSource, /--mobile-search-card-height[\s\S]*sm:pt-24.*lg:pt-28/);
    assert.match(
      homepageSource,
      /bottom-\[-52px\] z-30 hidden sm:block lg:bottom-\[-56px\]/,
    );
  });
});
