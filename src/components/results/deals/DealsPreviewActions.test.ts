import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { translations } from "@/lib/i18n/en";

const flightCard = readFileSync(new URL("./DealsFlightPreviewCard.tsx", import.meta.url), "utf8");
const hotelCard = readFileSync(new URL("./DealsHotelPreviewCard.tsx", import.meta.url), "utf8");
const section = readFileSync(new URL("./DealsProductSection.tsx", import.meta.url), "utf8");

test("preview articles use exact internal provider handoffs without raw target hrefs", () => {
  for (const card of [flightCard, hotelCard]) {
    assert.match(card, /href=\{handoff\.href\}/);
    assert.doesNotMatch(card, /href=\{(?:flight|hotel)\.(?:bookingUrl|partnerRedirectUrl)\}/);
    assert.doesNotMatch(card, /target="_blank"/);
    assert.match(card, /min-h-11 w-full/);
  }
  assert.match(flightCard, /getDealsProviderHandoff\(flight, "flight"\)/);
  assert.match(hotelCard, /getDealsProviderHandoff\(hotel, "hotel"\)/);
  assert.match(hotelCard, /discoveryUnavailable/);
  assert.match(hotelCard, /demoUnavailable/);
});

test("the product section retains one canonical results link contract", () => {
  assert.match(section, /<Link href=\{href\}/);
  assert.equal((section.match(/<Link\b/g) ?? []).length, 1);
});

test("Deals metadata and selection copy are non-empty in the fallback locale", () => {
  const keys = ["deals.results.previewCount", "deals.results.returnedOptions", "deals.results.viewFlightsCount", "deals.results.viewHotelsCount", "deals.results.priceResponsibility", "deals.results.flight.recommended.badge", "deals.results.hotel.rating.reason", "deals.results.providerHandoff.continue", "deals.results.providerHandoff.unavailable", "deals.results.providerHandoff.hotel.discoveryUnavailable", "deals.results.providerHandoff.hotel.demoUnavailable", "deals.results.providerHandoff.flight.accessible", "deals.results.providerHandoff.hotel.accessible"] as const;
  for (const key of keys) assert.ok(translations[key]?.trim(), key);
});
