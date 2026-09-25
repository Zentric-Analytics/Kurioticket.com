import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsSource = readFileSync(
  "src/components/results/CarsResultsClient.tsx",
  "utf8",
);
const indicatorSource = readFileSync(
  "src/components/results/CarsResultsScrollIndicator.tsx",
  "utf8",
);
const globalCss = readFileSync("src/app/globals.css", "utf8");

test("Cars mobile indicator reflects document scrolling without a nested owner", () => {
  assert.match(resultsSource, /<CarsResultsScrollIndicator \/>/);
  assert.doesNotMatch(resultsSource, /mobileResultsScrollOwnerRef/);
  assert.doesNotMatch(
    resultsSource,
    /max-sm:h-\[calc\(100dvh[^\n]*max-sm:overflow-y-auto/,
  );
  assert.match(indicatorSource, /window\.scrollY/);
  assert.doesNotMatch(indicatorSource, /document\.documentElement\.scrollHeight/);
  assert.doesNotMatch(indicatorSource, /document\.body\.scrollHeight/);
  assert.doesNotMatch(indicatorSource, /overflow-y-auto|setInterval/);
});

test("native scrollbar suppression is route-owned and mobile-only", () => {
  assert.match(indicatorSource, /data-cars-results-scroll-indicator/);
  assert.match(globalCss, /@media \(max-width: 639px\)/);
  assert.match(
    globalCss,
    /html\[data-cars-results-scroll-indicator\]::-webkit-scrollbar/,
  );
  assert.doesNotMatch(globalCss, /\*::-webkit-scrollbar/);
});

test("Cars indicator starts at the Track prices bar and measures the results region", () => {
  assert.match(resultsSource, /data-cars-results-scroll-region/);
  assert.match(indicatorSource, /data-cars-price-alert/);
  assert.match(indicatorSource, /data-cars-results-scroll-region/);
  assert.match(indicatorSource, /regionBottom - viewportHeight/);
});

test("custom indicator is passive and uses dynamic Track-prices top geometry", () => {
  assert.match(indicatorSource, /pointer-events-none fixed/);
  assert.match(indicatorSource, /safe-area-inset-right/);
  assert.match(indicatorSource, /safe-area-inset-bottom/);
  assert.match(indicatorSource, /track\.style\.top/);
  assert.match(indicatorSource, /calculateCarResultsScrollIndicatorGeometry/);
  assert.doesNotMatch(indicatorSource, /top-\[calc\(env\(safe-area-inset-top\)/);
});
