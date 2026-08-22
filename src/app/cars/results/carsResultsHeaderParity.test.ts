import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const carsSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const flightsSource = readFileSync(
  new URL("../../flights/results/page.tsx", import.meta.url),
  "utf8",
);

const getAppHeader = (source: string) =>
  source.match(/<AppHeader[\s\S]*?\/>/)?.[0] ?? "";

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
});

test("Cars Results does not independently render product category tabs", () => {
  const outsideHeader = carsSource.replace(getAppHeader(carsSource), "");
  assert.doesNotMatch(
    outsideHeader,
    /MobileCategoryTabs|TravelNav|categoryTabs/,
  );
});
