import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/flow/SearchResultProductIcons.tsx", "utf8");

test("package suggestion product icons use the canonical product order", () => {
  assert.match(source, /"hotel-flight": \["flight", "hotel"\]/);
  assert.match(source, /"flight-car": \["flight", "car"\]/);
  assert.match(source, /"hotel-car": \["hotel", "car"\]/);
  assert.match(source, /"hotel-flight-car": \["flight", "hotel", "car"\]/);
});

test("product icons share one compact decorative slot", () => {
  assert.match(source, /width: 46, height: 46, borderRadius: 12/);
  assert.match(source, /flexShrink: 0/);
  assert.match(source, /icons\.length === 1 \? 22 : icons\.length === 2 \? 17 : 14/);
  assert.match(source, /gap: 2/);
  assert.match(source, /threeIcons: \{ gap: 1 \}/);
  assert.match(source, /accessible=\{false\} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/);
});

test("the public product icon type accepts only flight, hotel, and car", () => {
  assert.match(source, /SearchResultProductIconName = "flight" \| "hotel" \| "car"/);
});
