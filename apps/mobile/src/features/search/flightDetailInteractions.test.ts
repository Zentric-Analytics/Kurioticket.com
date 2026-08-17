import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import { authoritativeProviderUrl, flightShareMessage } from "./flightDetailInteractions";

const flight = {
  originAirport: "LOS",
  destinationAirport: "ABV",
  airlineName: "Duffel Airways",
  departureTime: "2026-09-10T09:30:00.000Z",
  partnerRedirectUrl: "https://partner.example/private-token",
  bookingUrl: "https://booking.example/secret-id",
} as FlightResult;

test("flight share copy contains useful details without private provider links", () => {
  const message = flightShareMessage(flight, "₦125,000");
  assert.match(message, /LOS → ABV/);
  assert.match(message, /Duffel Airways/);
  assert.match(message, /Departs/);
  assert.match(message, /Fare ₦125,000/);
  assert.doesNotMatch(message, /partner\.example|booking\.example|private-token|secret-id/);
});

test("authoritative provider selection preserves redirect precedence and fallback", () => {
  assert.equal(authoritativeProviderUrl(flight), flight.partnerRedirectUrl);
  assert.equal(authoritativeProviderUrl({ ...flight, partnerRedirectUrl: "" }), flight.bookingUrl);
});
