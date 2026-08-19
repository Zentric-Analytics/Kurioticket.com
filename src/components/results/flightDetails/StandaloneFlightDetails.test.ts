import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { PublicFlightResult } from "@/lib/types";
import {
  fareBenefits,
  getCanonicalProviderFareOffers,
  groupFareOffers,
} from "./flightDetailsPresentation";

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

test("groups only provider-backed fare brands and never synthesizes identity from generic rules", () => {
  const basic = fixture({ fareBrandName: "Basic" });
  const sameBrand = fixture({ id: "iberia-basic-2", fareBrandName: "Basic", price: 205 });
  const unbranded = fixture({ id: "unbranded", price: 491 });
  const groups = groupFareOffers([unbranded, sameBrand, basic]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, "Basic");
  assert.equal(groups[0].lowest.price, 188);
  assert.deepEqual(groups[0].offers.map(({ id }) => id), [basic.id, sameBrand.id]);
  assert.equal(groups[1].label, "Economy fare");
  assert.equal(groups[1].lowest.price, 491);
});

test("optional baggage details fail closed instead of creating benefits", () => {
  assert.deepEqual(fareBenefits(fixture({ baggageInfo: "Rules vary by fare" })), []);
  assert.deepEqual(fareBenefits(fixture({ baggageInfo: "" })), []);
  assert.deepEqual(fareBenefits(fixture()), ["1 carry-on included"]);
});

test("fare families stay with the canonical Results provider", () => {
  const canonical = fixture();
  const canonicalBusiness = fixture({
    id: "duffel-business",
    cabinClass: "business",
    baggageInfo: "2 checked bags included",
    price: 491,
  });
  const unrelatedCheaperProvider = fixture({
    id: "unrelated-cheaper-business",
    provider: "Unrelated Travel",
    cabinClass: "business",
    baggageInfo: "2 checked bags included",
    price: 420,
  });

  const canonicalOffers = getCanonicalProviderFareOffers(
    [unrelatedCheaperProvider, canonicalBusiness, canonical],
    canonical,
  );
  assert.deepEqual(canonicalOffers.map(({ id }) => id), ["duffel-business", canonical.id]);
  const business = groupFareOffers(canonicalOffers).find(({ label }) => label === "Business fare");
  assert.equal(business?.lowest.id, "duffel-business");
  assert.equal(business?.lowest.provider, canonical.provider);
});

test("desktop details contract keeps real selection, pricing, navigation, and accessibility wiring", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  for (const contract of [
    'role="radiogroup"',
    'role="radio"',
    'aria-checked={selected}',
    "setSelectedFareKey(fare.key)",
    'fareGroups.length === 1 ? "max-w-[350px] grid-cols-1"',
    'fareGroups.length === 1 ? "min-h-[160px]"',
    "getCanonicalProviderFareOffers",
    "id: selectedOffer.id",
    "selectedOffer.partnerRedirectUrl || selectedOffer.bookingUrl",
    "Back to results",
    "Edit search",
    "Continue to ${selectedOffer.provider}",
    'itineraryLeg.direction === "outbound" ? "Outbound"',
    'itineraryLeg.direction === "return" ? "Return"',
    "lg:sticky lg:top-24",
  ]) assert.ok(source.includes(contract), contract);

  assert.ok(source.includes(">Pick your fare</h2>"));
  assert.ok(!source.includes("Step 1: Pick your fare"));
  assert.ok(!source.includes("Step 2: Choose where to book"));
  assert.ok(!source.includes("Booking provider"));
  assert.ok(!source.includes("setSelectedProviderId"));
  assert.ok(!source.includes('"Continue to provider"'));
  assert.ok(!source.includes("primaryLeg(flight)"));

  for (const forbiddenSample of ["Houston", "Denver", "Frontier", "Super.com", "Dreams", "Kiwi.com", "$269", "$349", "$517"])
    assert.ok(!source.includes(forbiddenSample), forbiddenSample);
});

test("Flight Results keeps the Kurioticket id and full search query on the standalone details route", async () => {
  const results = await readFile(new URL("../FlightResultsClient.tsx", import.meta.url), "utf8");
  assert.match(results, /`\/flights\/details\/\$\{encodeURIComponent\(flight\.id\)\}`/);
  assert.match(results, /const detailsQuery = params\.toString\(\)/);
  assert.match(results, /detailsQuery \? `\?\$\{detailsQuery\}` : ""/);
});
