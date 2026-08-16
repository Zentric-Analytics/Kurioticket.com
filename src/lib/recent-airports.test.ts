import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveRecentAirports,
  type RecentFlightParams,
  type RecentSearchEntry,
} from "@/lib/recent-searches";

const flight = (
  id: string,
  createdAt: string,
  origin: string,
  destination: string,
): RecentSearchEntry => ({
  id,
  type: "flight",
  createdAt,
  label: `${origin} to ${destination}`,
  subtitle: "",
  href: "/flights/results",
  params: {
    tripType: "round-trip",
    origin,
    destination,
    departureDate: "2026-09-01",
    returnDate: "2026-09-08",
    adults: 1,
    children: 0,
    infants: 0,
    travelers: 1,
    cabinClass: "economy",
  } satisfies RecentFlightParams,
});

test("recent airports follow search recency and dedupe origin/destination codes", () => {
  const airports = deriveRecentAirports([
    flight("older", "2026-08-10T00:00:00.000Z", "IAH", "JFK"),
    flight("newer", "2026-08-12T00:00:00.000Z", "IAH", "MIA"),
  ]);

  assert.deepEqual(airports.map(({ code }) => code), ["IAH", "MIA", "JFK"]);
});

test("recent airports resolve formatted values, ignore invalid metadata, and honor max", () => {
  const airports = deriveRecentAirports(
    [
      flight("latest", "2026-08-13T00:00:00.000Z", "Houston (IAH)", "Unknown (ZZZ)"),
      flight("older", "2026-08-12T00:00:00.000Z", "New York (JFK)", "Miami (MIA)"),
    ],
    2,
  );

  assert.deepEqual(airports.map(({ code }) => code), ["IAH", "JFK"]);
});

test("recent airport derivation ignores non-flight entries and supports an empty limit", () => {
  const hotel: RecentSearchEntry = {
    id: "hotel",
    type: "hotel",
    createdAt: "2026-08-14T00:00:00.000Z",
    label: "Houston",
    subtitle: "",
    href: "/hotels/results",
    params: {
      destination: "IAH",
      checkIn: "2026-09-01",
      checkOut: "2026-09-08",
      guests: 2,
      rooms: 1,
    },
  };

  assert.deepEqual(deriveRecentAirports([hotel]), []);
  assert.deepEqual(deriveRecentAirports([flight("flight", "2026-08-14T00:00:00.000Z", "IAH", "JFK")], 0), []);
});
