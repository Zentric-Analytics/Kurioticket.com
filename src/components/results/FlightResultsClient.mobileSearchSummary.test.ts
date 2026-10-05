import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const appHeader = readFileSync(new URL("../layout/AppHeader.tsx", import.meta.url), "utf8");
const unifiedStart = source.indexOf("function renderMobileDesktopStyleHeaderSearch()");
const unifiedEnd = source.indexOf("function renderMobileEditSearchDrawer()", unifiedStart);
const unified = source.slice(unifiedStart, unifiedEnd);

test("standalone Flight Results uses one desktop-style sticky AppHeader on mobile", () => {
  assert.match(
    source,
    /<AppHeader[\s\S]*mobileResultsSearch=\{renderMobileDesktopStyleHeaderSearch\(\)\}[\s\S]*mobileResultsSticky[\s\S]*mobileResultsDesktopStyle/,
  );
  assert.match(appHeader, /mobileResultsDesktopStyle\?: boolean/);
  assert.match(appHeader, /data-mobile-results-desktop-style/);
  assert.match(appHeader, /data-mobile-results-currency/);
  assert.match(appHeader, /kurioticket-logo-primary-light-bg\.svg/);
  assert.doesNotMatch(source, /renderMobileRouteSummaryCard|renderMobileCompactResultsHeader/);
  assert.doesNotMatch(source, /mobileCompactHeaderVisible|mobileSearchSummarySentinelRef/);
  assert.doesNotMatch(source, /data-flight-results-compact-header/);
});

test("mobile Flight header compresses the desktop search hierarchy into route, dates, travelers and search", () => {
  assert.ok(unifiedStart >= 0 && unifiedEnd > unifiedStart);
  assert.match(unified, /data-flight-mobile-unified-header-search/);
  assert.match(unified, /data-flight-mobile-header-route/);
  assert.match(unified, /data-flight-mobile-header-dates/);
  assert.match(unified, /data-flight-mobile-header-travelers/);
  assert.match(unified, /data-flight-mobile-header-search/);
  assert.match(unified, /border-\[#D8E1EC\] bg-\[#F8FAFC\]/);
  assert.match(unified, /<ArrowRightLeft/);
  assert.match(unified, /<Calendar/);
  assert.match(unified, /<UserRound/);
  assert.match(unified, /bg-\[#004BB8\]/);
  assert.match(unified, /<Search className="h-\[18px\] w-\[18px\]"/);
});

test("every mobile header search control opens the existing Edit Search drawer", () => {
  assert.match(unified, /const openEditSearch/);
  assert.match(unified, /openMobileSearchDrawer/);
  assert.equal(unified.match(/onClick=\{openEditSearch\}/g)?.length, 4);
  assert.match(unified, /aria-expanded=\{mobileSearchOpen\}/);
  assert.match(unified, /\{mobileRouteSummary\}/);
  assert.match(unified, /\{mobileTripTypeSummary\}/);
  assert.match(unified, /\{mobileDateSummary\}/);
  assert.match(unified, /\{mobileTravelerTotal\}/);
  assert.match(unified, /\{mobileCabinClassSummary\}/);
});

test("desktop search toolbar remains intact and separate from the mobile responsive row", () => {
  assert.match(source, /function renderDesktopHeaderSearchBar\(\)/);
  assert.match(source, /data-flight-results-nav-search-form/);
  assert.match(source, /readyDesktopNavbarSearch/);
  assert.match(source, /createPortal\(renderDesktopHeaderSearchBar\(\), desktopNavSearchTarget\)/);
});
