import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const appHeader = readFileSync(new URL("../layout/AppHeader.tsx", import.meta.url), "utf8");
const start = source.indexOf("function renderMobileRouteSummaryCard()");
const card = source.slice(start, source.indexOf("function renderMobileEditSearchDrawer()", start));

test("Flight Results keeps one persistent AppHeader mobile search with branding and account/menu", () => {
  assert.match(source, /mobileResultsSearch=\{renderMobileRouteSummaryCard\(\)\}/);
  assert.match(source, /mobileResultsTrailingActions/);
  assert.doesNotMatch(source, /renderMobileCompactResultsHeader|mobileCompactHeaderVisible|mobileSearchSummarySentinelRef|relative translate-y-1\/2/);
  assert.match(appHeader, /aria-label="Kurioticket home"/);
  assert.match(appHeader, /kurioticket-icon-blue\.svg/);
  assert.match(appHeader, /mobileResultsTrailingActions[\s\S]*h-11 w-11/);
});

test("Flight capsule renders a light two-line search summary and opens the shared drawer", () => {
  assert.ok(start >= 0);
  assert.match(card, /data-flight-mobile-summary-card/);
  assert.match(card, /min-h-11 w-full min-w-0/);
  assert.match(card, /rounded-xl bg-\[#F5F7FB\]/);
  assert.match(card, /text-\[14px\] font-semibold/);
  assert.match(card, /text-\[11px\] font-medium/);
  assert.match(card, /\{mobileRouteSummary\}/);
  assert.match(card, /\{mobileTripTypeSummary\} · \{mobileDateSummary\} ·/);
  assert.match(card, /\{mobileTravelerSummary\} · \{mobileCabinClassSummary\}/);
  assert.match(card, /title=\{mobileSearchSummaryLabel\}/);
  assert.match(card, /aria-haspopup="dialog"/);
  assert.match(card, /aria-expanded=\{mobileSearchOpen\}/);
  assert.match(card, /openMobileSearchDrawer\(event\.currentTarget/);
  assert.doesNotMatch(card, /font-bold|shadow-\[|h-\[4\.25rem\]|max-w-\[30rem\]/);
});

test("mobile Flight filters precede nearby dates and price/results/cards", () => {
  const filters = source.indexOf("data-flight-mobile-results-shortcuts");
  const dates = source.indexOf('data-nearby-fare-presentation="mobile"');
  const cheaper = source.indexOf('flight-mobile-cheaper-nearby', dates);
  const alert = source.indexOf("data-flight-price-alert-row", dates);
  const count = source.indexOf("data-mobile-flight-results-summary-row", alert);
  const cards = source.indexOf("data-mobile-paginated-flight-results", count);
  assert.ok(filters > 0 && filters < dates && dates < cheaper && cheaper < alert && alert < count && count < cards);
  assert.match(source.slice(filters, dates), /renderMobileSortResultsRow\(\)/);
});

test("desktop header settings and desktop search stay independent of the mobile capsule", () => {
  assert.match(source, /hideDesktopTravelNav[\s\S]*hotelDesktopBoundary[\s\S]*flightResultsDesktopSticky/);
  const desktopStart = source.indexOf("function renderDesktopHeaderSearchBar()");
  const desktop = source.slice(desktopStart, source.indexOf("\n  function ", desktopStart + 10));
  assert.doesNotMatch(desktop, /renderMobileRouteSummaryCard/);
  assert.match(appHeader, /mobileResultsSearch && "max-sm:hidden"/);
});


test("mobile Flight Suspense reserves the ready navbar geometry", () => {
  const page = readFileSync(new URL("../../app/flights/results/page.tsx", import.meta.url), "utf8");
  assert.match(page, /mobileResultsTrailingActions/);
  assert.match(page, /mobileResultsSearch=\{[\s\S]*?data-flight-mobile-summary-placeholder/);
  assert.match(page, /data-flight-mobile-summary-placeholder[\s\S]*?min-h-11 w-full min-w-0/);
});


test("Flight capsule keeps the previous Edit Search inert boundary", () => {
  assert.match(card, /inert=\{mobileSearchOpen \? true : undefined\}/);
  assert.match(card, /aria-hidden=\{mobileSearchOpen \? true : undefined\}/);
});
