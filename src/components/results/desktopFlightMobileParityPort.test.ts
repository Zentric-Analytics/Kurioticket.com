import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const filters = readFileSync(new URL("./DesktopFlightFilters.tsx", import.meta.url), "utf8");
const alert = readFileSync(new URL("./FlightPriceAlertControl.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("./FlightCard.tsx", import.meta.url), "utf8");
const details = readFileSync(new URL("./flightDetails/StandaloneFlightDetails.tsx", import.meta.url), "utf8");
const searchFields = readFileSync(new URL("../search/FlightSearchFieldPrimitives.tsx", import.meta.url), "utf8");
const globals = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

test("desktop Flight Results adopts approved mobile-web visual rules without replacing mobile contracts", () => {
  assert.match(results, /data-flight-results-main className="bg-\[#F5F7FB\][^"]*sm:bg-\[#F3F6FA\][^"]*lg:bg-\[#F5F7FB\]"/);
  assert.match(results, /data-desktop-cheaper-nearby/);
  assert.match(results, /className="max-sm:pt-2 max-sm:pb-1 sm:mb-4"><div data-flight-price-alert-row className="max-sm:-mx-2 max-sm:w-\[calc\(100%\+16px\)\]"/);
  assert.match(results, /data-flight-results-card-list className="space-y-3 sm:space-y-4 sm:pt-2 lg:pt-3"/);
  assert.match(alert, /data-flight-price-alert[^\n]*className="block"/);
  assert.match(alert, /sm:min-h-\[56px\]/);
});

test("desktop Flight filters follow the approved section hierarchy and selected-state language", () => {
  const order = ['t("price")', 't("takeoff") / {t("landing")}', 't("duration")', 't("stops")', 't("airlines")', 't("airports")', 't("baggage") / {t("flexibleRefundable")}'].map((marker) => filters.indexOf(marker));
  assert.ok(order.every((position, index) => position >= 0 && (index === 0 || position > order[index - 1])));
  assert.match(filters, /border-\[#0067DB\] bg-\[#0067DB\] text-white/);
  assert.match(filters, /<Check className="h-3 w-3"/);
  assert.match(filters, /\{t\("price"\)\}: \{formatFilterPrice/);
  assert.match(filters, /peer-focus-visible:ring-2/);
});

test("desktop Flight search airport values use the same medium typography as the unboxed date and traveler values", () => {
  assert.match(searchFields, /flightSearchFieldValueButtonClassName[\s\S]*?sm:text-\[15px\] sm:font-medium/);
  assert.match(searchFields, /className="h-6 w-full[^"]*text-\[15px\] font-medium/);
  assert.doesNotMatch(searchFields, /className="h-6 w-full[^"]*text-\[15px\] font-semibold/);
});

test("standalone desktop Flight Results renders only the primary desktop filter sidebar", () => {
  assert.match(results, /<DesktopFlightFilters/);
  assert.doesNotMatch(results, /layout="compact"/);
  assert.doesNotMatch(results, /showDesktopFilterShortcut|desktopCompactFilterRef|desktopFilterSentinelRef/);
});

test("desktop nearby fares keep seven dates and arrows but use mobile-like individual tiles", () => {
  assert.match(results, /const nearbyFareVisibleCount = 7;/);
  assert.match(results, /data-desktop-nearby-fare-rail[^\n]*grid-cols-\[42px_repeat\(7,minmax\(0,1fr\)\)_42px\]/);
  assert.match(results, /rounded-lg border border-slate-200 bg-white[^"]*shadow-sm/);
  assert.match(results, /text-\[11px\] font-medium uppercase leading-\[14px\]/);
  assert.match(results, /text-\[10px\] font-medium uppercase leading-\[13px\] tracking-\[0\.05em\]/);
  assert.match(results, /data-desktop-cheaper-nearby/);
});

test("desktop Flight result cards use the lighter hierarchy without changing MobileFlightCard", () => {
  assert.match(card, /flight-card-leg-label font-semibold/);
  assert.match(card, /flight-card-airport font-semibold/);
  assert.match(card, /flight-card-details mt-3[^\n]*rounded-lg bg-slate-50\/70/);
  assert.match(card, /className="h-3\.5 w-3\.5 shrink-0 text-black"/);
  assert.match(globals, /grid-template-areas: "legs fare" "details fare";/);
  assert.match(card, /actionLabel \?\? t\("viewDeal"\)/);
  assert.match(card, /flight-card-fare-action flex flex-col items-end/);
  assert.match(card, /<ChevronRight className="h-4 w-4"/);
  assert.doesNotMatch(card, /flight-card-view-button[^\n]*bg-\[#004BB8\]/);
  assert.match(globals, /\.flight-card-fare-action \{[\s\S]*padding-right: 0\.125rem;/);
  assert.match(globals, /\.flight-card-view-button \{[\s\S]*min-width: 0;[\s\S]*padding-left: 0;[\s\S]*padding-right: 0;/);
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
