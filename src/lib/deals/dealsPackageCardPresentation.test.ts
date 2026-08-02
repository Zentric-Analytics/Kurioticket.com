import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import type { DealsPackageCandidate } from "./dealsPackageCandidates";
import { getDealsPackageCardPresentation } from "./dealsPackageCardPresentation";

const candidate = {
  id: "package:test",
  mode: "hotel-flight",
  strategy: "recommended",
  bookingFlow: "separate-providers",
  badgeKey: "deals.results.package.recommended.badge",
  reasonKey: "unused",
  anchor: "hotel",
  displayCurrency: "NGN",
  estimatedTotal: 100,
  providerCount: 2,
  priceBreakdown: [],
  flight: {
    id: "flight-1", provider: "Duffel", airlineName: "Air Test", flightNumber: "AT1",
    originAirport: "LOS", destinationAirport: "SNA", departureTime: "2026-08-01T10:00:00Z",
    arrivalTime: "2026-08-01T18:00:00Z", duration: "8h", stops: 1, layovers: [],
    price: 100, currency: "USD", cabinClass: "ECONOMY", baggageInfo: "1 bag",
    legs: [
      { direction: "outbound", originAirport: "LOS", destinationAirport: "SNA", departureTime: "2026-08-01T10:00:00Z", arrivalTime: "2026-08-01T18:00:00Z", duration: "8h", stops: 1, layovers: [], segments: [{}, {}] },
      { direction: "return", originAirport: "LAX", destinationAirport: "LOS", departureTime: "2026-08-03T20:00:00Z", arrivalTime: "2026-08-05T08:00:00Z", duration: "12h", stops: 0, layovers: [], segments: [{}] },
    ],
    searchPolicy: { action: { href: "/flights/details/flight-1" } },
  },
  hotel: {
    name: "Test Hotel", imageUrls: [], classificationStars: 4, reviewScore: 8.6,
    reviewScale: 10, reviewCount: 20, location: "Orange County", neighbourhood: "",
    roomType: "DELUXE KING ROOM", cancellationInfo: "Free cancellation", amenities: ["Wi-Fi"],
    searchPolicy: { action: { href: "/hotels/details/hotel-1" } },
  },
} as unknown as DealsPackageCandidate;

const search = {
  ...createDefaultDealsSearch(),
  flightDestinationCode: "LAX",
  flightDestinationText: "Los Angeles (LAX)",
  flightDepartureDate: "2026-08-01",
  flightReturnDate: "2026-08-03",
  hotelCheckIn: "2026-08-01",
  hotelCheckOut: "2026-08-03",
};

test("uses the actual itinerary destination and complete arrival range", () => {
  const candidateBefore = structuredClone(candidate);
  const searchBefore = structuredClone(search);
  const view = getDealsPackageCardPresentation(candidate, search, "en-US");
  assert.equal("title" in view.header, false);
  assert.doesNotMatch(JSON.stringify(view.header), /Trip to|Complete trip/);
  assert.match(view.header.dateRangeLabel, /Aug 1, 2026.*Aug 5, 2026/);
  assert.deepEqual(view.routeNotice, { label: "Your selected destination is LAX; this flight arrives at SNA." });
  assert.deepEqual(candidate, candidateBefore);
  assert.deepEqual(search, searchBefore);
});

test("normalizes provider room and cabin labels and omits segment counts", () => {
  const view = getDealsPackageCardPresentation(candidate, search, "en-US");
  assert.equal(view.hotel?.roomLabel, "Deluxe King Room");
  assert.match(view.flight?.cabinAndBaggageLabel ?? "", /^Economy/);
  assert.equal("segments" in (view.flight?.legs[0] ?? {}), false);
  assert.match(view.flight?.legs[1].scheduleLabel ?? "", /Aug 5, 2026/);
});
