import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDealsSearch, parseDealsSearchParams } from "./dealsSearchParams";
import { buildDealsCarRequestIdentity, buildDealsCarRequestPayload, buildGuidedDealsCarActionHref } from "./dealsCarResults";
import { buildDealsCarDetailsJourneyUrl, getRequiredDealsJourneyStage, normalizeDealsJourneyCarId } from "./dealsJourneyRoutes";

const search = () => {
  const value = createDefaultDealsSearch();
  value.mode = "hotel-flight-car";
  value.carPickupLocation = "  LAX  ";
  value.carReturnLocation = "  SFO  ";
  value.carPickupDate = "2026-10-01";
  value.carPickupTime = "09:30";
  value.carReturnDate = "2026-10-05";
  value.carReturnTime = "18:00";
  value.carDriverAge = "35";
  return value;
};

test("buildCarApiPayload mapping is exact and stable identity contains only car search fields", () => {
  const sameLocation = search();
  sameLocation.carReturnToDifferentLocation = false;
  assert.deepEqual(buildDealsCarRequestPayload(sameLocation), { pickupLocation: "LAX", dropoffLocation: "LAX", pickupDate: "2026-10-01", pickupTime: "09:30", dropoffDate: "2026-10-05", dropoffTime: "18:00", driverAge: "35" });
  const differentLocation = search();
  differentLocation.carReturnToDifferentLocation = true;
  assert.deepEqual(buildDealsCarRequestPayload(differentLocation), { pickupLocation: "LAX", dropoffLocation: "SFO", pickupDate: "2026-10-01", pickupTime: "09:30", dropoffDate: "2026-10-05", dropoffTime: "18:00", driverAge: "35" });
  const identity = buildDealsCarRequestIdentity(differentLocation);
  for (const [key, value] of Object.entries(buildDealsCarRequestPayload(differentLocation))) assert.match(identity, new RegExp(`${key}=${encodeURIComponent(value)}`));
  assert.doesNotMatch(identity, /filter|sort|bookingUrl|price|searchPolicy/);
});

test("Car ID normalization matches shared transient product safety", () => {
  assert.equal(normalizeDealsJourneyCarId(" car:123 "), "car:123");
  for (const value of ["", "   ", "bad\u0000id", "x".repeat(257), ["car"], { id: "car" }, 123, true]) assert.equal(normalizeDealsJourneyCarId(value), null);
});

test("guided Car details URL preserves canonical Deals search and appends exactly one safe carId", () => {
  const value = search();
  const href = buildDealsCarDetailsJourneyUrl(value, " car/id & unit ");
  assert.ok(href);
  const url = new URL(href, "https://example.test");
  assert.equal(url.pathname, "/packages/journey/car-details");
  assert.deepEqual(url.searchParams.getAll("carId"), ["car/id & unit"]);
  assert.equal(parseDealsSearchParams(url.searchParams).carPickupLocation, "LAX");
  assert.equal(buildGuidedDealsCarActionHref(value, " car/id & unit "), href);
  assert.equal(buildDealsCarDetailsJourneyUrl(value, "\u001f"), null);
  value.mode = "hotel-flight";
  assert.equal(buildDealsCarDetailsJourneyUrl(value, "car"), null);
  assert.doesNotMatch(href, /bookingUrl|offer|sourcePrice|displayPrice|sourceCurrency|searchPolicy|filter|sort/i);
});

test("route guard accepts transient Car details only and keeps prerequisites and Review strict", () => {
  const hotel = { id: "h" }, flight = { id: "f" }, car = { id: "c" };
  assert.equal(getRequiredDealsJourneyStage("car-details", "flight-car", { flight } as never, null, null, "car2"), "car-details");
  assert.equal(getRequiredDealsJourneyStage("car-details", "flight-car", { flight, car } as never), "car-details");
  assert.equal(getRequiredDealsJourneyStage("car-details", "flight-car", { flight } as never), "car-results");
  assert.equal(getRequiredDealsJourneyStage("review", "flight-car", { flight } as never, null, null, "car2"), "car-results");
  assert.equal(getRequiredDealsJourneyStage("car-results", "hotel-car", null), "hotel-results");
  assert.equal(getRequiredDealsJourneyStage("car-results", "flight-car", null), "flight-results");
  assert.equal(getRequiredDealsJourneyStage("car-results", "hotel-flight-car", { hotel } as never), "flight-results");
  assert.equal(getRequiredDealsJourneyStage("car-results", "hotel-car", { hotel } as never), "car-results");
  assert.equal(getRequiredDealsJourneyStage("car-results", "flight-car", { flight } as never), "car-results");
  assert.equal(getRequiredDealsJourneyStage("car-results", "hotel-flight-car", { hotel, flight } as never), "car-results");
});
