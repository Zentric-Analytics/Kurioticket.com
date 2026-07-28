import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { translations } from "@/lib/i18n/en";

const flightCard = readFileSync(new URL("./DealsFlightPreviewCard.tsx", import.meta.url), "utf8");
const hotelCard = readFileSync(new URL("./DealsHotelPreviewCard.tsx", import.meta.url), "utf8");
const section = readFileSync(new URL("./DealsProductSection.tsx", import.meta.url), "utf8");
const results = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");

test("preview articles use selection buttons without direct provider handoffs", () => {
  for (const card of [flightCard, hotelCard]) {
    assert.doesNotMatch(card, /href=\{handoff\.href\}/);
    assert.match(card, /<button type="button" aria-pressed=\{selected\}/);
    assert.doesNotMatch(card, /href=\{(?:flight|hotel)\.(?:bookingUrl|partnerRedirectUrl)\}/);
    assert.doesNotMatch(card, /target="_blank"/);
    assert.match(card, /onClick=\{onSelect\}/);
  }
  assert.match(flightCard, /getDealsProviderHandoff\(flight, "flight"\)/);
  assert.match(hotelCard, /getDealsProviderHandoff\(hotel, "hotel"\)/);
  assert.match(hotelCard, /discoveryUnavailable/);
  assert.match(hotelCard, /demoUnavailable/);
  for (const card of [flightCard, hotelCard]) {
    assert.match(card, /reasonKey\?: string/);
    assert.match(card, /reasonKey && <p/);
    assert.doesNotMatch(card, /deals\.results\.providedBy/);
  }
});

test("the product section retains one canonical results link contract", () => {
  assert.match(section, /<Link href=\{href\}/);
  assert.equal((section.match(/<Link\b/g) ?? []).length, 1);
  assert.doesNotMatch(section, /countLabel|supportingText/);
  assert.match(section, /<h2 id=\{id\}/);
  assert.match(section, /\{summary\}/);
});

test("Deals metadata and selection copy are non-empty in the fallback locale", () => {
  const keys = ["deals.results.viewFlightsCount", "deals.results.viewHotelsCount", "deals.results.priceResponsibility", "deals.results.flight.recommended.badge", "deals.results.hotel.rating.reason", "deals.results.providerHandoff.continue", "deals.results.providerHandoff.unavailable", "deals.results.providerHandoff.hotel.discoveryUnavailable", "deals.results.providerHandoff.hotel.demoUnavailable", "deals.results.providerHandoff.flight.accessible", "deals.results.providerHandoff.hotel.accessible"] as const;
  for (const key of keys) assert.ok(translations[key]?.trim(), key);
});

test("results omit standalone count and instructional copy while preserving counted View all actions", () => {
  for (const removed of ["formatDealsOptionCount", "countLabel", "supportingText", "deals.results.previewCount", "deals.results.returnedOptions", "deals.results.openCompleteResults"]) {
    assert.doesNotMatch(results, new RegExp(removed.replaceAll(".", "\\.")));
  }
  assert.match(results, /deals.results.viewFlightsCount/);
  assert.match(results, /deals.results.viewHotelsCount/);
  assert.match(results, /summary=\{`\$\{overview\.flight\.title\} · \$\{overview\.flight\.dates\}`\}/);
  assert.match(results, /summary=\{`\$\{overview\.hotel\.title\} · \$\{overview\.hotel\.dates\}`\}/);
});
