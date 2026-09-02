import assert from "node:assert/strict";
import test from "node:test";
import { buildHotelDiscoveryHref, resolveHotelDiscoveryIntent } from "./hotelDiscoveryIntent";

const promoted = [
  ["Dubai", "ae-dubai"], ["London", "gb-london"], ["Johannesburg", "za-johannesburg"],
  ["Accra", "gh-accra"], ["Nairobi", "ke-nairobi"], ["Istanbul", "tr-istanbul"], ["Paris", "fr-paris"],
] as const;

test("every promoted Hotel destination resolves to deterministic canonical intent", () => {
  for (const [name, id] of promoted) {
    const intent = resolveHotelDiscoveryIntent(name, "home-popular-stays");
    assert.equal(intent?.kind, "hotel-destination");
    assert.equal(intent?.canonicalDestinationId, id);
    assert.match(intent?.destinationSearchValue ?? "", new RegExp(`^${name}`));
    assert.equal(intent?.source, "home-popular-stays");
  }
});

test("Hotel discovery href preserves canonical identity and contains no hidden stay", () => {
  const href = buildHotelDiscoveryHref("London", "home-popular-stays");
  const url = new URL(href, "https://www.kurioticket.test");
  assert.equal(url.pathname, "/hotels");
  assert.equal(url.searchParams.get("destinationId"), "gb-london");
  assert.equal(url.searchParams.get("destination"), "London, United Kingdom");
  for (const hidden of ["checkIn", "checkOut", "guests", "rooms"]) assert.equal(url.searchParams.has(hidden), false);
});

test("unresolved Hotel discovery fails closed at the form", () => {
  assert.equal(buildHotelDiscoveryHref("Not a canonical destination", "hotels-featured"), "/hotels");
});
