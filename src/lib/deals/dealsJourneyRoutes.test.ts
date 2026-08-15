import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultDealsSearch,
  dealsPackageModes,
  parseDealsSearchParams,
} from "./dealsSearchParams";
import {
  buildDealsHotelDetailsJourneyUrl,
  buildDealsJourneyUrl,
  buildLegacyDealsResultsUrl,
  dealsJourneyStages,
  getEarliestIncompleteDealsJourneyStage,
  getFirstDealsJourneyStage,
  getNextDealsJourneyStage,
  getPreviousDealsJourneyStage,
  getRequiredDealsJourneyStage,
  getDealsJourneyStages,
  isDealsJourneyStage,
  isStageInDealsMode,
  normalizeDealsJourneyHotelId,
  validateDealsJourneyUrl,
} from "./dealsJourneyRoutes";

const orders = {
  "hotel-flight": ["hotel-results", "hotel-details", "flight-results"],
  "hotel-flight-car": [
    "hotel-results",
    "hotel-details",
    "flight-results",
    "car-results",
  ],
  "hotel-car": ["hotel-results", "hotel-details", "car-results"],
  "flight-car": ["flight-results", "car-results"],
} as const;

test("validates exact stages and rejects unknown stages", () => {
  for (const stage of dealsJourneyStages)
    assert.equal(isDealsJourneyStage(stage), true);
  for (const value of ["hotel", "Hotel-results", "review/next", "", null])
    assert.equal(isDealsJourneyStage(value), false);
});
test("orders every package mode and derives its first stage", () => {
  for (const mode of dealsPackageModes) {
    assert.deepEqual(getDealsJourneyStages(mode), orders[mode]);
    assert.equal(getFirstDealsJourneyStage(mode), orders[mode][0]);
  }
  assert.equal(isStageInDealsMode("hotel-results", "flight-car"), false);
  assert.equal(isStageInDealsMode("car-results", "hotel-flight"), false);
});
test("derives previous and next stages without leaving mode", () => {
  assert.equal(
    getPreviousDealsJourneyStage("hotel-results", "hotel-flight"),
    null,
  );
  assert.equal(
    getNextDealsJourneyStage("hotel-results", "hotel-flight"),
    "hotel-details",
  );
  assert.equal(getPreviousDealsJourneyStage("car-details", "flight-car"), null);
  assert.equal(getNextDealsJourneyStage("car-results", "flight-car"), null);
});
test("builds only internal canonical guided URLs and a clean legacy escape", () => {
  const search = createDefaultDealsSearch();
  search.flightOriginCode = "LOS";
  const href = buildDealsJourneyUrl("hotel-results", search);
  assert.match(href, /^\/packages\/journey\/hotel-results\?/);
  assert.equal(
    parseDealsSearchParams(new URL(href, "https://example.test").searchParams)
      .flightOriginCode,
    "LOS",
  );
  assert.equal(validateDealsJourneyUrl(href), href);
  assert.doesNotMatch(buildLegacyDealsResultsUrl(search), /journey|stage/);
  for (const unsafe of [
    "https://evil.test/packages/journey/review",
    "//evil.test",
    "/packages/journey/review\\x",
    "/packages/journey/review#x",
    "/packages/journey/unknown",
    "/packages/journey/review?x=%ZZ",
  ])
    assert.equal(validateDealsJourneyUrl(unsafe), null);
});
test("guards prerequisites and returns the earliest incomplete stage", () => {
  const hotel = { id: "h" },
    flight = { id: "f" },
    car = { id: "c" };
  assert.equal(
    getRequiredDealsJourneyStage("hotel-details", "hotel-flight", null),
    "hotel-results",
  );
  assert.equal(
    getRequiredDealsJourneyStage("flight-results", "flight-car", null),
    "flight-results",
  );
  assert.equal(
    getRequiredDealsJourneyStage("flight-details", "hotel-flight", {
      hotel,
    } as never),
    "flight-results",
  );
  assert.equal(
    getRequiredDealsJourneyStage("car-results", "hotel-flight-car", {
      hotel,
    } as never),
    "flight-results",
  );
  assert.equal(
    getRequiredDealsJourneyStage("car-details", "flight-car", {
      flight,
    } as never),
    "car-results",
  );
  assert.equal(
    getRequiredDealsJourneyStage("review", "hotel-flight-car", {
      hotel,
      flight,
    } as never),
    "car-results",
  );
  assert.equal(
    getRequiredDealsJourneyStage("review", "hotel-flight-car", {
      hotel,
      flight,
      car,
    } as never),
    "review",
  );
  assert.equal(
    getEarliestIncompleteDealsJourneyStage("flight-car", null),
    "flight-results",
  );
  assert.equal(
    getEarliestIncompleteDealsJourneyStage("hotel-car", { hotel } as never),
    "car-results",
  );
});

