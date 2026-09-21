import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);

const cardStart = source.indexOf("function renderMobileRouteSummaryCard(");
const cardEnd = source.indexOf("function renderMobileCompactResultsHeader()", cardStart);
const card = source.slice(cardStart, cardEnd);
const normalStart = source.indexOf("function renderMobileControlsRow()");
const normalEnd = source.indexOf("function renderDesktopSortControl()", normalStart);
const normalSummary = source.slice(normalStart, normalEnd);
const stickyStart = source.indexOf("function renderMobileCompactResultsHeader()");
const stickyEnd = source.indexOf("function renderMobileControlsRow()", stickyStart);
const stickySummary = source.slice(stickyStart, stickyEnd);

test("mobile search summary remains the compact whole-card Edit Search launcher", () => {
  assert.ok(cardStart >= 0);
  assert.match(
    card,
    /<button[\s\S]*onClick=\{\(event\) => openMobileSearchDrawer\(event\.currentTarget, getOverlayActivationModality\(event\)\)\}/,
  );
  assert.match(card, /\{mobileRouteSummary\}/);
  assert.match(card, /\{mobileTripTypeSummary\} · \{mobileDateSummary\} ·/);
  assert.match(
    card,
    /\{mobileTravelerSummary\} · \{mobileCabinClassSummary\}/,
  );
  assert.match(
    source,
    /const mobileCabinClassSummary = cabinClassLabel\(cabinClassInput, t\);/,
  );
  assert.doesNotMatch(card, /Economy/);
  assert.match(card, /<SquarePen size=\{16\} strokeWidth=\{2\.2\} \/>/);
  assert.match(normalSummary, /renderMobileRouteSummaryCard\("normal"\)/);
  assert.match(stickySummary, /renderMobileRouteSummaryCard\("sticky"\)/);
});

test("mobile search summary matches native typography without shrinking the card", () => {
  assert.match(card, /h-16/);
  assert.match(card, /rounded-\[13px\]/);
  assert.match(card, /border-\[#D8E1EC\]/);
  assert.match(card, /bg-white/);
  assert.match(card, /px-4 py-0/);
  assert.match(card, /shadow-\[0_6px_18px_-16px_rgba\(15,23,42,0\.32\)\]/);
  assert.match(card, /truncate text-\[14px\] font-bold leading-\[18px\]/);
  assert.match(
    card,
    /mt-\[3px\] block truncate text-\[10\.5px\] font-medium leading-\[14px\] text-slate-600/,
  );
  assert.match(
    card,
    /h-11 w-11[\s\S]*rounded-\[10px\][\s\S]*border-transparent bg-transparent text-slate-700/,
  );
  assert.doesNotMatch(card, /text-\[16px\]|text-\[12\.5px\]|font-semibold leading-\[17px\]/);
  assert.doesNotMatch(card, /border-\[#D8E1EC\] bg-slate-50 text-slate-700/);
  assert.doesNotMatch(card, /gradient|inset_/i);
});

test("full Edit Search controls are not duplicated into the compact summary", () => {
  assert.doesNotMatch(
    card,
    /renderMobileAirportField|MobileAirportPicker|MobileDatePicker|handleMobileSearchSubmit/,
  );
});

test("sticky mobile header keeps back navigation and replaces the miniature toolbar with the full summary card", () => {
  assert.match(stickySummary, /<ArrowLeft className="h-5 w-5" aria-hidden="true" \/>/);
  assert.match(stickySummary, /aria-label="Go back"/);
  assert.match(stickySummary, /onClick=\{handleMobileResultsBack\}/);
  assert.match(stickySummary, /renderMobileRouteSummaryCard\("sticky"\)/);
  assert.doesNotMatch(stickySummary, /Modify search|routeLabel|data-flight-compact-edit-icon/);
  assert.doesNotMatch(stickySummary, /<SlidersHorizontal|openMobileFiltersDrawer|>Filter</);
});

test("normal mobile filter shortcut remains available outside the sticky header", () => {
  const filterStart = source.indexOf("function renderFloatingFilterButton");
  const filterEnd = source.indexOf("function renderMobileRouteSummaryCard", filterStart);
  const filter = source.slice(filterStart, filterEnd);

  assert.match(filter, /<SlidersHorizontal/);
  assert.match(filter, /<span>Filters<\/span>/);
  assert.match(filter, /openMobileFiltersDrawer\(event\.currentTarget, getOverlayActivationModality\(event\)\)/);
});

test("initial mobile header exposes a separate accessible Back control before scrolling", () => {
  assert.match(normalSummary, /aria-label="Go back"/);
  assert.match(normalSummary, /onClick=\{handleMobileResultsBack\}/);
  assert.match(normalSummary, /renderMobileRouteSummaryCard\("normal"\)/);
  assert.match(source, /window\.history\.length > 1[\s\S]*router\.back\(\)[\s\S]*router\.push\("\/flights"\)/);
});

test("desktop search toolbar stays isolated from the mobile card typography", () => {
  const desktopStart = source.indexOf("function renderDesktopMinimizedSearchBar()");
  const desktopEnd = source.indexOf("function renderStickySearchPopoutOverlay()", desktopStart);
  const desktopToolbar = source.slice(desktopStart, desktopEnd);

  assert.doesNotMatch(desktopToolbar, /renderMobileRouteSummaryCard|text-\[10\.5px\]|leading-\[18px\]/);
});
