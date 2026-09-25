import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsSource = readFileSync(
  "src/components/results/HotelResultsClient.tsx",
  "utf8",
);
const indicatorSource = readFileSync(
  "src/components/results/HotelResultsScrollIndicator.tsx",
  "utf8",
);
const globalCss = readFileSync("src/app/globals.css", "utf8");

test("Hotel mobile results owns a Cars-style document scroll indicator", () => {
  assert.match(resultsSource, /<HotelResultsScrollIndicator \/>/);
  assert.match(resultsSource, /data-hotel-results-scroll-region/);
  assert.match(resultsSource, /data-hotel-price-alert-row/);
  assert.match(indicatorSource, /window\.scrollY/);
  assert.doesNotMatch(indicatorSource, /document\.documentElement\.scrollHeight/);
  assert.doesNotMatch(indicatorSource, /document\.body\.scrollHeight/);
});

test("Hotel indicator starts at Track this stay price and measures the results region", () => {
  assert.match(indicatorSource, /data-hotel-price-alert-row/);
  assert.match(indicatorSource, /data-hotel-results-scroll-region/);
  assert.match(indicatorSource, /regionBottom - viewportHeight/);
  assert.match(indicatorSource, /track\.style\.top/);
  assert.match(indicatorSource, /MIN_TRACK_HEIGHT_PX = 96/);
});

test("Hotel custom indicator is mobile-only and replaces the native scrollbar only on this route", () => {
  assert.match(indicatorSource, /data-hotel-results-scroll-indicator/);
  assert.match(indicatorSource, /sm:hidden/);
  assert.match(globalCss, /html\[data-hotel-results-scroll-indicator\]/);
  assert.match(globalCss, /div\[data-hotel-results-scroll-indicator\]/);
});
