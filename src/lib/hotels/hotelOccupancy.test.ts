import test from "node:test";
import assert from "node:assert/strict";
import { hotelSearchSchema } from "@/lib/validation";
import { hotelOccupancy } from "./hotelOccupancy";
import { adaptKayakHotelSearch } from "@/services/travel/kayakSearchAdapter";
import { kayakProviderCriteria } from "@/services/travel/kayakMetasearchProvider";
import { getHotelDetailsCacheContext, rememberHotels } from "@/lib/searchCache";
import { buildHotelDetailsResultsHref } from "@/components/results/hotelDetails/hotelDetailsPresentation";
import type { NormalizedHotelResult } from "@/lib/types";
import { readFileSync } from "node:fs";
import { buildHotelRecentSearch } from "@/lib/recent-searches";

const base = { destination: "Abuja, Nigeria", checkIn: "2099-10-12", checkOut: "2099-10-15", guests: 2, rooms: 1 };

test("web forms and results keep full geography and occupancy at the API boundary", () => {
  const form = readFileSync(new URL("../../components/search/HotelSearchBar.tsx", import.meta.url), "utf8");
  const homepage = readFileSync(new URL("../../components/search/SearchTabs.tsx", import.meta.url), "utf8");
  const results = readFileSync(new URL("../../components/results/HotelResultsClient.tsx", import.meta.url), "utf8");
  for (const source of [form, homepage]) {
    assert.match(source, /adults: String\(hotelAdultCount\)/);
    assert.match(source, /children: String\(hotelChildCount\)/);
  }
  assert.match(form, /const searchDestination = trimmedDestination/);
  assert.doesNotMatch(results, /normalizeHotelDestinationSearchValue/);
  assert.match(results, /adults: searchInput.adults/);
  assert.match(results, /children: searchInput.children/);
});

test("hotel occupancy preserves adults and children and validates the total", () => {
  const parsed = hotelSearchSchema.parse({ ...base, adults: "1", children: "1" });
  assert.deepEqual(hotelOccupancy(parsed), { adults: 1, children: 1 });
  assert.deepEqual(hotelOccupancy(base), { adults: 2, children: 0 });
  for (const invalid of [{ adults: 2, children: 1 }, { adults: 0, children: 2 }, { adults: 3 }, { children: 3 }]) {
    assert.equal(hotelSearchSchema.safeParse({ ...base, ...invalid }).success, false);
  }
});

test("an adult-only adapter must not turn children into adults or silently remove rooms", () => {
  for (const unsupported of [{ adults: 1, children: 1 }, { adults: 2, children: 0, rooms: 2 }]) {
    const adapted = adaptKayakHotelSearch(kayakProviderCriteria({ ...base, destinationId: "kplace:1", ...unsupported }));
    assert.equal(adapted.supported, false);
    if (!adapted.supported) assert.equal(adapted.reasonCode, "unsupported_search");
  }
  const adapted = adaptKayakHotelSearch(kayakProviderCriteria({ ...base, destinationId: "kplace:1", adults: 2, children: 0 }));
  assert.equal(adapted.supported, true);
  if (adapted.supported && adapted.search.vertical === "hotels") assert.equal(adapted.search.adults, 2);
});

test("details return navigation preserves the guest mix", () => {
  const href = buildHotelDetailsResultsHref({ ...base, guests: "2", rooms: "1", adults: "1", children: "1" });
  const params = new URL(href, "https://example.test").searchParams;
  assert.equal(params.get("adults"), "1");
  assert.equal(params.get("children"), "1");
});

test("repeating a recent hotel search does not turn children into adults", () => {
  const entry = buildHotelRecentSearch({ ...base, adults: 1, children: 1, destinationId: "ng-abuja" });
  const params = new URL(entry.href, "https://example.test").searchParams;
  assert.equal(params.get("adults"), "1");
  assert.equal(params.get("children"), "1");
  assert.equal(params.get("destination"), "Abuja, Nigeria");
  assert.equal(params.get("destinationId"), "ng-abuja");
});

test("equal total guests with different occupancy never reuse a hotel cohort", () => {
  const hotel = { id: "occupancy-test-offer", provider: "test", name: "Test Hotel" } as NormalizedHotelResult;
  const family = { ...base, adults: 1, children: 1 };
  rememberHotels([hotel], family);
  assert.equal(getHotelDetailsCacheContext(hotel.id, family)?.hotel.id, hotel.id);
  assert.equal(getHotelDetailsCacheContext(hotel.id, { ...base, adults: 2, children: 0 }), null);
  assert.equal(getHotelDetailsCacheContext(hotel.id, base), null);
});
