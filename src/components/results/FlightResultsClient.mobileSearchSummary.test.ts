import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const cardStart = source.indexOf("function renderMobileRouteSummaryCard(");
const cardEnd = source.indexOf("function renderMobileEditSearchDrawer()", cardStart);
const card = source.slice(cardStart, cardEnd);

test("standalone Flight Results owns one AppHeader results navbar", () => {
  assert.match(source, /<AppHeader[\s\S]*mobileResultsLeadingAction=\{renderMobileResultsBackButton\(\)\}[\s\S]*mobileResultsSearch=\{renderMobileRouteSummaryCard\(\)\}/);
  assert.doesNotMatch(source, /renderMobileCompactResultsHeader|renderMobileControlsRow/);
  assert.doesNotMatch(source, /data-flight-results-compact-header|data-flight-results-top-summary/);
  assert.doesNotMatch(source, /mobileCompactHeaderVisible|mobileSearchSummarySentinelRef/);
  assert.match(source, /aria-label="Go back"/);
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
