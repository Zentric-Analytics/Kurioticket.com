import assert from "node:assert/strict";
import test from "node:test";
import { countHotelNights, dealsPreviewLimit, getFlightLegLabelKey, getHotelPreviewPrice, getOverviewData, normalizeFlightLegs, normalizeMetadata, safeDateTime } from "./dealsResultsPresentation";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";

const search = { ...createDefaultDealsSearch(), flightOriginCode: "LOS", flightDestinationCode: "LAX", flightDepartureDate: "2026-07-27", flightReturnDate: "2026-07-29", hotelDestination: "Los Angeles", hotelCheckIn: "2026-03-07", hotelCheckOut: "2026-03-09", carPickupLocation: "LAX", carReturnToDifferentLocation: true, carReturnLocation: "SFO" };
test("flight overview supports round trip and one way", () => { assert.match(getOverviewData(search, "en-US").flight.dates, /Jul 27.*Jul 29/); assert.doesNotMatch(getOverviewData({ ...search, flightTripType: "one-way" }, "en-US").flight.dates, /Jul 29/); });
test("night count is timezone independent around DST", () => { assert.equal(countHotelNights("2026-02-01", "2026-02-04"), 3); assert.equal(countHotelNights("2026-03-07", "2026-03-09"), 2); assert.equal(countHotelNights("bad", "2026-03-09"), null); });
test("car summary uses effective return location", () => assert.match(getOverviewData(search, "en-US").car.title, /LAX → SFO/));
const flight = { id: "f", provider: "p", airlineName: "Air", originAirport: "LOS", destinationAirport: "LAX", departureTime: "2026-07-27T10:00:00Z", arrivalTime: "2026-07-27T14:00:00Z", duration: "4h", stops: 0, price: 10, currency: "USD", legs: [] } as unknown as PublicFlightResult;
test("flight legs preserve provider directions and use outbound for the fallback", () => {
  assert.equal(normalizeFlightLegs(flight).at(0)?.direction, "outbound");
  const legs = normalizeFlightLegs({ ...flight, legs: [
    { ...flight, direction: "outbound" },
    { ...flight, direction: "return", originAirport: "LAX", destinationAirport: "LOS" },
    { ...flight, direction: "leg", originAirport: "LOS", destinationAirport: "ABV" },
  ] } as unknown as PublicFlightResult);
  assert.deepEqual(legs.map((leg) => leg.direction), ["outbound", "return", "leg"]);
});
test("flight leg labels follow direction rather than position", () => {
  assert.equal(getFlightLegLabelKey("outbound"), "deals.results.outbound");
  assert.equal(getFlightLegLabelKey("return"), "deals.results.return");
  assert.equal(getFlightLegLabelKey("leg"), "flightLeg");
  assert.notEqual(getFlightLegLabelKey("leg"), "deals.results.return");
});
test("provider-local timestamps retain their written date and time", () => {
  assert.deepEqual(safeDateTime("2026-07-12T23:30:00-10:00", "en-US"), { date: "Jul 12", time: "11:30 PM" });
  assert.deepEqual(safeDateTime("2026-07-13T00:30:00+10:00", "en-US"), { date: "Jul 13", time: "12:30 AM" });
  assert.deepEqual(safeDateTime("2026-07-12T09:30:00Z", "en-US"), { date: "Jul 12", time: "9:30 AM" });
  assert.deepEqual(safeDateTime("2026-07-12T23:30:00", "en-US"), { date: "Jul 12", time: "11:30 PM" });
});
test("invalid and empty timestamps return empty presentation values", () => {
  assert.deepEqual(safeDateTime("not-a-date", "en-US"), { date: "", time: "" });
  assert.deepEqual(safeDateTime("", "en-US"), { date: "", time: "" });
  assert.deepEqual(safeDateTime("2026-02-30T12:00:00Z", "en-US"), { date: "", time: "" });
});
test("stops preserve direct, singular, and plural inputs", () => { assert.equal(normalizeFlightLegs({ ...flight, stops: 0 }).at(0)?.stops, 0); assert.equal(normalizeFlightLegs({ ...flight, stops: 1 }).at(0)?.stops, 1); assert.equal(normalizeFlightLegs({ ...flight, stops: 2 }).at(0)?.stops, 2); });
test("hotel price distinguishes bookable and discovery", () => { const hotel = { totalPrice: 200, currency: "USD" } as PublicHotelResult; assert.deepEqual(getHotelPreviewPrice(hotel), { amount: 200, currency: "USD" }); assert.equal(getHotelPreviewPrice({ inventoryKind: "discovery" } as PublicHotelResult), null); });
test("preview contract and metadata normalization", () => { assert.equal(dealsPreviewLimit, 3); assert.deepEqual(normalizeMetadata({ warnings: ["safe", 2], servedFromFallback: "yes", latencyMs: Infinity, warningCategory: "secret" }), { warnings: ["safe"], servedFromFallback: false, latencyMs: undefined, warningCategory: undefined }); assert.deepEqual(normalizeMetadata({ warnings: null }).warnings, []); });
