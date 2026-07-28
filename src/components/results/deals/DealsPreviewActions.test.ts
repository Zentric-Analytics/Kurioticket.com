import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { translations } from "@/lib/i18n/en";

const flightCard = readFileSync(new URL("./DealsFlightPreviewCard.tsx", import.meta.url), "utf8");
const hotelCard = readFileSync(new URL("./DealsHotelPreviewCard.tsx", import.meta.url), "utf8");
const section = readFileSync(new URL("./DealsProductSection.tsx", import.meta.url), "utf8");

test("preview articles have no generic card-level links or actions", () => {
  assert.doesNotMatch(flightCard, /next\/link|compareFlights|href=/);
  assert.doesNotMatch(hotelCard, /next\/link|compareHotels|href=/);
});

test("the product section retains one canonical results link contract", () => {
  assert.match(section, /<Link href=\{href\}/);
  assert.equal((section.match(/<Link\b/g) ?? []).length, 1);
});

test("Deals metadata and selection copy are non-empty in the fallback locale", () => {
  const keys = ["deals.results.previewCount", "deals.results.returnedOptions", "deals.results.viewFlightsCount", "deals.results.viewHotelsCount", "deals.results.priceResponsibility", "deals.results.flight.recommended.badge", "deals.results.hotel.rating.reason"] as const;
  for (const key of keys) assert.ok(translations[key]?.trim(), key);
});