test("normalizes only bounded control-free transient Hotel IDs", () => {
  assert.equal(
    normalizeDealsJourneyHotelId("  provider:A-12  "),
    "provider:A-12",
  );
  for (const value of [null, "", "   ", "bad\u0000id", "x".repeat(257)])
    assert.equal(normalizeDealsJourneyHotelId(value), null);
});

test("Hotel details URL preserves canonical search and safely encodes only a valid Hotel ID", () => {
  const search = createDefaultDealsSearch();
  search.mode = "hotel-flight";
  search.hotelDestination = "São Paulo";
  search.stayDestinationLinked = false;
  const href = buildDealsHotelDetailsJourneyUrl(search, " source/id & room ");
  assert.ok(href);
  const url = new URL(href, "https://example.test");
  assert.equal(url.pathname, "/packages/journey/hotel-details");
  assert.equal(url.searchParams.get("hotelId"), "source/id & room");
  assert.equal(
    parseDealsSearchParams(url.searchParams).hotelDestination,
    "São Paulo",
  );
  assert.equal(buildDealsHotelDetailsJourneyUrl(search, "\u001f"), null);
});

test("a transient Hotel ID unlocks Hotel details only", () => {
  const hotel = { id: "confirmed" };
  assert.equal(
    getRequiredDealsJourneyStage(
      "hotel-details",
      "hotel-flight",
      null,
      "transient",
    ),
    "hotel-details",
  );
  assert.equal(
    getRequiredDealsJourneyStage("hotel-details", "hotel-flight", null),
    "hotel-results",
  );
  assert.equal(
    getRequiredDealsJourneyStage("hotel-details", "hotel-flight", {
      hotel,
    } as never),
    "hotel-details",
  );
  assert.equal(
    getRequiredDealsJourneyStage(
      "flight-results",
      "hotel-flight",
      null,
      "transient",
    ),
    "hotel-results",
  );
  assert.equal(
    getRequiredDealsJourneyStage(
      "hotel-details",
      "flight-car",
      null,
      "transient",
    ),
    "flight-results",
  );
});

