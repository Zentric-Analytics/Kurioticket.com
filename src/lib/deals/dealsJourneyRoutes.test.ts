import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDealsSearch, dealsPackageModes, parseDealsSearchParams } from "./dealsSearchParams";
import { buildDealsHotelDetailsJourneyUrl, buildDealsJourneyUrl, buildLegacyDealsResultsUrl, dealsJourneyStages, getEarliestIncompleteDealsJourneyStage, getFirstDealsJourneyStage, getNextDealsJourneyStage, getPreviousDealsJourneyStage, getRequiredDealsJourneyStage, getDealsJourneyStages, isDealsJourneyStage, isStageInDealsMode, normalizeDealsJourneyHotelId, validateDealsJourneyUrl } from "./dealsJourneyRoutes";

const orders = {
  "hotel-flight": ["hotel-results", "hotel-details", "flight-results", "flight-details", "review"],
  "hotel-flight-car": ["hotel-results", "hotel-details", "flight-results", "flight-details", "car-results", "car-details", "review"],
  "hotel-car": ["hotel-results", "hotel-details", "car-results", "car-details", "review"],
  "flight-car": ["flight-results", "flight-details", "car-results", "car-details", "review"],
} as const;

test("validates exact stages and rejects unknown stages", () => { for (const stage of dealsJourneyStages) assert.equal(isDealsJourneyStage(stage), true); for (const value of ["hotel", "Hotel-results", "review/next", "", null]) assert.equal(isDealsJourneyStage(value), false); });
test("orders every package mode and derives its first stage", () => { for (const mode of dealsPackageModes) { assert.deepEqual(getDealsJourneyStages(mode), orders[mode]); assert.equal(getFirstDealsJourneyStage(mode), orders[mode][0]); } assert.equal(isStageInDealsMode("hotel-results", "flight-car"), false); assert.equal(isStageInDealsMode("car-results", "hotel-flight"), false); });
test("derives previous and next stages without leaving mode", () => { assert.equal(getPreviousDealsJourneyStage("hotel-results", "hotel-flight"), null); assert.equal(getNextDealsJourneyStage("hotel-results", "hotel-flight"), "hotel-details"); assert.equal(getPreviousDealsJourneyStage("review", "flight-car"), "car-details"); assert.equal(getNextDealsJourneyStage("review", "flight-car"), null); });
test("builds only internal canonical guided URLs and a clean legacy escape", () => { const search = createDefaultDealsSearch(); search.flightOriginCode = "LOS"; const href = buildDealsJourneyUrl("hotel-results", search); assert.match(href, /^\/deals\/journey\/hotel-results\?/); assert.equal(parseDealsSearchParams(new URL(href, "https://example.test").searchParams).flightOriginCode, "LOS"); assert.equal(validateDealsJourneyUrl(href), href); assert.doesNotMatch(buildLegacyDealsResultsUrl(search), /journey|stage/); for (const unsafe of ["https://evil.test/deals/journey/review", "//evil.test", "/deals/journey/review\\x", "/deals/journey/review#x", "/deals/journey/unknown", "/deals/journey/review?x=%ZZ"]) assert.equal(validateDealsJourneyUrl(unsafe), null); });
test("guards prerequisites and returns the earliest incomplete stage", () => { const hotel = { id: "h" }, flight = { id: "f" }, car = { id: "c" }; assert.equal(getRequiredDealsJourneyStage("hotel-details", "hotel-flight", null), "hotel-results"); assert.equal(getRequiredDealsJourneyStage("flight-results", "flight-car", null), "flight-results"); assert.equal(getRequiredDealsJourneyStage("flight-details", "hotel-flight", { hotel } as never), "flight-results"); assert.equal(getRequiredDealsJourneyStage("car-results", "hotel-flight-car", { hotel } as never), "flight-results"); assert.equal(getRequiredDealsJourneyStage("car-details", "flight-car", { flight } as never), "car-results"); assert.equal(getRequiredDealsJourneyStage("review", "hotel-flight-car", { hotel, flight } as never), "car-results"); assert.equal(getRequiredDealsJourneyStage("review", "hotel-flight-car", { hotel, flight, car } as never), "review"); assert.equal(getEarliestIncompleteDealsJourneyStage("flight-car", null), "flight-results"); assert.equal(getEarliestIncompleteDealsJourneyStage("hotel-car", { hotel } as never), "car-results"); });


test("normalizes only bounded control-free transient Hotel IDs", () => {
  assert.equal(normalizeDealsJourneyHotelId("  provider:A-12  "), "provider:A-12");
  for (const value of [null, "", "   ", "bad\u0000id", "x".repeat(257)]) assert.equal(normalizeDealsJourneyHotelId(value), null);
});

test("Hotel details URL preserves canonical search and safely encodes only a valid Hotel ID", () => {
  const search = createDefaultDealsSearch();
  search.mode = "hotel-flight";
  search.hotelDestination = "São Paulo";
  search.stayDestinationLinked = false;
  const href = buildDealsHotelDetailsJourneyUrl(search, " source/id & room ");
  assert.ok(href);
  const url = new URL(href, "https://example.test");
  assert.equal(url.pathname, "/deals/journey/hotel-details");
  assert.equal(url.searchParams.get("hotelId"), "source/id & room");
  assert.equal(parseDealsSearchParams(url.searchParams).hotelDestination, "São Paulo");
  assert.equal(buildDealsHotelDetailsJourneyUrl(search, "\u001f"), null);
});

test("a transient Hotel ID unlocks Hotel details only", () => {
  const hotel = { id: "confirmed" };
  assert.equal(getRequiredDealsJourneyStage("hotel-details", "hotel-flight", null, "transient"), "hotel-details");
  assert.equal(getRequiredDealsJourneyStage("hotel-details", "hotel-flight", null), "hotel-results");
  assert.equal(getRequiredDealsJourneyStage("hotel-details", "hotel-flight", { hotel } as never), "hotel-details");
  assert.equal(getRequiredDealsJourneyStage("flight-results", "hotel-flight", null, "transient"), "hotel-results");
  assert.equal(getRequiredDealsJourneyStage("hotel-details", "flight-car", null, "transient"), "flight-results");
});
