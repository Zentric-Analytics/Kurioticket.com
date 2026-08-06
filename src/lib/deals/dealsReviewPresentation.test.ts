import assert from "node:assert/strict";
import test from "node:test";
import { DEALS_TRIP_PLAN_TTL_MS, getDealsTripPlanEstimatedTotal, type DealsTripPlan } from "./dealsTripPlan";
import { buildGuidedDealsHandoffPendingUrl, getDealsReviewChangeHref, getDealsReviewItems, getDealsReviewStatus, getDealsReviewTotalPlan } from "./dealsReviewPresentation";
import { createDefaultDealsSearch, type DealsSearch } from "./dealsSearchParams";

const now = 1_000_000;
const search: DealsSearch = { ...createDefaultDealsSearch(), mode: "hotel-flight-car", flightOriginCode: "LOS", flightDestinationCode: "LAX", hotelDestination: "Los Angeles", carPickupLocation: "LAX" };
const plan: DealsTripPlan = { version: 1, mode: "hotel-flight-car", searchFingerprint: "fp", resultsPath: "/deals/results", createdAt: 0, updatedAt: now, expiresAt: now + 99_999, opened: {}, hotel: { id: "h1", provider: "Hotel Provider", name: "Truth Hotel", location: "Los Angeles", checkIn: "2026-08-01", checkOut: "2026-08-03", roomType: "DELUXE KING", sourcePrice: 300, sourceCurrency: "USD", resultReceivedAt: now }, flight: { id: "f1", provider: "Flight Provider", airline: "Kuri Air", flightNumber: "KT123", origin: "LOS", destination: "LAX", departure: "2026-08-01T09:30", arrival: "2026-08-01T11:00", duration: "1h 30m", sourcePrice: 200, sourceCurrency: "EUR", resultReceivedAt: now }, car: { id: "c1", provider: "Car Provider", rentalCompany: "Avis", modelName: "Corolla", categoryLabel: "COMPACT", pickupLocation: "LAX", returnLocation: "LAX", pickupDate: "2026-08-03", pickupTime: "09:30", dropoffDate: "2026-08-05", dropoffTime: "09:30", sourcePrice: 100, sourceCurrency: "USD", resultReceivedAt: now, detailsPath: "/cars/details/c1?pickupLocation=LAX&dropoffLocation=LAX&pickupDate=2026-08-03&pickupTime=09%3A30&dropoffDate=2026-08-05&dropoffTime=09%3A30&driverAge=30" } };

test("maps review products in canonical included order and omits excluded products", () => {
  assert.deepEqual(getDealsReviewItems({ ...plan, mode: "hotel-flight", car: undefined }, { ...search, mode: "hotel-flight" }, now, "en-US").map(i => i.product), ["hotel", "flight"]);
  assert.deepEqual(getDealsReviewItems({ ...plan, mode: "hotel-car", flight: undefined }, { ...search, mode: "hotel-car" }, now, "en-US").map(i => i.product), ["hotel", "car"]);
  assert.deepEqual(getDealsReviewItems({ ...plan, mode: "flight-car", hotel: undefined }, { ...search, mode: "flight-car" }, now, "en-US").map(i => i.product), ["flight", "car"]);
  assert.deepEqual(getDealsReviewItems(plan, search, now, "en-US").map(i => i.product), ["hotel", "flight", "car"]);
});

test("preserves stored product facts, prices, currencies, durations, and providers", () => {
  const items = getDealsReviewItems(plan, search, now, "en-US");
  const hotel = items[0], flight = items[1], car = items[2];
  assert.equal(hotel.title, "Truth Hotel"); assert.equal(hotel.subtitle, "Los Angeles"); assert.equal(hotel.provider, "Hotel Provider"); assert.equal(hotel.sourcePrice, 300); assert.equal(hotel.sourceCurrency, "USD"); assert.equal(hotel.details.some(d => d.value === "2"), true); assert.equal(hotel.details.some(d => d.value === "Deluxe King"), true);
  assert.equal(flight.title, "Kuri Air"); assert.equal(flight.provider, "Flight Provider"); assert.equal(flight.subtitle, "LOS → LAX"); assert.equal(flight.details.some(d => d.value === "KT123"), true); assert.equal(flight.details.some(d => d.value === "1h 30m"), true);
  assert.equal(car.title, "Avis"); assert.match(car.subtitle, /Corolla/); assert.equal(car.provider, "Car Provider"); assert.equal(car.details.some(d => d.value === "2"), true);
});