test("expiry-aware correction chooses earliest included expired product, including Review recovery", async () => {
  const { getRequiredDealsJourneyStageAt } =
    await import("./dealsJourneyRoutes");
  const { createDealsTripPlan, DEALS_TRIP_PLAN_TTL_MS } =
    await import("./dealsTripPlan");
  const base = createDealsTripPlan(
    {
      mode: "hotel-flight-car",
      searchFingerprint: "x",
      resultsPath: "/packages/results",
    },
    0,
  );
  const plan = {
    ...base,
    expiresAt: DEALS_TRIP_PLAN_TTL_MS * 2,
    hotel: {
      id: "h",
      provider: "p",
      name: "h",
      location: "l",
      checkIn: "i",
      checkOut: "o",
      sourcePrice: 1,
      sourceCurrency: "USD",
      resultReceivedAt: 1,
    },
    flight: {
      id: "f",
      provider: "p",
      airline: "a",
      origin: "o",
      destination: "d",
      departure: "d",
      arrival: "a",
      duration: "1h",
      sourcePrice: 1,
      sourceCurrency: "USD",
      resultReceivedAt: 2,
    },
    car: {
      id: "c",
      provider: "p",
      rentalCompany: "r",
      modelName: "m",
      categoryLabel: "c",
      pickupLocation: "p",
      returnLocation: "r",
      pickupDate: "d",
      pickupTime: "t",
      dropoffDate: "d",
      dropoffTime: "t",
      sourcePrice: 1,
      sourceCurrency: "USD",
      resultReceivedAt: 3,
      detailsPath:
        "/cars/details/c?pickupLocation=p&dropoffLocation=r&pickupDate=d&pickupTime=t&dropoffDate=d&dropoffTime=t&driverAge=30",
    },
  };
  const ids = { hotelId: null, carId: null };
  assert.equal(
    getRequiredDealsJourneyStageAt(
      "car-results",
      plan.mode,
      plan,
      ids,
      DEALS_TRIP_PLAN_TTL_MS + 4,
    ),
    "hotel-results",
  );
  assert.equal(
    getRequiredDealsJourneyStageAt(
      "review",
      plan.mode,
      plan,
      ids,
      DEALS_TRIP_PLAN_TTL_MS + 4,
    ),
    "hotel-results",
  );
  assert.equal(
    getRequiredDealsJourneyStageAt(
      "flight-results",
      "flight-car",
      { ...plan, mode: "flight-car" },
      ids,
      DEALS_TRIP_PLAN_TTL_MS + 2,
    ),
    "flight-results",
  );
});

test("plan expiry wins before the Review product-expiry exception in every mode", async () => {
  const { getRequiredDealsJourneyStageAt, getFirstDealsJourneyStage } =
    await import("./dealsJourneyRoutes");
  const { createDealsTripPlan } = await import("./dealsTripPlan");
  const ids = { hotelId: null, carId: null };
  for (const mode of [
    "hotel-flight",
    "hotel-car",
    "flight-car",
    "hotel-flight-car",
  ] as const) {
    const base = createDealsTripPlan(
      { mode, searchFingerprint: "x", resultsPath: "/packages/results" },
      0,
    );
    const hotel = {
      id: "h",
      provider: "p",
      name: "h",
      location: "l",
      checkIn: "i",
      checkOut: "o",
      sourcePrice: 1,
      sourceCurrency: "USD",
      resultReceivedAt: 1,
    };
    const flight = {
      id: "f",
      provider: "p",
      airline: "a",
      origin: "o",
      destination: "d",
      departure: "d",
      arrival: "a",
      duration: "1h",
      sourcePrice: 1,
      sourceCurrency: "USD",
      resultReceivedAt: 1,
    };
    const car = {
      id: "c",
      provider: "p",
      rentalCompany: "r",
      modelName: "m",
      categoryLabel: "c",
      pickupLocation: "p",
      returnLocation: "r",
      pickupDate: "d",
      pickupTime: "t",
      dropoffDate: "d",
      dropoffTime: "t",
      sourcePrice: 1,
      sourceCurrency: "USD",
      resultReceivedAt: 1,
      detailsPath:
        "/cars/details/c?pickupLocation=p&dropoffLocation=r&pickupDate=d&pickupTime=t&dropoffDate=d&dropoffTime=t&driverAge=30",
    };
    const plan = {
      ...base,
      ...(mode !== "flight-car" ? { hotel } : {}),
      ...(mode !== "hotel-car" ? { flight } : {}),
      ...(mode !== "hotel-flight" ? { car } : {}),
    };
    assert.equal(
      getRequiredDealsJourneyStageAt("review", mode, plan, ids, plan.expiresAt),
      getFirstDealsJourneyStage(mode),
    );
  }
});
