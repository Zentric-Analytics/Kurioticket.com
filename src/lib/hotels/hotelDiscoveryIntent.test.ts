import assert from "node:assert/strict";
import test from "node:test";
import { buildHotelDiscoveryHref, buildHotelDiscoveryResultsHref, buildMaintainedHotelDiscoveryHref, buildMaintainedHotelDiscoveryResultsHref, resolveHotelDiscoveryIntent } from "./hotelDiscoveryIntent";

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

test("curated discovery creates complete direct results at the injected interaction time", () => {
  const href = buildHotelDiscoveryResultsHref("London", "home-popular-stays", new Date("2030-01-01T00:00:00Z"));
  const url = new URL(href!, "https://www.kurioticket.test");
  assert.equal(url.pathname, "/hotels/results");
  assert.equal(url.searchParams.get("destinationId"), "gb-london");
  assert.equal(url.searchParams.get("checkIn"), "2030-01-29");
  assert.equal(url.searchParams.get("checkOut"), "2030-02-05");
  assert.equal(url.searchParams.get("guests"), "2");
  assert.equal(url.searchParams.get("rooms"), "1");
  const textual = new URL(buildMaintainedHotelDiscoveryResultsHref("Sapporo", "home-country-directory", new Date("2030-01-01T00:00:00Z"))!, "https://www.kurioticket.test");
  assert.equal(textual.pathname, "/hotels/results");
  assert.equal(textual.searchParams.get("destination"), "Sapporo");
  assert.equal(textual.searchParams.has("destinationId"), false);
});

test("maintained textual Hotel intent survives without a fabricated canonical ID", () => {
  const href = buildMaintainedHotelDiscoveryHref("  Ras   Al Khaimah  ", "home-country-directory");
  const url = new URL(href, "https://www.kurioticket.test");
  assert.equal(url.pathname, "/hotels");
  assert.equal(url.searchParams.get("destination"), "Ras Al Khaimah");
  assert.equal(url.searchParams.get("intentSource"), "home-country-directory");
  assert.equal(url.searchParams.has("destinationId"), false);
  assert.equal(buildMaintainedHotelDiscoveryHref(" \u0000 ", "home-country-directory"), "/hotels");
});
