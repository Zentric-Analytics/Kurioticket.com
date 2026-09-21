import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const start = source.indexOf("function renderMobileSortResultsRow()");
const end = source.indexOf("function renderFloatingFilterButton", start);
const shortcuts = source.slice(start, end);

test("mobile flight shortcuts remain an ordered single-row scroll rail", () => {
  const filter = shortcuts.indexOf("renderFloatingFilterButton");
  const sort = shortcuts.indexOf('renderTrigger("sort"');
  const airlines = shortcuts.indexOf('renderTrigger("airlines"');
  const stops = shortcuts.indexOf('renderTrigger("stops"');
  const airports = shortcuts.indexOf('renderTrigger("airports"');
  assert.ok(filter >= 0 && filter < sort && sort < airlines && airlines < stops && stops < airports);
  assert.match(shortcuts, /data-mobile-flight-shortcuts/);
  assert.match(shortcuts, /overflow-x-auto/);
  assert.match(shortcuts, /flex-nowrap/);
  assert.match(shortcuts, /w-max/);
});

test("mobile flight shortcut triggers preserve native-scale target and capsule geometry", () => {
  assert.match(shortcuts, /inline-flex h-11 min-w-11 shrink-0/);
  assert.match(shortcuts, /inline-flex h-9 items-center justify-center gap-1 rounded-\[9px\]/);
  assert.match(shortcuts, /text-\[13px\][^"]*leading-4/);
  assert.match(shortcuts, /h-\[13px\] w-\[13px\]/);
  assert.match(shortcuts, /aria-haspopup="dialog"/);
});

test("mobile shortcut copy matches native without changing desktop copy", () => {
  assert.match(shortcuts, /label: "Best"/);
  assert.match(shortcuts, /label: "Cheapest"/);
  assert.match(shortcuts, /label: "Fastest"/);
  assert.doesNotMatch(shortcuts, /Quickest|t\("quickest"\)/);
  const filter = source.slice(source.indexOf("function renderFloatingFilterButton"), source.indexOf("function renderMobileRouteSummaryCard"));
  assert.match(filter, /<span>Filters<\/span>/);
  const desktop = source.slice(source.indexOf("function renderDesktopSortControl"), source.indexOf("function renderGuidedRetryButton"));
  assert.match(desktop, /selectedSortLabel/);
});

test("sort and quick filters open one accessible mobile bottom-sheet system", () => {
  assert.match(shortcuts, /role="dialog"/);
  assert.match(shortcuts, /aria-modal="true"/);
  assert.match(shortcuts, /rounded-t-\[24px\]/);
  assert.match(shortcuts, /safe-area-inset-bottom/);
  assert.doesNotMatch(shortcuts, /role="menu"|position:\s*"fixed"|mobileShortcutMenuPosition/);
  for (const kind of ["sort", "airlines", "stops", "airports"]) assert.match(shortcuts, new RegExp(`mobileShortcutSheet === "${kind}"`));
});

test("sort sheet stages native options and descriptions until Apply", () => {
  for (const copy of ["Sort flights", "Choose how results are ordered", "Best balance of price and journey time", "Lowest total price", "Shortest journey time"]) assert.match(shortcuts, new RegExp(copy));
  assert.match(shortcuts, /setMobileDraftSort\(option\.value\)/);
  assert.match(shortcuts, /if \(mobileShortcutSheet === "sort"\) setSortMode\(mobileDraftSort\)/);
  assert.match(shortcuts, /setMobileDraftSort\("best"\)/);
  assert.match(shortcuts, /\? "Apply" :/);
});

test("airlines, stops, and airports use staged native quick-sheet controls", () => {
  assert.match(shortcuts, /placeholder="Search airlines"/);
  assert.match(shortcuts, /Show less/);
  assert.match(shortcuts, /Show more/);
  assert.match(shortcuts, /fromAirportOptions/);
  assert.match(shortcuts, /toAirportOptions/);
  assert.match(shortcuts, />From</);
  assert.match(shortcuts, />To</);
  assert.match(shortcuts, /setSelectedAirlines\(mobileDraftAirlines\)/);
  assert.match(shortcuts, /setSelectedStops\(mobileDraftStops\)/);
  assert.match(shortcuts, /setSelectedAirports\(mobileDraftAirports\)/);
  assert.match(shortcuts, /View \$\{draftMatches\}/);
});

test("sheet lifecycle traps focus, closes with Escape, locks scroll, and restores launcher focus", () => {
  assert.match(source, /acquireMobileResultsScrollLock\(\)/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /mobileShortcutLauncherRef\.current\?\.focus/);
  assert.match(source, /mobileShortcutSheetCloseRef\.current\?\.focus/);
  assert.match(shortcuts, /event\.target === event\.currentTarget/);
});

test("full Filters launcher remains separate and retains its active count", () => {
  const filter = source.slice(source.indexOf("function renderFloatingFilterButton"), source.indexOf("function renderMobileRouteSummaryCard"));
  assert.match(filter, /openMobileFiltersDrawer\(event\.currentTarget, getOverlayActivationModality\(event\)\)/);
  assert.match(filter, /activeFilterCount > 0/);
  assert.match(filter, /h-5 min-w-5/);
});
