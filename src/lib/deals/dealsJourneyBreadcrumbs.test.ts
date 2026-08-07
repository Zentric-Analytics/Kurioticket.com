import assert from "node:assert/strict";
import test from "node:test";
import {
  getGuidedDealsJourneyProgress,
  getHandoffReadyDealsJourneyProgress,
} from "./dealsJourneyProgress";
import { getDealsJourneyBreadcrumbs } from "./dealsJourneyBreadcrumbs";
import type { DealsPackageMode, DealsSearch } from "./dealsSearchParams";
import type { DealsJourneyStage } from "./dealsJourneyRoutes";

const search = (mode: DealsPackageMode) =>
  ({
    mode,
    origin: "Lagos",
    destination: "Paris",
    startDate: "2026-08-07",
    endDate: "2026-08-09",
  }) as unknown as DealsSearch;

const labels: Record<string, string> = {
  "deals.breadcrumb.selectStay": "Select stay",
  "deals.breadcrumb.selectFlight": "Select flight",
  "deals.breadcrumb.selectCar": "Select car",
  "deals.breadcrumb.details": "Details",
  "deals.breadcrumb.stay": "Stay",
  "deals.breadcrumb.flight": "Flight",
  "deals.breadcrumb.car": "Car",
  "deals.breadcrumb.complete": "Complete",
};

const expected: Record<
  DealsPackageMode,
  Partial<Record<DealsJourneyStage | "complete", string[]>>
> = {
  "hotel-flight": {
    "hotel-results": ["Select stay"],
    "hotel-details": ["Select stay", "Details"],
    "flight-results": ["Stay", "Select flight"],
    "flight-details": ["Stay", "Select flight", "Details"],
    complete: ["Stay", "Flight", "Complete"],
  },
  "hotel-flight-car": {
    "hotel-results": ["Select stay"],
    "hotel-details": ["Select stay", "Details"],
    "flight-results": ["Stay", "Select flight"],
    "flight-details": ["Stay", "Select flight", "Details"],
    "car-results": ["Stay", "Flight", "Select car"],
    "car-details": ["Stay", "Flight", "Select car", "Details"],
    complete: ["Stay", "Flight", "Car", "Complete"],
  },
  "hotel-car": {
    "hotel-results": ["Select stay"],
    "hotel-details": ["Select stay", "Details"],
    "car-results": ["Stay", "Select car"],
    "car-details": ["Stay", "Select car", "Details"],
    complete: ["Stay", "Car", "Complete"],
  },
  "flight-car": {
    "flight-results": ["Select flight"],
    "flight-details": ["Select flight", "Details"],
    "car-results": ["Flight", "Select car"],
    "car-details": ["Flight", "Select car", "Details"],
    complete: ["Flight", "Car", "Complete"],
  },
};

for (const [mode, scenarios] of Object.entries(expected) as [
  DealsPackageMode,
  (typeof expected)[DealsPackageMode],
][]) {
  for (const [page, wanted] of Object.entries(scenarios) as [
    DealsJourneyStage | "complete",
    string[],
  ][]) {
    test(`${mode} ${page} contains ancestors and the current page only`, () => {
      const progress =
        page === "complete"
          ? getHandoffReadyDealsJourneyProgress({ mode } as never)
          : getGuidedDealsJourneyProgress(page, mode, null);
      const items = getDealsJourneyBreadcrumbs(progress, page, search(mode));

      assert.deepEqual(
        items.map((item) => labels[item.labelKey]),
        wanted,
      );
      assert.equal(items.filter((item) => item.current).length, 1);
      assert.equal(items.at(-1)?.current, true);
      assert.equal(items.at(-1)?.href, undefined);
      assert.equal(
        items.slice(0, -1).every((item) => Boolean(item.href)),
        true,
      );
      assert.equal(
        items.some((item) => item.labelKey.includes("review")),
        false,
      );
      assert.equal(
        items.some((item) => item.labelKey.endsWith("complete")),
        page === "complete",
      );
      for (const item of items) {
        if (!item.href) continue;
        assert.match(
          item.href,
          /^\/deals\/journey\/(hotel|flight|car)-results\?/,
        );
        assert.doesNotMatch(item.href, /^\/(hotels|flights|cars)\//);
      }
    });
  }
}

test("details are a separate, accessible current level after the results link", () => {
  for (const [stage, accessible] of [
    ["hotel-details", "hotelDetailsAccessible"],
    ["flight-details", "flightDetailsAccessible"],
    ["car-details", "carDetailsAccessible"],
  ] as const) {
    const mode = "hotel-flight-car";
    const items = getDealsJourneyBreadcrumbs(
      getGuidedDealsJourneyProgress(stage, mode, null),
      stage,
      search(mode),
    );
    const current = items.at(-1);
    assert.equal(current?.labelKey, "deals.breadcrumb.details");
    assert.equal(current?.accessibleLabelKey, `deals.breadcrumb.${accessible}`);
    assert.equal(current?.href, undefined);
    assert.match(items.at(-2)?.href ?? "", /-results\?/);
  }
});

test("compatibility-only Review never enters the breadcrumb hierarchy", () => {
  const mode = "hotel-flight";
  assert.deepEqual(
    getDealsJourneyBreadcrumbs(
      getGuidedDealsJourneyProgress("review", mode, null),
      "review",
      search(mode),
    ),
    [],
  );
});
