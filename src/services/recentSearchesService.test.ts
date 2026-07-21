import assert from "node:assert/strict";
import test from "node:test";

import { recentSearchInputSchema } from "@/services/recentSearchesService";

const validFlightRecentSearch = {
  id: "flight:iah-lhr",
  type: "flight",
  createdAt: "2026-07-06T00:00:00.000Z",
  label: "IAH → LHR",
  subtitle: "Jul 10 · 1 traveler · economy",
  href: "/flights/results?origin=IAH&destination=LHR",
  params: {
    tripType: "one-way",
    origin: "IAH",
    destination: "LHR",
    departureDate: "2026-07-10",
    adults: 1,
    children: 0,
    infants: 0,
    travelers: 1,
    cabinClass: "economy",
  },
} as const;

const validHotelRecentSearch = {
  id: "hotel:london",
  type: "hotel",
  createdAt: "2026-07-06T00:00:00.000Z",
  label: "London",
  subtitle: "Jul 10 – Jul 12 · 1 guest · 1 room",
  href: "/hotels/results?destination=London",
  params: {
    destination: "London",
    checkIn: "2026-07-10",
    checkOut: "2026-07-12",
    guests: 1,
    rooms: 1,
  },
} as const;

test("recentSearchInputSchema accepts valid internal flight and hotel result hrefs", () => {
  assert.equal(recentSearchInputSchema.safeParse(validFlightRecentSearch).success, true);
  assert.equal(recentSearchInputSchema.safeParse(validHotelRecentSearch).success, true);
});

test("recentSearchInputSchema rejects absolute external hrefs", () => {
  const result = recentSearchInputSchema.safeParse({
    ...validFlightRecentSearch,
    href: "https://evil.example/flights/results?origin=IAH",
  });

  assert.equal(result.success, false);
});

test("recentSearchInputSchema rejects protocol-relative hrefs", () => {
  const result = recentSearchInputSchema.safeParse({
    ...validHotelRecentSearch,
    href: "//evil.example/hotels/results?destination=London",
  });

  assert.equal(result.success, false);
});

test("recentSearchInputSchema rejects unsafe scheme hrefs", () => {
  for (const href of [
    "javascript:alert(1)",
    "data:text/html,<h1>bad</h1>",
    "mailto:test@example.com",
  ]) {
    const result = recentSearchInputSchema.safeParse({
      ...validFlightRecentSearch,
      href,
    });

    assert.equal(result.success, false, `${href} should be rejected`);
  }
});

test("recentSearchInputSchema rejects flight entries with hotel result hrefs", () => {
  const result = recentSearchInputSchema.safeParse({
    ...validFlightRecentSearch,
    href: "/hotels/results?destination=London",
  });

  assert.equal(result.success, false);
});

test("recentSearchInputSchema rejects hotel entries with flight result hrefs", () => {
  const result = recentSearchInputSchema.safeParse({
    ...validHotelRecentSearch,
    href: "/flights/results?origin=IAH&destination=LHR",
  });

  assert.equal(result.success, false);
});
