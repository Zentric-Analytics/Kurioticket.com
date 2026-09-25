import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const carsSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const safeAreaSource = readFileSync(
  new URL("../../../components/results/CarsResultsMobileSafeArea.tsx", import.meta.url),
  "utf8",
);
const flightsSource = readFileSync(
  new URL("../../flights/results/page.tsx", import.meta.url),
  "utf8",
);

const getAppHeader = (source: string) =>
  [...source.matchAll(/<AppHeader\b[\s\S]*?\/>/g)]
    .map(([header]) => header)
    .find((header) => header.includes("flushDesktopBottom")) ?? "";

test("Cars Results preserves AppHeader while matching Flights mobile header props", () => {
  const carsHeader = getAppHeader(carsSource);
  const flightsHeader = getAppHeader(flightsSource);

  assert.ok(carsHeader, "Cars Results must continue rendering AppHeader");
  for (const prop of [
    "flushDesktopBottom",
    "flushMobileBottom",
    "hideDesktopTravelNav",
    "hideMobileCategoryTabs",
  ]) {
    assert.match(carsHeader, new RegExp(`\\b${prop}\\b`));
  }
  for (const mobileProp of ["flushMobileBottom", "hideMobileCategoryTabs"]) {
    assert.match(flightsHeader, new RegExp(`\\b${mobileProp}\\b`));
    assert.match(carsHeader, new RegExp(`\\b${mobileProp}\\b`));
  }
  assert.doesNotMatch(carsHeader, /mobileSurface="muted"/);
});

test("Cars Results owns a permanent non-interactive white mobile safe-area layer", () => {
  assert.match(carsSource, /<CarsResultsMobileSafeArea \/>/);
  assert.match(safeAreaSource, /data-cars-results-mobile-safe-area/);
  assert.match(
    safeAreaSource,
    /pointer-events-none fixed inset-x-0 top-0 z-\[100\] h-\[env\(safe-area-inset-top\)\] bg-white sm:hidden/,
  );
});

test("Cars Results does not independently render product category tabs", () => {
  const outsideHeader = carsSource.replace(getAppHeader(carsSource), "");
  assert.doesNotMatch(
    outsideHeader,
    /MobileCategoryTabs|TravelNav|categoryTabs/,
  );
});
