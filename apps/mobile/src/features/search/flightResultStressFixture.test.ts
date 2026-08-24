import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";

type FixtureOptions = {
  count: 10 | 50 | 100 | 200;
  tripType: "one-way" | "round-trip";
  connection: "nonstop" | "connecting";
  logos: "repeated" | "multiple" | "none";
};

const SVG_LOGOS = ["https://assets.example.test/aa.svg", "https://assets.example.test/bb.svg", "https://assets.example.test/cc.svg"];

/** Deterministic normalized-Duffel-shaped inventory; this module is test-only. */
function buildStressInventory(options: FixtureOptions): FlightResult[] {
  const leg = (index: number, direction: "outbound" | "return") => {
    const outbound = direction === "outbound";
    const originAirport = outbound ? "LOS" : "JFK";
    const destinationAirport = outbound ? "JFK" : "LOS";
    const departureTime = outbound ? "2027-02-10T08:00:00.000Z" : "2027-02-17T18:00:00.000Z";
    return {
      direction,
      originAirport,
      destinationAirport,
      departureTime,
      arrivalTime: outbound ? "2027-02-10T19:00:00.000Z" : "2027-02-18T05:00:00.000Z",
      duration: options.connection === "connecting" ? "13h 40m" : "11h",
      durationMinutes: options.connection === "connecting" ? 820 : 660,
      stops: options.connection === "connecting" ? 1 : 0,
      layovers: options.connection === "connecting" ? [{ airport: "LHR", duration: "2h 40m", quality: "good" as const }] : [],
      segments: Array.from({ length: options.connection === "connecting" ? 2 : 1 }, (_, segmentIndex) => ({
        originAirport: segmentIndex === 0 ? originAirport : "LHR",
        destinationAirport: segmentIndex === 0 && options.connection === "connecting" ? "LHR" : destinationAirport,
        departureTime,
        arrivalTime: outbound ? "2027-02-10T19:00:00.000Z" : "2027-02-18T05:00:00.000Z",
        airlineName: `Fixture Air ${index % 3}`,
        flightNumber: `KT${100 + index}-${segmentIndex}`,
      })),
    };
  };

  return Array.from({ length: options.count }, (_, index) => {
    const logo = options.logos === "none" ? null : options.logos === "repeated" ? SVG_LOGOS[0] : SVG_LOGOS[index % SVG_LOGOS.length];
    const legs = [leg(index, "outbound"), ...(options.tripType === "round-trip" ? [leg(index, "return")] : [])];
    return {
      id: `public-fixture-${index}`,
      provider: "Duffel",
      airlineName: `Fixture Air ${index % 3}`,
      airlineLogo: logo,
      originAirport: "LOS",
      destinationAirport: "JFK",
      departureTime: legs[0].departureTime,
      arrivalTime: legs[0].arrivalTime,
      duration: legs[0].duration,
      durationMinutes: legs.reduce((sum, item) => sum + item.durationMinutes, 0),
      stops: legs[0].stops,
      layovers: legs[0].layovers,
      legs,
      cabinClass: "economy",
      baggageInfo: "1 checked bag included",
      refundInfo: "Changes allowed with fee",
      price: 700 + index,
      currency: "USD",
      bookingUrl: "https://kurioticket.com/flights/details",
      partnerRedirectUrl: "https://kurioticket.com/flights/details",
      valueScore: 90 - index / 10,
      riskScore: 5,
      comfortScore: 80,
      travelConfidenceScore: 90,
      travelEffortScore: 20,
      recommendationReasons: ["Deterministic stress fixture"],
      badges: [],
      searchPolicy: { inventoryKind: "bookable", action: { enabled: true, kind: "internal-detail" } },
    } as FlightResult;
  });
}

test("stress inventory covers bounded result counts and itinerary pressure dimensions", () => {
  for (const count of [10, 50, 100, 200] as const) {
    const inventory = buildStressInventory({ count, tripType: count % 100 ? "one-way" : "round-trip", connection: count === 10 ? "nonstop" : "connecting", logos: count === 10 ? "none" : count === 50 ? "repeated" : "multiple" });
    assert.equal(inventory.length, count);
    assert.ok(inventory.every((result) => result.legs?.length === (count % 100 ? 1 : 2)));
    assert.ok(JSON.stringify(inventory).length > count * 500);
  }
});

test("production list keeps stress inventory behind a conservative virtualized window", () => {
  const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
  assert.match(screen, /<SectionList/);
  assert.match(screen, /initialNumToRender=\{6\}/);
  assert.match(screen, /maxToRenderPerBatch=\{5\}/);
  assert.match(screen, /windowSize=\{7\}/);
  assert.doesNotMatch(screen, /removeClippedSubviews/);
});
