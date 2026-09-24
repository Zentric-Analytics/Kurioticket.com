import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsSource = readFileSync(
  "src/components/results/FlightResultsClient.tsx",
  "utf8",
);
const indicatorSource = readFileSync(
  "src/components/results/FlightResultsScrollIndicator.tsx",
  "utf8",
);
const geometrySource = readFileSync(
  "src/lib/flights/flightResultsScrollIndicator.ts",
  "utf8",
);
const globalCss = readFileSync("src/app/globals.css", "utf8");

test("Flight mobile web uses a route-owned custom document scrollbar", () => {
  assert.match(resultsSource, /<FlightResultsScrollIndicator \/>/);
  assert.match(indicatorSource, /window\.scrollY/);
  assert.match(indicatorSource, /document\.documentElement\.scrollHeight/);
  assert.match(indicatorSource, /document\.body\.scrollHeight/);
  assert.match(indicatorSource, /requestAnimationFrame/);
  assert.doesNotMatch(indicatorSource, /overflow-y-auto|setInterval/);
});

test("Flight mobile web hides only the native scrollbar for this route", () => {
  assert.match(indicatorSource, /data-flight-results-scroll-indicator/);
  assert.match(globalCss, /@media \(max-width: 639px\)/);
  assert.match(
    globalCss,
    /html\[data-flight-results-scroll-indicator\]::-webkit-scrollbar/,
  );
  assert.doesNotMatch(globalCss, /\*::-webkit-scrollbar/);
});

test("Flight mobile web thumb is exactly half of the previous 44-96px bounds", () => {
  assert.match(
    geometrySource,
    /FLIGHT_RESULTS_WEB_SCROLL_THUMB_MIN_HEIGHT = 22/,
  );
  assert.match(
    geometrySource,
    /FLIGHT_RESULTS_WEB_SCROLL_THUMB_MAX_HEIGHT = 48/,
  );
});

test("Flight mobile web indicator remains passive and respects safe areas", () => {
  assert.match(indicatorSource, /pointer-events-none fixed/);
  assert.match(indicatorSource, /safe-area-inset-top/);
  assert.match(indicatorSource, /safe-area-inset-right/);
  assert.match(indicatorSource, /safe-area-inset-bottom/);
});
