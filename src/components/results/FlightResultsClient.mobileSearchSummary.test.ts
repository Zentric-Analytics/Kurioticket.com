import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const cardStart = source.indexOf("function renderMobileRouteSummaryCard(");
const cardEnd = source.indexOf("function renderMobileCompactResultsHeader()", cardStart);
const card = source.slice(cardStart, cardEnd);

test("standalone Flight Results uses the Cars normal summary surface and compact scroll toolbar", () => {
  assert.match(source, /<AppHeader flushDesktopBottom flushMobileBottom hideDesktopTravelNav hideMobileCategoryTabs \/>/);
  assert.doesNotMatch(source, /mobileResultsSearch=|mobileResultsLeadingAction=|mobileResultsSticky=/);
  assert.match(source, /relative z-40 bg-white pb-0 pt-0 sm:hidden/);
  assert.match(source, /relative translate-y-1\/2/);
  assert.match(source, /ref=\{mobileSearchSummarySentinelRef\}/);
  assert.match(source, /renderMobileCompactResultsHeader/);
  assert.match(source, /data-flight-results-compact-header/);
  assert.match(source, /mobileCompactHeaderVisible/);
});

test("Flight summary matches Cars card placement, color, geometry, and typography", () => {
  assert.ok(cardStart >= 0);
  assert.match(card, /mx-auto flex w-full max-w-3xl min-w-0 items-stretch justify-center px-4/);
  assert.match(card, /h-\[4\.25rem\]/);
  assert.match(card, /max-w-\[30rem\]/);
  assert.match(card, /rounded-xl border border-slate-200\/80 bg-white px-4/);
  assert.match(card, /shadow-\[0_16px_34px_-26px_rgba\(15,23,42,0\.55\)\]/);
  assert.match(card, /text-\[16px\] font-bold[^"]*text-\[#07133B\]/);
  assert.match(card, /text-\[12\.5px\] font-medium[^"]*text-\[#536B92\]/);
  assert.match(card, /<SquarePen size=\{16\} strokeWidth=\{2\.2\} \/>/);
  assert.doesNotMatch(card, /bg-\[#f6f8fb\]|h-\[52px\]|rounded-\[10px\]/);
});

test("Flight summary remains the whole-card Edit Search launcher", () => {
  assert.match(card, /<button[\s\S]*openMobileSearchDrawer/);
  assert.match(card, /aria-haspopup="dialog"/);
  assert.match(card, /aria-expanded=\{mobileSearchOpen\}/);
  assert.match(card, /\{mobileRouteSummary\}/);
  assert.match(card, /\{mobileTripTypeSummary\} · \{mobileDateSummary\} ·/);
  assert.match(card, /\{mobileTravelerSummary\} · \{mobileCabinClassSummary\}/);
});

test("compact Flight header mirrors Cars Back, Modify search, Filters, colors, and geometry", () => {
  const start = source.indexOf("function renderMobileCompactResultsHeader()");
  const end = source.indexOf("function renderMobileEditSearchDrawer()", start);
  const compact = source.slice(start, end);

  assert.match(compact, /fixed inset-x-0 top-0 z-\[90\] bg-white px-3 pb-2/);
  assert.match(compact, /grid-cols-\[44px_minmax\(0,1fr\)_82px\]/);
  assert.match(compact, /<ArrowLeft className="h-5 w-5" aria-hidden="true" \/>/);
  assert.match(compact, /router\.push\("\/flights"\)/);
  assert.match(compact, /text-\[15px\] font-bold[^"]*text-\[#07133B\]/);
  assert.match(compact, /text-\[11px\] font-medium[^"]*text-\[#536B92\]/);
  assert.match(compact, /<Pencil[\s\S]*data-flight-compact-edit-icon/);
  assert.match(compact, /<SlidersHorizontal[\s\S]*text-\[#004BB8\]/);
  assert.match(compact, /<span className="truncate">\{t\("filters"\)\}<\/span>/);
});

test("desktop search toolbar remains isolated from the mobile Cars-style summary", () => {
  const start = source.indexOf("function renderDesktopMinimizedSearchBar()");
  const end = source.indexOf("function renderStickySearchPopoutOverlay()", start);
  assert.doesNotMatch(source.slice(start, end), /renderMobileRouteSummaryCard|h-\[4\.25rem\]/);
});
