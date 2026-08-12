import assert from "node:assert/strict";
import test from "node:test";
import type { FlightLeg, NormalizedFlightResult } from "@/lib/types";
import type { DuffelItineraryInventoryGraph } from "./providers/duffelItineraryView";
import { buildFlightItineraryKey } from "./flightOfferInventory";
import {
  getDealsFlightBrandFareChoicesV2,
  getDealsFlightBrandReturnChoicesV2,
  getDealsFlightFareBrandOptionsV2,
} from "./dealsFlightFareBrandInventoryV2";

const leg = (direction: "outbound" | "return", day: string): FlightLeg => ({
  direction,
  originAirport: direction === "outbound" ? "LHR" : "JFK",
  destinationAirport: direction === "outbound" ? "JFK" : "LHR",
  departureTime: `2027-01-${day}T10:00:00Z`,
  arrivalTime: `2027-01-${day}T18:00:00Z`,
  duration: "8h",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  segments: [],
});
const outbound = leg("outbound", "01"),
  returnA = leg("return", "08"),
  returnB = leg("return", "09");
const offer = (
  id: string,
  inbound: FlightLeg,
  price: number,
  currency = "USD",
): NormalizedFlightResult => ({
  id,
  provider: "Duffel",
  providerOfferId: id,
  airlineName: "Safe Air",
  originAirport: "LHR",
  destinationAirport: "JFK",
  departureTime: outbound.departureTime,
  arrivalTime: outbound.arrivalTime,
  duration: "8h",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  legs: [outbound, inbound],
  cabinClass: "economy",
  baggageInfo: "bag",
  refundInfo: "rules",
  price,
  currency,
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
const membership = (providerOfferId: string, owner: string) => ({
  providerOfferId,
  owner: { referenceId: `arl_${owner}`, name: owner },
  amount: "1.00",
  currency: "USD",
});
const graph: DuffelItineraryInventoryGraph = {
  offerRequestId: "orq_server",
  slices: [
    {
      index: 0,
      origin: "LHR",
      destination: "JFK",
      itineraries: [
        {
          itineraryKey: "duffel-itinerary-v1:server",
          segments: [],
          brands: [
            {
              serverBrandIdentity: "server-basic-a",
              fareBrandName: "Basic",
              cabinClass: "economy",
              compatibleSingleTicketOffers: [
                membership("basic-a", "Safe Air"),
                membership("basic-a2", "Safe Air"),
              ],
            },
            {
              serverBrandIdentity: "server-basic-b",
              fareBrandName: "Basic",
              cabinClass: "economy",
              compatibleSingleTicketOffers: [membership("flex-b", "Other Air")],
            },
          ],
        },
      ],
    },
    { index: 1, origin: "JFK", destination: "LHR", itineraries: [] },
  ],
};

test("brand authority is opaque, session/outbound bound, price-safe, and constrains returns and exact fares", () => {
  const offers = [
    offer("basic-a", returnA, 700),
    offer("basic-a2", returnA, 650),
    offer("flex-b", returnB, 600),
  ];
  const outboundKey = buildFlightItineraryKey(outbound);
  const options = getDealsFlightFareBrandOptionsV2(
    offers,
    graph,
    "session-a",
    outboundKey,
  );
  assert.equal(options.length, 2);
  assert.equal(options[0].fareBrandName, options[1].fareBrandName);
  assert.notEqual(options[0].brandOptionKey, options[1].brandOptionKey);
  assert.deepEqual(
    [options[0].indicativeFromPrice, options[0].indicativeCurrency],
    [650, "USD"],
  );
  assert.doesNotMatch(
    JSON.stringify(options),
    /providerOfferId|serverBrandIdentity|arl_|duffel-itinerary|fareBasisCode/,
  );
  const key = options[0].brandOptionKey;
  assert.equal(
    getDealsFlightBrandReturnChoicesV2(
      offers,
      graph,
      "session-b",
      outboundKey,
      key,
    ).length,
    0,
  );
  assert.equal(
    getDealsFlightBrandReturnChoicesV2(
      offers,
      graph,
      "session-a",
      "invented-outbound",
      key,
    ).length,
    0,
  );
  const returns = getDealsFlightBrandReturnChoicesV2(
    offers,
    graph,
    "session-a",
    outboundKey,
    key,
  );
  assert.deepEqual(
    returns.map(({ itineraryKey }) => itineraryKey),
    [buildFlightItineraryKey(returnA)],
  );
  const fares = getDealsFlightBrandFareChoicesV2(
    offers,
    graph,
    "session-a",
    outboundKey,
    key,
    buildFlightItineraryKey(returnA),
  );
  assert.equal(fares.length, 2);
  assert.ok(
    fares.every(({ fareKey }) => fareKey.startsWith("flight-fare-v3:")),
  );
  assert.deepEqual(
    fares.map(({ sourcePrice }) => sourcePrice),
    [700, 650],
  );
});

test("mixed currencies suppress indicative price", () => {
  const offers = [
    offer("basic-a", returnA, 700),
    offer("basic-a2", returnA, 650, "EUR"),
  ];
  const option = getDealsFlightFareBrandOptionsV2(
    offers,
    graph,
    "session",
    buildFlightItineraryKey(outbound),
  )[0];
  assert.equal(option.indicativeFromPrice, undefined);
  assert.equal(option.indicativeCurrency, undefined);
});
