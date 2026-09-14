import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const loading = readFileSync("src/features/search/HotelDetailsLoadingState.tsx", "utf8");

test("hotel details masks the partial page until enrichment settles", () => {
  assert.match(screen, /detailsStatus === "loading"[\s\S]*?<HotelDetailsLoadingState/);
  assert.match(screen, /StyleSheet\.absoluteFill/);
  assert.match(screen, /detailsLoadingOverlay/);
  assert.match(screen, /zIndex: detailsStatus === "loading" \? 40 : 20/);
});

test("hotel details loading shell is stable, accessible, skeleton-only, and does not expose unfinished sections", () => {
  assert.match(loading, /accessibilityRole="progressbar"/);
  assert.match(loading, /accessibilityState=\{\{ busy: true \}\}/);
  assert.match(loading, /accessibilityLabel=\{`Loading \$\{hotelName\} hotel details`\}/);
  assert.doesNotMatch(loading, />Loading hotel details…<|s\.label|label:\s*\{/);
  assert.match(loading, /const heroHeight = Math\.round\(width \* 0\.94\)/);
  for (const unfinishedSection of ["About this hotel", "Location", "Popular amenities", "Room & comfort", "Accessibility"]) {
    assert.doesNotMatch(loading, new RegExp(unfinishedSection.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
