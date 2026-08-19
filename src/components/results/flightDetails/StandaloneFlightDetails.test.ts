import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { PublicFlightResult } from "@/lib/types";
import { fareBenefits, groupFareOffers } from "./flightDetailsPresentation";

const fixture = (overrides: Partial<PublicFlightResult> = {}): PublicFlightResult => ({
  id: "iberia-mad-lis-economy",
  provider: "Duffel",
  airlineName: "Iberia",
  flightNumber: "IB3110",
  originAirport: "MAD",
  destinationAirport: "LIS",
  departureTime: "2026-09-14T08:10:00.000Z",
  arrivalTime: "2026-09-14T09:35:00.000Z",
  duration: "1h 25m",
  durationMinutes: 85,
  stops: 0,
  layovers: [],
  cabinClass: "economy",
  baggageInfo: "1 carry-on included",
  refundInfo: "Changes allowed before departure",
  price: 188,
  currency: "EUR",
  bookingUrl: "https://example.test/iberia",
  partnerRedirectUrl: "https://example.test/iberia",
  valueScore: 80,
  riskScore: 10,
  comfortScore: 70,
  travelConfidenceScore: 80,
  travelEffortScore: 20,
  recommendationReasons: [],
  badges: [],
  ...overrides,
});

test("groups only matching production fare conditions and keeps real provider prices", () => {
  const economySecondProvider = fixture({ id: "tap-economy", provider: "TAP", price: 205 });
  const business = fixture({ id: "iberia-business", cabinClass: "business", baggageInfo: "2 checked bags included", price: 491 });
  const groups = groupFareOffers([business, economySecondProvider, fixture()]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, "Economy");
  assert.equal(groups[0].lowest.price, 188);
  assert.deepEqual(groups[0].offers.map(({ provider }) => provider), ["Duffel", "TAP"]);
  assert.equal(groups[1].label, "Business");
  assert.equal(groups[1].lowest.price, 491);
});

test("optional baggage details fail closed instead of creating benefits", () => {
  assert.deepEqual(fareBenefits(fixture({ baggageInfo: "Rules vary by fare" })), []);
  assert.deepEqual(fareBenefits(fixture({ baggageInfo: "" })), []);
  assert.deepEqual(fareBenefits(fixture()), ["1 carry-on included"]);
});

test("desktop details contract keeps real selection, pricing, navigation, and accessibility wiring", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  for (const contract of [
    'role="radiogroup"',
    'role="radio"',
    'aria-checked={selected}',
    "setSelectedFareKey(fare.key)",
    "setSelectedProviderId(provider.id)",
    "id: selectedOffer.id",
    "Back to results",
    "Edit search",
    "Continue to provider",
    "lg:sticky lg:top-24",
  ]) assert.ok(source.includes(contract), contract);

  for (const forbiddenSample of ["Houston", "Denver", "Frontier", "Super.com", "Dreams", "Kiwi.com", "$269", "$349", "$517"])
    assert.ok(!source.includes(forbiddenSample), forbiddenSample);
});
