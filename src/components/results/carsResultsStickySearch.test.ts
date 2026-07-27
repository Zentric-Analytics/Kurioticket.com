import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
test("source-contract: Cars uses the full form measurement and in-place dialog", () => {
  assert.match(source, /shouldShowDesktopStickySearch/);
  assert.match(source, /new IntersectionObserver/);
  assert.match(source, /role="dialog" aria-modal="true" aria-labelledby="sticky-cars-search-title"/);
  assert.match(source, /focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /cars-results-full-search/);
  assert.match(source, /sticky-cars-search/);
  assert.doesNotMatch(source, /stickySentinelRef|isSearchExpandedWhileSticky|scrollIntoView/);
});
