import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult, MobileSavedItem } from "../api/travelApi";
import { canonicalItemsNewestFirst } from "./savedRepositoryCore";
import { flightSavedSignature, mapFlightToSaved, savedSignature } from "./savedMapping";

const segment = (carrier = "AA", number = "AA101", origin = "LOS", destination = "YYZ", departureTime = "2030-01-01T10:00:00Z", arrivalTime = "2030-01-01T18:00:00Z") => ({
  originAirport: origin, destinationAirport: destination, departureTime, arrivalTime,
  airlineName: carrier === "AA" ? "American Airlines" : carrier === "BA" ? "British Airways" : "Duffel Airways",
  marketingCarrier: { iataCode: carrier, name: carrier }, marketingFlightNumber: number,
  operatingCarrier: { iataCode: carrier, name: carrier }, operatingFlightNumber: number,
});
const result = (carrier = "AA", number = "AA101") => ({
  id: `${carrier}-transient`, provider: "Duffel", airlineName: segment(carrier).airlineName,
  flightNumber: number, originAirport: "LOS", destinationAirport: "YYZ",
  departureTime: "2030-01-01T10:00:00Z", arrivalTime: "2030-01-01T18:00:00Z",
  price: 893210, currency: "NGN", cabinClass: "economy", fareBrandName: "Basic",
  legs: [{ direction: "outbound", legIndex: 0, originAirport: "LOS", destinationAirport: "YYZ", departureTime: "2030-01-01T10:00:00Z", arrivalTime: "2030-01-01T18:00:00Z", segments: [segment(carrier, number)] }],
} as FlightResult);

test("same-time Duffel, American, and British cards have distinct itinerary identities", () => {
  const signatures = [result("ZZ", "ZZ101"), result("AA", "AA101"), result("BA", "BA101")].map(flightSavedSignature);
  assert.equal(new Set(signatures).size, 3);
});

test("marketing flight number participates in identity", () => {
  assert.notEqual(flightSavedSignature(result("AA", "AA101")), flightSavedSignature(result("AA", "AA201")));
});

test("transient result id and refreshed price do not participate in identity", () => {
  const original = result();
  assert.equal(flightSavedSignature(original), flightSavedSignature({ ...original, id: "new-random-id", price: 900000 }));
});

test("the complete return journey participates in identity", () => {
  const original = result();
  const withReturn = (time: string, number: string) => ({ ...original, legs: [...original.legs!, { direction: "return" as const, legIndex: 1, originAirport: "YYZ", destinationAirport: "LOS", departureTime: time, arrivalTime: "2030-01-10T23:00:00Z", duration: "7h", durationMinutes: 420, stops: 0, layovers: [], segments: [segment("AA", number, "YYZ", "LOS", time, "2030-01-10T23:00:00Z")] }] });
  assert.notEqual(flightSavedSignature(withReturn("2030-01-10T16:42:00Z", "AA102")), flightSavedSignature(withReturn("2030-01-10T20:10:00Z", "AA202")));
});

test("ordered connections participate in identity", () => {
  const nonstop = result();
  const connected = { ...nonstop, legs: [{ ...nonstop.legs![0], segments: [segment("BA", "BA74", "LOS", "LHR", "2030-01-01T10:00:00Z", "2030-01-01T14:00:00Z"), segment("BA", "BA93", "LHR", "YYZ", "2030-01-01T15:00:00Z", "2030-01-01T18:00:00Z")] }] };
  assert.notEqual(flightSavedSignature(nonstop), flightSavedSignature(connected));
});

test("provider-supplied fare brand participates in product identity", () => {
  assert.notEqual(flightSavedSignature(result()), flightSavedSignature({ ...result(), fareBrandName: "Flex" }));
});

test("live and server payload identities share one contract", () => {
  const flight = result();
  assert.equal(flightSavedSignature(flight), savedSignature({ ...mapFlightToSaved(flight), id: "saved-1" } as MobileSavedItem));
});

test("legacy records use deterministic airline and flight-number fallback", () => {
  const legacy = { type: "flight", provider: "Duffel", airlineName: "American Airlines", flightNumber: "AA101", originAirport: "LOS", destinationAirport: "YYZ", departureTime: "2030-01-01T10:00:00Z", arrivalTime: "2030-01-01T18:00:00Z" } as unknown as MobileSavedItem;
  assert.equal(savedSignature(legacy), savedSignature({ ...legacy, id: "another-database-id" }));
  assert.notEqual(savedSignature(legacy), savedSignature({ ...legacy, airlineName: "British Airways", flightNumber: "BA101" }));
});

test("canonical Saved items retain different same-time airlines", () => {
  const items = [result("AA", "AA101"), result("BA", "BA101"), result("ZZ", "ZZ101")].map((flight, index) => ({ ...mapFlightToSaved(flight), id: `saved-${index}`, createdAt: `2030-01-0${index + 1}T00:00:00Z` } as MobileSavedItem));
  assert.equal(canonicalItemsNewestFirst(items).length, 3);
});
