import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Package suggestion product icon mapping is exact and canonically ordered", () => {
  const source = readFileSync("src/features/flow/SearchResultProductIcons.tsx", "utf8");
  assert.match(source, /"hotel-flight": \["flight", "hotel"\]/);
  assert.match(source, /"flight-car": \["flight", "car"\]/);
  assert.match(source, /"hotel-car": \["hotel", "car"\]/);
  assert.match(source, /"hotel-flight-car": \["flight", "hotel", "car"\]/);
});

test("product icon clusters retain one compact decorative 46px slot", () => {
  const source = readFileSync("src/features/flow/SearchResultProductIcons.tsx", "utf8");
  assert.match(source, /icons\.length === 1 \? 22 : icons\.length === 2 \? 17 : 14/);
  assert.match(source, /width: 46, height: 46, borderRadius: 12/);
  assert.match(source, /accessible=\{false\} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/);
  assert.match(source, /export type SearchResultProductIconName = "flight" \| "hotel" \| "car"/);
});

test("Hotel + Car Package reuses HotelDestinationSheet with package icons and no Car picker", () => {
  const source = readFileSync("src/features/flow/PackageSearchForm.tsx", "utf8");
  assert.match(source, /<HotelDestinationSheet[\s\S]*?suggestionIcons=\{PACKAGE_SUGGESTION_ICONS\[search\.mode\]\}/);
  assert.doesNotMatch(source, /CarLocationSheet/);
  assert.match(source, /applyPackageDestination\(current, destination\)/);
});
