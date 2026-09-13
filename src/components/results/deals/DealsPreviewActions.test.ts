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
    assert.match(card, /reasonKey\?: string/);
    assert.match(card, /\{reasonKey && <p[^>]*>\{t\(reasonKey\)\}<\/p>\}/);
    assert.doesNotMatch(card, /deals\.results\.providedBy/);
    assert.doesNotMatch(card, /provider\?\.trim\(\)/);
    assert.doesNotMatch(card, /href=\{handoff\.href\}/);
    assert.match(card, /<button type="button" aria-pressed=\{selected\}/);
    assert.doesNotMatch(card, /href=\{(?:flight|hotel)\.(?:bookingUrl|partnerRedirectUrl)\}/);
    assert.doesNotMatch(card, /target="_blank"/);
    assert.match(card, /onClick=\{onSelect\}/);
    assert.match(card, /import \{ Button \} from "@\/components\/ui\/Button"/);
    assert.match(card, /ArrowRight/);
    assert.match(card, /handoff\.available \?/);
    assert.match(card, /<span id=\{unavailableDescriptionId\} className="sr-only">/);
    assert.match(card, /<Button type="button" variant="accent" size="lg" className="w-full" disabled aria-describedby=\{unavailableDescriptionId\}>/);
    assert.match(card, /\{t\("continueToProvider"\)\}<ArrowRight size=\{16\} aria-hidden \/>/);
    assert.doesNotMatch(card, /<Button[^>]*onClick=/);
    assert.doesNotMatch(card, /<p role="status"/);
  }
  assert.match(flightCard, /getDealsProviderHandoff\(flight, "flight"\)/);
  assert.match(hotelCard, /getDealsProviderHandoff\(hotel, "hotel"\)/);
  assert.match(hotelCard, /discoveryUnavailable/);
  assert.match(hotelCard, /demoUnavailable/);
  assert.match(flightCard, /className="sr-only">\{t\("deals\.results\.providerHandoff\.unavailable"\)\}/);
  assert.match(hotelCard, /className="sr-only">\{t\(unavailableReasonKey\)\}/);
});

test("the product section retains one canonical results link contract", () => {
  assert.match(section, /<Link href=\{href\}/);
  assert.equal((section.match(/<Link\b/g) ?? []).length, 1);
  for (const removed of ["countLabel", "supportingText"]) assert.doesNotMatch(section, new RegExp(removed));
  for (const removed of ["formatDealsOptionCount", "countLabel", "supportingText", "deals.results.previewCount", "deals.results.returnedOptions", "deals.results.openCompleteResults"]) assert.doesNotMatch(results, new RegExp(removed.replaceAll(".", "\\.")));
});

test("Deals metadata and selection copy are non-empty in the fallback locale", () => {
  const keys = ["deals.results.viewFlightsCount", "deals.results.viewHotelsCount", "deals.results.priceResponsibility", "deals.results.flight.recommended.badge", "deals.results.flight.lowest.badge", "deals.results.hotel.lowest.badge", "deals.results.hotel.rating.reason", "deals.results.providerHandoff.continue", "deals.results.providerHandoff.unavailable", "deals.results.providerHandoff.hotel.discoveryUnavailable", "deals.results.providerHandoff.hotel.demoUnavailable", "deals.results.providerHandoff.flight.accessible", "deals.results.providerHandoff.hotel.accessible"] as const;
  for (const key of keys) assert.ok(translations[key]?.trim(), key);
});
