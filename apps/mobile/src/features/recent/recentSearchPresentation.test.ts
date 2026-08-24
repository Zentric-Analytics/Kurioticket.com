import assert from "node:assert/strict";
import test from "node:test";
import type { MobileRecentSearch } from "../../api/travelApi";
import { recentSearchPresentation } from "./recentSearchPresentation";

const recent = (type: "flight" | "hotel", params: unknown): MobileRecentSearch => ({
  id: "recent-1", type, label: "Previous search", subtitle: "Stored search", params,
  href: type === "flight" ? "/flights/results" : "/hotels/results",
  createdAt: "2099-01-01T00:00:00.000Z", updatedAt: "2099-01-01T00:00:00.000Z",
});

test("formats one-way and round-trip flight history", () => {
  assert.deepEqual(recentSearchPresentation(recent("flight", {
    origin: "LOS", destination: "LHR", departureDate: "2099-08-30", travelers: 1, cabinClass: "economy",
  })), { icon: "flight", title: "LOS → LHR", metadata: "Aug 30 · 1 traveler · Economy" });
  assert.equal(recentSearchPresentation(recent("flight", {
    origin: "LOS", destination: "LHR", departureDate: "2099-08-30", returnDate: "2099-09-10",
  })).metadata, "Aug 30 – Sep 10");
});

test("formats hotel dates and singular or plural occupancy", () => {
  assert.deepEqual(recentSearchPresentation(recent("hotel", {
    destination: "Accra", checkIn: "2099-09-01", checkOut: "2099-09-05", guests: 4, rooms: 2,
  })), { icon: "hotel", title: "Accra", metadata: "Sep 1 – Sep 5 · 4 guests · 2 rooms" });
  assert.equal(recentSearchPresentation(recent("hotel", {
    destination: "Accra", guests: 1, rooms: 1,
  })).metadata, "1 guest · 1 room");
});

test("does not display orphaned end dates without a valid start date", () => {
  assert.equal(recentSearchPresentation(recent("flight", {
    origin: "LOS", destination: "LHR", returnDate: "2099-09-10", travelers: 1,
  })).metadata, "1 traveler");
  assert.equal(recentSearchPresentation(recent("hotel", {
    destination: "Accra", checkOut: "2099-09-05", guests: 2,
  })).metadata, "2 guests");
});

test("malformed params safely use stored display fallbacks", () => {
  assert.deepEqual(recentSearchPresentation(recent("flight", { departureDate: "not-a-date", travelers: 0 })), {
    icon: "flight", title: "Previous search", metadata: "Stored search",
  });
  assert.deepEqual(recentSearchPresentation(recent("hotel", null)), {
    icon: "hotel", title: "Previous search", metadata: "Stored search",
  });
});
