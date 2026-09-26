import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateFlightResultsScrollIndicatorGeometry } from "@/lib/flights/flightResultsScrollIndicator";

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

test("Flight mobile web uses the stable Hotel/Cars-style results-region scrollbar model", () => {
  assert.match(resultsSource, /<FlightResultsScrollIndicator \/>/);
  assert.match(indicatorSource, /window\.scrollY/);
  assert.match(indicatorSource, /\[data-flight-mobile-results-intro\]/);
  assert.match(indicatorSource, /\[data-mobile-paginated-flight-results\]/);
  assert.match(indicatorSource, /regionBottom - viewportHeight/);
  assert.match(indicatorSource, /const trackTop = Math\.min\(scrollStart, maxTrackTop\)/);
  assert.doesNotMatch(indicatorSource, /compactHeaderVisible|data-flight-results-compact-header/);
  assert.doesNotMatch(indicatorSource, /document\.documentElement\.scrollHeight|document\.body\.scrollHeight/);
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
  assert.match(indicatorSource, /safe-area-inset-right/);
  assert.match(indicatorSource, /safe-area-inset-bottom/);
});

test("Flight results geometry clamps progress to its explicit region", () => {
  const geometry = (scrollTop: number) => calculateFlightResultsScrollIndicatorGeometry({
    scrollTop,
    scrollStart: 500,
    scrollEnd: 1500,
    trackHeight: 200,
  });
  assert.equal(geometry(400).scrollProgress, 0);
  assert.equal(geometry(500).scrollProgress, 0);
  assert.equal(geometry(1000).scrollProgress, 0.5);
  assert.equal(geometry(1500).scrollProgress, 1);
  assert.equal(geometry(1700).scrollProgress, 1);
  assert.equal(geometry(500).isScrollable, true);
  assert.equal(calculateFlightResultsScrollIndicatorGeometry({ scrollTop: 500, scrollStart: 500, scrollEnd: 500, trackHeight: 200 }).isScrollable, false);
});
