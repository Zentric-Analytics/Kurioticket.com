import assert from "node:assert/strict";
import test from "node:test";
import {
  getGuidedDealsJourneyProgress,
  getHandoffReadyDealsJourneyProgress,
} from "./dealsJourneyProgress";
import { getDealsJourneyBreadcrumbs } from "./dealsJourneyBreadcrumbs";
import {
  buildDealsModifyUrl,
  createDefaultDealsSearch,
  type DealsPackageMode,
  type DealsSearch,
} from "./dealsSearchParams";
import {
  buildDealsJourneyUrl,
  type DealsJourneyStage,
} from "./dealsJourneyRoutes";

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
        [
          "deals:ancestor",
          ...wanted,
          `complete:${page === "complete" ? "current" : "upcoming"}`,
        ],
      );
      assert.deepEqual(items[0], {
        id: "deals",
        status: "ancestor",
        labelKey: "deals",
        href: buildDealsModifyUrl(search(mode)),
      });
      assert.equal(items.at(-1)?.id, "complete");
      assert.equal(
        items.some((item) => item.id === ("review" as never)),
        false,
      );
      for (const item of items) {
        if (item.id === "deals") continue;
        const isCurrentDetails =
          item.status === "current" && page === `${item.id}-details`;
        assert.equal(
          Boolean(item.href),
          item.status === "completed" || isCurrentDetails,
        );
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
    assert.equal(
      current?.href,
      buildDealsJourneyUrl(`${current?.id}-results`, search(mode)),
    );
  }
});

test("Deals root preserves the canonical current search", () => {
  const currentSearch: DealsSearch = {
    ...createDefaultDealsSearch(),
    mode: "hotel-flight-car",
    flightOriginText: "Lagos",
    flightOriginCode: "LOS",
    flightDestinationText: "Paris",
    flightDestinationCode: "CDG",
    sharedDestination: "Paris",
    sharedTravelStartDate: "2026-09-14",
    sharedTravelEndDate: "2026-09-22",
    flightDepartureDate: "2026-09-14",
    flightReturnDate: "2026-09-22",
    flightAdults: 2,
    flightChildren: 1,
    flightCabinClass: "business",
    hotelDestination: "Versailles",
    hotelCheckIn: "2026-09-15",
    hotelCheckOut: "2026-09-21",
    hotelRooms: 2,
    carPickupLocation: "CDG Airport",
    carReturnToDifferentLocation: true,
    carReturnLocation: "ORY Airport",
    carPickupDate: "2026-09-16",
    carReturnDate: "2026-09-20",
    stayDestinationLinked: false,
    stayDatesLinked: false,
    carPickupLinked: false,
    carDatesLinked: false,
  };
  const progress = getGuidedDealsJourneyProgress(
    "car-details",
    currentSearch.mode,
    { hotel: {}, flight: {}, car: null } as never,
  );
  const root = getDealsJourneyBreadcrumbs(
    progress,
    "car-details",
    currentSearch,
  )[0];

  assert.equal(root.href, buildDealsModifyUrl(currentSearch));
  assert.match(root.href ?? "", /^\/deals\?/);
  const params = new URL(root.href ?? "", "https://example.test").searchParams;
  for (const [key, value] of [
    ["mode", "hotel-flight-car"],
    ["flightOriginCode", "LOS"],
    ["flightDestinationCode", "CDG"],
    ["sharedTravelStartDate", "2026-09-14"],
    ["sharedTravelEndDate", "2026-09-22"],
    ["flightCabinClass", "business"],
    ["hotelRooms", "2"],
    ["stayDestinationLinked", "false"],
    ["carReturnToDifferentLocation", "true"],
  ]) {
    assert.equal(params.get(key), value);
  }
});

test("current results and future products cannot skip forward", () => {
  const mode = "hotel-flight-car";
  const progress = getGuidedDealsJourneyProgress("flight-results", mode, {
    hotel: {},
    flight: null,
    car: null,
  } as never);
  const items = getDealsJourneyBreadcrumbs(
    progress,
    "flight-results",
    search(mode),
  );
  assert.equal(
    items.find((item) => item.id === "hotel")?.href,
    buildDealsJourneyUrl("hotel-results", search(mode)),
  );
  assert.equal(items.find((item) => item.id === "flight")?.href, undefined);
  assert.equal(items.find((item) => item.id === "car")?.href, undefined);
  assert.equal(items.find((item) => item.id === "complete")?.href, undefined);
});
