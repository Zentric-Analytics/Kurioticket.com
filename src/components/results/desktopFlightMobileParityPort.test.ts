import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const filters = readFileSync(new URL("./DesktopFlightFilters.tsx", import.meta.url), "utf8");
const alert = readFileSync(new URL("./FlightPriceAlertControl.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("./FlightCard.tsx", import.meta.url), "utf8");
const details = readFileSync(new URL("./flightDetails/StandaloneFlightDetails.tsx", import.meta.url), "utf8");

test("desktop Flight Results adopts approved mobile-web visual rules without replacing mobile contracts", () => {
  assert.match(results, /data-flight-results-main className="bg-\[#F5F7FB\][^"]*sm:bg-\[#F3F6FA\][^"]*lg:bg-\[#F5F7FB\]"/);
  assert.match(results, /data-desktop-cheaper-nearby/);
  assert.match(results, /data-flight-price-alert-row className="max-sm:-mx-2 max-sm:w-\[calc\(100%\+16px\)\][^"]*sm:mb-4"/);
  assert.match(results, /data-flight-results-card-list className="space-y-3 sm:space-y-4 sm:pt-2 lg:pt-3"/);
  assert.match(alert, /data-flight-price-alert[^\n]*className="block"/);
  assert.match(alert, /sm:min-h-\[56px\]/);
});

test("desktop Flight filters follow the approved section hierarchy and selected-state language", () => {
  const order = ["price", "Flight times", "duration", "stops", "airlines", "airports", "Fare preferences"].map((marker) => filters.indexOf(marker));
  assert.ok(order.every((position, index) => position >= 0 && (index === 0 || position > order[index - 1])));
  assert.match(filters, /border-\[#0067DB\] bg-\[#0067DB\] text-white/);
  assert.match(filters, /<Check className="h-3 w-3"/);
  assert.match(filters, /Up to \{formatFilterPrice/);
});

test("desktop Flight result cards use the lighter hierarchy without changing MobileFlightCard", () => {
  assert.match(card, /flight-card-leg-label font-semibold/);
  assert.match(card, /flight-card-airport font-semibold/);
  assert.match(card, /flight-card-details mt-3[^\n]*rounded-lg bg-slate-50\/70/);
  assert.doesNotMatch(card, /flight-card-detail-item flex-nowrap whitespace-nowrap border-r/);
  assert.match(card, /<MobileFlightCard/);
});

test("desktop Flight Details carries fare typography, underline-only tabs, and price readiness", () => {
  assert.match(details, /data-desktop-fare-price-loading/);
  assert.match(details, /data-desktop-trip-price-loading/);
  assert.match(details, /sm:text-\[18px\] sm:font-medium/);
  assert.match(details, /text-\[20px\] font-semibold leading-5 text-\[#075EE8\]/);
  assert.match(details, /activeTab === tab.id \? "border-\[#075EE8\] text-slate-700"/);
  assert.match(details, /priceLoading=\{!mobilePricesReady\}/);
});
