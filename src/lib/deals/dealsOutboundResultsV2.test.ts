import assert from "node:assert/strict";
import test from "node:test";
import type { DealsFlightItineraryV2 } from "./dealsTripPlanV2";
import { filterAndSortDealsOutboundResultsV2 } from "./dealsOutboundResultsV2";

const choice = (
  key: string,
  hour: number,
  stops: number,
  durationMinutes: number,
  price: number,
): DealsFlightItineraryV2 => ({
  itineraryKey: key,
  direction: "outbound",
  originAirport: "LOS",
  destinationAirport: "LHR",
  departureTime: `2027-02-01T${String(hour).padStart(2, "0")}:00:00Z`,
  arrivalTime: `2027-02-01T${String(hour + 2).padStart(2, "0")}:00:00Z`,
  duration: `${durationMinutes / 60}h`,
  durationMinutes,
  stops,
  layovers: [],
  segments: [],
  indicativeFromPrice: price,
  indicativeCurrency: "NGN",
});

const choices = [
  choice("afternoon", 14, 1, 420, 200),
  choice("morning-slow", 8, 0, 600, 100),
  choice("morning-fast", 9, 2, 300, 300),
];

test("filters outbound results by stops and departure period", () => {
  assert.deepEqual(
    filterAndSortDealsOutboundResultsV2(choices, {
      stops: "nonstop",
      departure: "morning",
      sort: "departure",
    }).map((item) => item.itineraryKey),
    ["morning-slow"],
  );
  assert.deepEqual(
    filterAndSortDealsOutboundResultsV2(choices, {
      stops: "two-plus",
      departure: "all",
      sort: "departure",
    }).map((item) => item.itineraryKey),
    ["morning-fast"],
  );
});

test("sorts outbound results deterministically by price and duration", () => {
  assert.deepEqual(
    filterAndSortDealsOutboundResultsV2(choices, {
      stops: "all",
      departure: "all",
      sort: "cheapest",
    }).map((item) => item.itineraryKey),
    ["morning-slow", "afternoon", "morning-fast"],
  );
  assert.deepEqual(
    filterAndSortDealsOutboundResultsV2(choices, {
      stops: "all",
      departure: "all",
      sort: "fastest",
    }).map((item) => item.itineraryKey),
    ["morning-fast", "afternoon", "morning-slow"],
  );
});
