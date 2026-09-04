import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalHotelAddress, hotelStaySummary, isSafeNativeHotelProviderUrl, meaningfulHotelCenterDistance, nativeHotelOffers, nativeHotelProviderUrl, reconcileNativeHotelOfferSelection } from "./nativeHotelDetailsModel";

test("stay summary uses full dates and correct count grammar", () => {
  assert.match(hotelStaySummary("2026-09-04", "2026-09-05", 1, 1).dates!, /2026.*1 night/);
  assert.equal(hotelStaySummary("2026-09-04", "2026-09-07", 2, 1).occupancy, "2 guests, 1 room");
  assert.equal(hotelStaySummary("2026-09-04", "2026-09-07", 1, 2).occupancy, "1 guest, 2 rooms");
});

test("Hotel center distance accepts distances without treating addresses as distances", () => {
  assert.equal(meaningfulHotelCenterDistance("1.2 km"), "1.2 km from city center");
  assert.equal(meaningfulHotelCenterDistance("0.7 mi"), "0.7 mi from city center");
  assert.equal(meaningfulHotelCenterDistance("1 km from centre"), "1 km from centre");
  assert.equal(meaningfulHotelCenterDistance("8 Rue van Gogh, 75012 Paris"), null);
  assert.equal(meaningfulHotelCenterDistance("Rue Stanislas, Paris"), null);
  assert.equal(meaningfulHotelCenterDistance("Central Paris"), null);
  assert.equal(meaningfulHotelCenterDistance("  "), null);
  assert.equal(meaningfulHotelCenterDistance(), null);
});

test("Hotel continuation offers model internal, provider, both, and neither", () => {
  assert.deepEqual(nativeHotelOffers(true, false).map(({ id }) => id), ["internal-rooms"]);
  assert.deepEqual(nativeHotelOffers(false, true).map(({ id }) => id), ["provider"]);
  assert.deepEqual(nativeHotelOffers(true, true).map(({ id }) => id), ["internal-rooms", "provider"]);
  assert.deepEqual(nativeHotelOffers(false, false), []);
});

test("Hotel provider offers require a complete canonical HTTP destination", () => {
  assert.equal(isSafeNativeHotelProviderUrl("https://provider.example/book"), true);
  assert.equal(isSafeNativeHotelProviderUrl("http://provider.example/book"), true);
  assert.equal(isSafeNativeHotelProviderUrl("https://"), false);
  assert.equal(isSafeNativeHotelProviderUrl("javascript:alert(1)"), false);
  assert.equal(isSafeNativeHotelProviderUrl(), false);
});

test("Hotel provider URL selects the first safe canonical candidate", () => {
  const partner = "https://partner.example/hotel";
  const booking = "https://booking.example/hotel";
  assert.equal(nativeHotelProviderUrl(partner, booking), partner);
  assert.equal(nativeHotelProviderUrl("not-a-url", booking), booking);
  assert.equal(nativeHotelProviderUrl("javascript:alert(1)", booking), booking);
  assert.equal(nativeHotelProviderUrl("", booking), booking);
  assert.equal(nativeHotelProviderUrl(partner, "mailto:test@example.com"), partner);
  assert.equal(nativeHotelProviderUrl("https://", "not-a-url"), "");
  assert.equal(nativeHotelProviderUrl(), "");
  assert.equal(nativeHotelProviderUrl("http://partner.example/hotel"), "http://partner.example/hotel");
});

test("Hotel offer selection stays valid and deterministically reconciles enrichment", () => {
  const both = nativeHotelOffers(true, true);
  assert.equal(reconcileNativeHotelOfferSelection("provider", both), "provider");
  assert.equal(reconcileNativeHotelOfferSelection("provider", nativeHotelOffers(true, false)), "internal-rooms");
  assert.equal(reconcileNativeHotelOfferSelection("internal-rooms", nativeHotelOffers(false, true)), "provider");
  assert.equal(reconcileNativeHotelOfferSelection("internal-rooms", []), null);
});
test("canonical Hotel address is enriched, deduplicated, and falls back", () => {
  assert.equal(canonicalHotelAddress(null, "Paris, France"), "Paris, France");
  assert.equal(canonicalHotelAddress({ description: "", latitude: 1, longitude: 2, streetAddress: "8 Rue van Gogh", city: "Paris", country: "France", neighbourhood: "" }, "fallback"), "8 Rue van Gogh, Paris, France");
  assert.equal(canonicalHotelAddress({ description: "", latitude: 1, longitude: 2, streetAddress: "Paris, France", city: "Paris", country: "France", neighbourhood: "" }, "fallback"), "Paris, France");
});

test("Hotel details enrichment encodes the complete identity and remains abortable and stale-safe", () => {
  const api = readFileSync("src/api/travelApi.ts", "utf8");
  const screen = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
  assert.match(api, /`\/api\/hotels\/details\?\$\{params\.toString\(\)\}`/);
  for (const field of ["id", "checkIn", "checkOut"]) assert.match(api, new RegExp(`${field}: input\\.${field}`));
  for (const field of ["guests", "rooms"]) assert.match(api, new RegExp(`${field}: String\\(input\\.${field}\\)`));
  assert.match(api, /options: \{ signal\?: AbortSignal \}/);
  assert.match(screen, /const enrichmentKey = `\$\{result\.id\}/);
  assert.match(screen, /response\.hotel\?\.id === result\.id/);
  assert.match(screen, /controller\.abort\(\)/);
  assert.match(screen, /\.catch\(\(\) => undefined\)/);
});
