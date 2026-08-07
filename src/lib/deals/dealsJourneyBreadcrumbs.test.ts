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
  }) as DealsSearch;

const expected: Record<
  DealsPackageMode,
  Partial<Record<DealsJourneyStage | "complete", string[]>>
> = {
  "hotel-flight": {
    "hotel-results": ["selectStay:current", "selectFlight:upcoming"],
    "hotel-details": ["details:current", "selectFlight:upcoming"],
    "flight-results": ["stay:completed", "selectFlight:current"],
    "flight-details": ["stay:completed", "details:current"],
    complete: ["stay:completed", "flight:completed"],
  },
  "hotel-flight-car": {
    "hotel-results": [
      "selectStay:current",
      "selectFlight:upcoming",
      "selectCar:upcoming",
    ],
    "hotel-details": [
      "details:current",
      "selectFlight:upcoming",
      "selectCar:upcoming",
    ],
    "flight-results": [
      "stay:completed",
      "selectFlight:current",
      "selectCar:upcoming",
    ],
    "flight-details": [
      "stay:completed",
      "details:current",
      "selectCar:upcoming",
    ],
    "car-results": ["stay:completed", "flight:completed", "selectCar:current"],
    "car-details": ["stay:completed", "flight:completed", "details:current"],
    complete: ["stay:completed", "flight:completed", "car:completed"],
  },
  "hotel-car": {
    "hotel-results": ["selectStay:current", "selectCar:upcoming"],
    "hotel-details": ["details:current", "selectCar:upcoming"],
    "car-results": ["stay:completed", "selectCar:current"],
    "car-details": ["stay:completed", "details:current"],
    complete: ["stay:completed", "car:completed"],
  },
  "flight-car": {
    "flight-results": ["selectFlight:current", "selectCar:upcoming"],
    "flight-details": ["details:current", "selectCar:upcoming"],
    "car-results": ["flight:completed", "selectCar:current"],
    "car-details": ["flight:completed", "details:current"],
    complete: ["flight:completed", "car:completed"],
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
    test(`${mode} ${page} has page-aware breadcrumbs`, () => {
      const plan = {
        hotel: wanted.some((value) => value === "stay:completed") ? {} : null,
        flight: wanted.some((value) => value === "flight:completed")
          ? {}
          : null,
        car: wanted.some((value) => value === "car:completed") ? {} : null,
      };
      const progress =
        page === "complete"
          ? getHandoffReadyDealsJourneyProgress({ mode, ...plan } as never)
          : getGuidedDealsJourneyProgress(page, mode, plan as never);
      const items = getDealsJourneyBreadcrumbs(progress, page, search(mode));
      assert.deepEqual(
        items.map(
          ({ labelKey, status }) =>
            `${labelKey.replace("deals.breadcrumb.", "")}:${status}`,
        ),
        [...wanted, `complete:${page === "complete" ? "current" : "upcoming"}`],
      );
      assert.equal(items.at(-1)?.id, "complete");
      assert.equal(
        items.some((item) => item.id === ("review" as never)),
        false,
      );
      for (const item of items) {
        assert.equal(Boolean(item.href), item.status === "completed");
        if (item.href) {
          assert.match(
            item.href,
            /^\/deals\/journey\/(hotel|flight|car)-results\?/,
          );
          assert.doesNotMatch(item.href, /^\/(hotels|flights|cars)\//);
        }
      }
    });
  }
}

test("details labels retain accessible product context", () => {
  for (const [stage, accessible] of [
    ["hotel-details", "hotelDetailsAccessible"],
    ["flight-details", "flightDetailsAccessible"],
    ["car-details", "carDetailsAccessible"],
  ] as const) {
    const mode = "hotel-flight-car";
    const progress = getGuidedDealsJourneyProgress(stage, mode, null);
    const current = getDealsJourneyBreadcrumbs(
      progress,
      stage,
      search(mode),
    ).find((item) => item.status === "current");
    assert.equal(current?.labelKey, "deals.breadcrumb.details");
    assert.equal(current?.accessibleLabelKey, `deals.breadcrumb.${accessible}`);
  }
});