test("computes completeness, freshness, change URLs, and handoff URL safely", () => {
  assert.equal(getDealsReviewStatus(plan, now).canContinue, true);
  assert.equal(getDealsReviewStatus({ ...plan, flight: { ...plan.flight!, resultReceivedAt: now - DEALS_TRIP_PLAN_TTL_MS } }, now).canContinue, false);
  assert.deepEqual(getDealsReviewStatus({ ...plan, car: undefined }, now).missing, ["car"]);
  assert.match(getDealsReviewChangeHref("hotel", search), /^\/deals\/journey\/hotel-results\?/); assert.doesNotMatch(getDealsReviewChangeHref("hotel", search), /hotelId=/);
  assert.match(getDealsReviewChangeHref("flight", search), /^\/deals\/journey\/flight-results\?/); assert.doesNotMatch(getDealsReviewChangeHref("flight", search), /flightId=/);
  assert.match(getDealsReviewChangeHref("car", search), /^\/deals\/journey\/car-results\?/); assert.doesNotMatch(getDealsReviewChangeHref("car", search), /carId=/);
  const href = buildGuidedDealsHandoffPendingUrl(search); assert.equal((href.match(/journey=guided/g) ?? []).length, 1); assert.doesNotMatch(href, /hotelId=|flightId=|carId=|redirect|bookingUrl/);
});


test("filters totals and freshness to the current package without mutating the plan", () => {
  for (const [mode, products] of [["hotel-flight", ["hotel", "flight"]], ["hotel-car", ["hotel", "car"]], ["flight-car", ["flight", "car"]], ["hotel-flight-car", ["hotel", "flight", "car"]]] as const) {
    const modePlan = { ...plan, mode };
    const snapshot = JSON.stringify(modePlan);
    assert.deepEqual(Object.keys(getDealsReviewTotalPlan(modePlan)), products);
    assert.deepEqual(getDealsReviewItems(modePlan, { ...search, mode }, now, "en-US").map(item => item.product), products);
    assert.equal(JSON.stringify(modePlan), snapshot);
  }
  const staleExtraCar = { ...plan, mode: "hotel-flight" as const, car: { ...plan.car!, resultReceivedAt: now - DEALS_TRIP_PLAN_TTL_MS } };
  assert.equal(getDealsReviewStatus(staleExtraCar, now).canContinue, true);
  assert.notEqual(getDealsTripPlanEstimatedTotal(getDealsReviewTotalPlan(staleExtraCar), "USD", { EUR: 1.1, USD: 1 }), null);
  const staleIncluded = { ...plan, flight: { ...plan.flight!, resultReceivedAt: now - DEALS_TRIP_PLAN_TTL_MS } };
  assert.equal(getDealsReviewStatus(staleIncluded, now).canContinue, false);
  const missingIncluded = { ...plan, flight: undefined };
  assert.equal(getDealsReviewStatus(missingIncluded, now).complete, false);
  assert.equal(getDealsReviewStatus(missingIncluded, now).canContinue, false);
});

test("conversion availability never changes continuation eligibility", () => {
  const included = { ...plan, mode: "hotel-flight" as const };
  const available = getDealsTripPlanEstimatedTotal(getDealsReviewTotalPlan(included), "GBP", { USD: 1, EUR: 1.1, GBP: 0.8 });
  assert.notEqual(available, null);
  assert.equal(getDealsReviewStatus(included, now).canContinue, true);
  assert.equal(getDealsTripPlanEstimatedTotal(getDealsReviewTotalPlan(included), "GBP", {}), null);
  assert.equal(getDealsReviewStatus(included, now).canContinue, true);
  const excludedRateMissing = { ...plan, mode: "hotel-flight" as const, car: { ...plan.car!, sourceCurrency: "XYZ" } };
  assert.notEqual(getDealsTripPlanEstimatedTotal(getDealsReviewTotalPlan(excludedRateMissing), "USD", { USD: 1, EUR: 1.1 }), null);
  const includedRateMissing = { ...included, flight: { ...plan.flight!, sourceCurrency: "XYZ" } };
  assert.equal(getDealsTripPlanEstimatedTotal(getDealsReviewTotalPlan(includedRateMissing), "USD", { USD: 1 }), null);
});
