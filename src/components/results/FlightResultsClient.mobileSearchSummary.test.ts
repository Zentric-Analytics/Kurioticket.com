import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const cardStart = source.indexOf("function renderMobileRouteSummaryCard(");
const cardEnd = source.indexOf("function renderMobileEditSearchDrawer()", cardStart);
const card = source.slice(cardStart, cardEnd);

test("standalone Flight Results hands the top summary off to a Cars-style compact toolbar", () => {
  assert.match(source, /<AppHeader[\s\S]*mobileResultsLeadingAction=\{renderMobileResultsBackButton\(\)\}[\s\S]*mobileResultsSearch=\{renderMobileRouteSummaryCard\(\)\}/);
  assert.match(source, /mobileResultsSticky=\{false\}/);
  assert.match(source, /renderMobileCompactResultsHeader/);
  assert.match(source, /data-flight-results-compact-header/);
  assert.match(source, /mobileCompactHeaderVisible/);
  assert.match(source, /mobileSearchSummarySentinelRef/);
  assert.match(source, /aria-label="Go back"/);
});

test("loading and ready Flight Results keep the same Back leading action", () => {
  const standaloneHeaderCalls = Array.from(
    source.matchAll(
      /<AppHeader[^>]*mobileResultsSearch=\{renderMobileRouteSummaryCard\(\)\}[^>]*\/>/g,
    ),
    (match) => match[0],
  );

  assert.equal(standaloneHeaderCalls.length, 2);
  for (const call of standaloneHeaderCalls) {
    assert.match(
      call,
      /mobileResultsLeadingAction=\{renderMobileResultsBackButton\(\)\}/,
    );
  }
});

test("compact Flight header mirrors Cars Back, Modify search, and Filters structure", () => {
  assert.match(source, /function renderMobileCompactResultsHeader\(\)/);
  assert.match(source, /grid-cols-\[44px_minmax\(0,1fr\)_82px\]/);
  assert.match(source, /\{mobileRouteSummary\}/);
  assert.match(source, /t\("deals\.results\.modifySearch"\)/);
  assert.match(source, /data-flight-compact-edit-icon/);
  assert.match(source, /openMobileSearchDrawer\(event\.currentTarget/);
  assert.match(source, /openMobileFiltersDrawer\(event\.currentTarget/);
  assert.match(source, /<span className="truncate">\{t\("filters"\)\}<\/span>/);
});

test("Flight Results uses a 44px Back navigation control in the AppHeader leading slot", () => {
  assert.match(source, /function renderMobileResultsBackButton\(\)/);
  assert.match(source, /aria-label="Go back"/);
  assert.match(source, /h-11 w-12/);
  assert.match(source, /<ChevronLeft className="h-5 w-5"/);
  assert.match(source, /window\.history\.length > 1[\s\S]*router\.back\(\)/);
  assert.match(source, /router\.push\("\/flights"\)/);
});

test("Flight summary is the Hotel-style whole-card Edit Search launcher", () => {
  assert.ok(cardStart >= 0);
  assert.match(card, /<button[\s\S]*openMobileSearchDrawer/);
  assert.match(card, /aria-haspopup="dialog"/);
  assert.match(card, /aria-expanded=\{mobileSearchOpen\}/);
  assert.match(card, /\{mobileRouteSummary\}/);
  assert.match(card, /\{mobileTripTypeSummary\} · \{mobileDateSummary\} ·/);
  assert.match(card, /\{mobileTravelerSummary\} · \{mobileCabinClassSummary\}/);
  assert.match(card, /<SquarePen className="h-5 w-5/);
  assert.doesNotMatch(card, /Economy|Modify search/);
});

test("Flight summary matches the Hotel results navbar geometry", () => {
  assert.match(card, /h-\[52px\]/);
  assert.match(card, /rounded-\[10px\]/);
  assert.match(card, /border-\[#D8E1EC\]/);
  assert.match(card, /bg-\[#f6f8fb\]/);
  assert.match(card, /px-3/);
  assert.match(card, /text-\[14px\] font-semibold leading-5/);
  assert.match(card, /text-\[12px\] leading-4 text-slate-600/);
  assert.doesNotMatch(card, /h-16|rounded-\[13px\]|text-\[10\.5px\]/);
});

test("desktop search toolbar remains isolated from the mobile navbar", () => {
  const start = source.indexOf("function renderDesktopMinimizedSearchBar()");
  const end = source.indexOf("function renderStickySearchPopoutOverlay()", start);
  assert.doesNotMatch(source.slice(start, end), /renderMobileRouteSummaryCard|h-\[52px\]/);
});
