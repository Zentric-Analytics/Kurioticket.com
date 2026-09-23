import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const card = readFileSync(new URL("./MobileFlightCard.tsx", import.meta.url), "utf8");
const desktopCard = readFileSync(new URL("./FlightCard.tsx", import.meta.url), "utf8");
const results = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const state = readFileSync(new URL("./MobileFlightResultsState.tsx", import.meta.url), "utf8");
const loading = readFileSync(new URL("../layout/BrandedLoading.tsx", import.meta.url), "utf8");

test("mobile card uses native geometry and one whole-card details target", () => {
  assert.match(card, /rounded-2xl[^\n]*px-3 py-\[9px\]/);
  assert.match(card, /data-mobile-flight-card/);
  assert.match(card, /Opens Kurioticket flight details/);
  assert.match(card, /router\.push\(detailsHref\)/);
  assert.match(card, /active:scale-\[0\.995\][^\n]*active:opacity-90/);
  assert.match(desktopCard, /relative hidden w-full[^\n]*sm:block/);
});

test("mobile identity, journeys, badges, and track match native hierarchy", () => {
  assert.match(card, /flight\.airlineName[\s\S]*flight\.flightNumber[\s\S]*operator\.text/);
  assert.match(card, /Operated by|Includes flight operated by/);
  for (const label of ["Best value", "Cheapest", "Fastest", "OUTBOUND", "RETURN", "FLIGHT "]) assert.match(card, new RegExp(label));
  assert.doesNotMatch(card, /Award|Zap|Tag/);
  assert.match(card, /h-\[7px\][\s\S]*h-\[1\.5px\] flex-1 bg-slate-300[\s\S]*<PlaneTakeoff[\s\S]*h-\[1\.5px\] flex-1 bg-slate-300[\s\S]*h-\[7px\]/);
  assert.match(card, /grid-cols-\[72px_minmax\(46px,1fr\)_72px\]/);
  assert.doesNotMatch(card, /ml-\[46px\]/);
  assert.doesNotMatch(card, /formatLayover|layoverSummaryTemplate|Layover:/);
});

test("mobile metadata and commercial action use native copy and order", () => {
  const baggage = card.indexOf('label={t("baggage")}');
  const cabin = card.indexOf('label={t("cabin")}');
  const fare = card.indexOf('label={t("fareRules")}');
  assert.ok(baggage >= 0 && baggage < cabin && cabin < fare);
  assert.match(card, /Review policy/);
  assert.match(card, /Review fare/);
  assert.match(card, /"Review"/);
  assert.match(card, /View deals/);
  assert.match(card, /ChevronRight/);
  assert.doesNotMatch(card, /View Flight|viewFlight/);
});

test("standalone mobile loading consumes shared flight presentation with progress semantics", () => {
  assert.match(results, /showProgress\s+accessibleProgress[\s\S]*searchType="flight"[\s\S]*sm:hidden/);
  assert.match(loading, /searchLoadingPresentation\(searchType, locale\)/);
  assert.match(loading, /role=\{accessibleProgress \? "progressbar" : "status"\}/);
  assert.match(loading, /motion-reduce:animate-none/);
});

test("mobile terminal states are distinct and expose working actions", () => {
  for (const copy of ["No flights match your filters", "Try adjusting or clearing your filters.", "Clear filters", "Adjust filters", "Couldn't load flights", "Something went wrong while loading your results.", "Try again", "Edit search", "No flights found", "We couldn't find flights for this search."]) assert.match(state, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(results, /kind="error" onPrimary=\{retryMainInventorySearch\}/);
  assert.match(results, /kind="empty"/);
  assert.match(results, /kind="filtered" onPrimary=\{clearFlightFilters\}/);
  assert.match(results, /openMobileFiltersDrawer\(\)/);
  assert.match(state, /min-h-\[210px\]/);
  assert.match(state, /aria-live="polite"/);
});

test("mobile list paginates twenty results with the shared pagination state", () => {
  assert.match(results, /data-mobile-paginated-flight-results/);
  assert.match(results, /visibleResults\.map\(\(flight, index\)/);
  assert.match(results, /<FlightResultsPagination[\s\S]*currentPage=\{validResultsPage\}[\s\S]*totalPages=\{totalResultPages\}/);
  assert.match(results, /FLIGHT_RESULTS_PAGE_SIZE/);
  assert.match(results, /data-flight-results-transition-cover[\s\S]*fixed inset-0 z-\[9990\][\s\S]*<FlightCardSkeleton key=\{index\} \/>/);
  assert.doesNotMatch(results, /data-flight-results-transition-cover[\s\S]{0,220}hidden[\s\S]{0,120}sm:block/);
  assert.match(results, /aria-label="Back to top"/);
  assert.match(results, /<Footer variant="brand-legal-only" \/>/);
  assert.doesNotMatch(results, /data-mobile-continuous-flight-list|sortedResults\.map\(\(flight, index\)/);
});

test("Batch 1 and Batch 2 surfaces remain before the card list", () => {
  const nearby = results.indexOf('data-nearby-fare-presentation="mobile"');
  const shortcuts = results.indexOf("data-flight-mobile-results-shortcuts");
  const alert = results.indexOf("<FlightPriceAlertControl");
  const count = results.indexOf("formatMobileFlightResultsFound");
  const list = results.indexOf("data-mobile-paginated-flight-results");
  assert.ok(nearby >= 0 && nearby < shortcuts && shortcuts < alert && alert < count && count < list);
});
