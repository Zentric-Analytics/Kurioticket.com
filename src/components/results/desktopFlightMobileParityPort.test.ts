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
  assert.match(results, /data-flight-results-card-list className="space-y-3 sm:space-y-4"/);
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

test("standalone desktop Flight Results uses Cars-style compact filter parity after the primary sidebar scrolls away", () => {
  assert.match(results, /renderDesktopFlightFilters\(true\)/);
  assert.match(results, /desktopCompactFilterRef/);
  assert.match(results, /desktopFilterSentinelRef/);
  assert.match(filters, /data-flight-desktop-compact-filter-surface/);
  assert.match(filters, /openCompactSection/);
  assert.match(filters, /setOpenCompactSection\(\(current\) => \(current === section \? null : section\)\)/);
  assert.match(filters, /desktop-filter-sidebar__title[\s\S]*?SlidersHorizontal[\s\S]*?size=\{15\}/);
  assert.match(filters, /min-h-9 w-full[\s\S]*?text-\[14px\][\s\S]*?ChevronDown/);
  assert.match(filters, /min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain/);
  assert.match(results, /idPrefix=\{compact \? "desktop-flight-filter-compact" : "desktop-flight-filter-primary"\}/);
});

test("desktop nearby fares keep seven dates and arrows but use mobile-like individual tiles", () => {
  assert.match(results, /const nearbyFareVisibleCount = 7;/);
  assert.match(results, /data-desktop-nearby-fare-rail[^\n]*grid-cols-\[42px_repeat\(7,minmax\(0,1fr\)\)_42px\]/);
  assert.match(results, /rounded-lg border border-slate-200 bg-white[^"]*shadow-sm/);
  assert.match(results, /text-\[11px\] font-medium uppercase leading-\[14px\]/);
  assert.match(results, /text-\[10px\] font-medium uppercase leading-\[13px\] tracking-\[0\.05em\]/);
  assert.match(results, /data-desktop-cheaper-nearby/);
  const desktopNearby = results.match(/data-desktop-cheaper-nearby[\s\S]*?className="([^"]*)"[\s\S]*?>\s*Cheaper nearby:/)?.[1] ?? "";
  assert.match(desktopNearby, /px-0/);
  assert.match(desktopNearby, /text-\[13px\] font-medium/);
  assert.doesNotMatch(desktopNearby, /rounded-full|bg-white|ring-slate-200/);
  assert.match(results, /Cheaper nearby: \{formatFareStripDateLabel\(cheaperNearbyFare\.date, calendarLocale\)\} · Save \{cheaperNearbyFare\.savings\}/);
});

test("desktop Flight result cards use the lighter hierarchy without changing MobileFlightCard", () => {
  assert.match(card, /flight-card-airline-name[^\n]*font-bold text-slate-900/);
  assert.match(card, /flight-card-leg-label font-bold uppercase text-\[#0057E7\]/);
  assert.match(card, /flight-card-time[^\n]*font-extrabold[^\n]*text-slate-950/);
  assert.match(card, /flight-card-airport[^\n]*font-semibold text-slate-900/);
  assert.match(card, /flight-card-leg-meta font-medium text-\[#536B92\]/);
  assert.match(card, /flight-card-duration[^\n]*font-semibold text-slate-600/);
  assert.match(card, /flight-card-price-value font-bold/);
  assert.match(card, /flight-card-detail-value[^\n]*font-medium text-\[#536B92\]/);
  assert.match(card, /shrink-0 font-semibold text-\[#07133B\]/);
  assert.match(card, /PlaneTakeoff className="mx-2 h-3\.5 w-3\.5 text-\[#004BB8\]"/);
  assert.match(globals, /\.flight-card-airline-name \{[\s\S]*font-size: 0\.875rem;[\s\S]*line-height: 1\.0625rem;/);
  assert.match(globals, /\.flight-card-flight-number \{[\s\S]*font-size: 0\.6875rem;[\s\S]*line-height: 0\.875rem;/);
  assert.match(globals, /\.flight-card-time \{[\s\S]*font-size: 1rem;[\s\S]*line-height: 1\.125rem;/);
  assert.match(globals, /\.flight-card-airport \{[\s\S]*font-size: 0\.75rem;/);
  assert.match(globals, /\.flight-card-leg-meta \{[\s\S]*font-size: 0\.6875rem;/);
  assert.match(globals, /\.flight-card-duration \{[\s\S]*font-size: 0\.6875rem;/);
  assert.match(globals, /\.flight-card-fare-action \.flight-card-price-value \{[\s\S]*font-size: 1\.1875rem;[\s\S]*text-align: right;/);
  assert.match(globals, /\.flight-card-price-value\.flight-card-price\[data-price-size="normal"\] \{[\s\S]*font-size: 1\.1875rem;/);
  assert.match(globals, /\.flight-results-grid \.flight-card-flight-number \{ font-size: 0\.6875rem; line-height: 0\.875rem; \}/);
  assert.match(globals, /\.flight-results-grid \.flight-card-time \{ font-size: 1rem; line-height: 1\.125rem; \}/);
  assert.match(card, /flight-card-details mt-3[^\n]*rounded-lg bg-slate-50\/70/);
  assert.match(card, /className="h-3\.5 w-3\.5 shrink-0 text-black"/);
  assert.match(globals, /grid-template-areas: "legs fare" "details fare";/);
  assert.match(card, /actionLabel \?\? t\("viewDeal"\)/);
  assert.match(card, /flight-card-fare-action flex flex-col items-end/);
  assert.match(card, /flight-card-fare-action flex flex-col items-end justify-end/);
  assert.match(card, /flight-card-fare-commerce mt-auto flex w-full flex-col items-end/);
  assert.match(card, /flight-card-view-button mt-2/);
  assert.match(globals, /\.flight-card-fare-action \{[\s\S]*padding-bottom: 0\.25rem;/);
  assert.match(globals, /\.flight-card-fare-action \.flight-card-price-value \{[\s\S]*text-align: right;/);
  assert.match(card, /<ChevronRight className="h-4 w-4"/);
  assert.doesNotMatch(card, /flight-card-view-button[^\n]*bg-\[#004BB8\]/);
  assert.match(globals, /\.flight-card-fare-action \{[\s\S]*padding-right: 0\.125rem;/);
  assert.match(globals, /\.flight-card-view-button \{[\s\S]*width: 100%;[\s\S]*min-width: 0;[\s\S]*justify-content: flex-end;[\s\S]*padding-left: 0;[\s\S]*padding-right: 0;/);
  assert.doesNotMatch(card, /flight-card-detail-item flex-nowrap whitespace-nowrap border-r/);
  assert.match(card, /<MobileFlightCard/);
  assert.match(card, /data-flight-card-actions/);
  assert.match(card, /aria-pressed=\{isSaved\}/);
  assert.match(card, /<Heart[\s\S]*fill=\{isSaved \? "currentColor" : "none"\}/);
  assert.match(card, /<Share2 size=\{18\}/);
  assert.match(card, /navigator\.share/);
  assert.match(card, /navigator\.clipboard\.writeText/);
});

test("desktop Flight Details carries fare typography, underline-only tabs, and price readiness", () => {
  assert.match(details, /data-desktop-fare-price-loading/);
  assert.match(details, /data-desktop-trip-price-loading/);
  assert.match(details, /sm:text-\[18px\] sm:font-medium/);
  assert.match(details, /text-\[20px\] font-semibold leading-5 text-\[#075EE8\]/);
  assert.match(details, /activeTab === tab.id \? "border-\[#075EE8\] text-slate-700"/);
  assert.match(details, /priceLoading=\{!mobilePricesReady\}/);
});
