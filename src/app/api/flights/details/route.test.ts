import assert from "node:assert/strict";
import test from "node:test";

import type { NormalizedFlightResult } from "@/lib/types";
import {
  createMemoryFlightCacheBackend,
  rememberFlights,
  setFlightResultCacheBackendForTests,
} from "@/lib/searchCache";
import { GET } from "./route";

const cached = (): NormalizedFlightResult => ({
  id: "details-invalid-context-fixture",
  provider: "Duffel",
  providerOfferId: "off_server_only",
  providerExpiresAt: Date.now() + 60_000,
  airlineName: "Iberia",
  originAirport: "ORD",
  destinationAirport: "LAS",
  departureTime: "2027-02-10T10:00:00Z",
  arrivalTime: "2027-02-10T14:00:00Z",
  duration: "4h",
  durationMinutes: 240,
  stops: 0,
  layovers: [],
  legs: [],
  cabinClass: "economy",
  baggageInfo: "Baggage details not supplied by the provider",
  refundInfo: "Change and refund rules not supplied by the provider",
  price: 205,
  currency: "USD",
  bookingUrl: "",
  partnerRedirectUrl: "",
  valueScore: 1,
  riskScore: 1,
  comfortScore: 1,
  travelConfidenceScore: 1,
  travelEffortScore: 1,
  recommendationReasons: [],
  badges: [],
});

test("flight details requires a Kurioticket result id", async () => {
  const response = await GET(new Request("https://kurioticket.test/api/flights/details"));
  assert.equal(response.status, 400);
});

test("flight details fails closed for an unknown cached identity", async () => {
  const response = await GET(new Request("https://kurioticket.test/api/flights/details?id=unknown"));
  assert.equal(response.status, 404);
});

test("flight details fails closed without server-owned search context", async () => {
  setFlightResultCacheBackendForTests(createMemoryFlightCacheBackend());
  const flight = cached();
  await rememberFlights([flight]);
  const response = await GET(new Request(`https://kurioticket.test/api/flights/details?id=${flight.id}&adults=6&children=0&infants=0&travelers=6`));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    status: "unavailable",
    error: "This flight search context is no longer available. Please search again.",
  });
});

test("Flight Details never treats browser passenger parameters as authority", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("./route.ts", import.meta.url), "utf8"),
  );
  assert.match(source, /await getFlightDetailsCacheContext\(id\)/);
  assert.doesNotMatch(source, /parseFlightDetailsSearch\(searchParams\)/);
});

test("KAYAK Flight Details resolves the selected offer and compatible fares from server cache", async () => {
  setFlightResultCacheBackendForTests(createMemoryFlightCacheBackend());
  const search = { tripType:"one-way" as const, origin:"ORD", destination:"LAS", departureDate:"2027-02-10", adults:1, children:0, infants:0, travelers:1, cabinClass:"economy" as const };
  const outbound = { direction:"outbound" as const, originAirport:"ORD", destinationAirport:"LAS", departureTime:"2027-02-10T10:00:00Z", arrivalTime:"2027-02-10T14:00:00Z", duration:"4h", durationMinutes:240, stops:0, layovers:[], segments:[{originAirport:"ORD",destinationAirport:"LAS",departureTime:"2027-02-10T10:00:00Z",arrivalTime:"2027-02-10T14:00:00Z",airlineName:"KAYAK airline",flightNumber:"KT1"}] };
  const selected = { ...cached(), id:"kayak-sandbox:selected", provider:"KAYAK sandbox", providerOfferId:"selected", legs:[outbound], cabinClass:"Economy", fareBrandName:"Saver supplied", price:120, partnerRedirectUrl:"https://affiliates.kayak.com/sandbox-clickout" };
  const flexible = { ...selected, id:"kayak-sandbox:flex", providerOfferId:"flex", fareBrandName:"Flexible supplied", price:175 };
  await rememberFlights([selected, flexible], Date.now(), search);
  const response = await GET(new Request(`https://kurioticket.test/api/flights/details?id=${selected.id}`));
  assert.equal(response.status, 200);
  const details = await response.json();
  assert.deepEqual(details.fareChoices.map((choice: {label:string;selectedOffer:boolean})=>[choice.label,choice.selectedOffer]), [["Saver supplied",true],["Flexible supplied",false]]);
  assert.doesNotMatch(JSON.stringify(details), /providerOfferId|partnerRedirectUrl|bookingUrl/);
});
