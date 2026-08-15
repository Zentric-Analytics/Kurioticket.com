import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("Deals hero is a clean high-resolution image without marketing copy or readability overlays", () => {
  assert.match(page, /const dealsHeroImage = "https:\/\/images\.unsplash\.com\/photo-1464037866556-6812c9d1c72e/);
  assert.match(page, /fit=crop&w=2400&q=90/);
  assert.match(page, /fill priority quality=\{90\} sizes="100vw"/);
  assert.match(page, /object-cover object-\[center_52%\] lg:object-\[center_48%\]/);
  assert.doesNotMatch(page, /linear-gradient|bg-gradient/);
  assert.doesNotMatch(page, /deals\.heroTitle|deals\.heroSubtitle|<h1/);
  assert.match(page, /<DealsSearchForm presentation="desktop-landing"/);
});
