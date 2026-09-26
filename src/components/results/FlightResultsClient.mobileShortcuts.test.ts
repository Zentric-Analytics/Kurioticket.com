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
  assert.doesNotMatch(shortcuts, /mobileShortcutAxisLockRef|touch-pan-y|touch-pan-x/);
  assert.match(shortcuts, /overflow-x-auto/);
  assert.match(shortcuts, /overscroll-x-contain/);
  assert.match(shortcuts, /-webkit-overflow-scrolling:touch/);
  assert.match(shortcuts, /data-mobile-flight-shortcuts[^\n]*-me-4[^\n]*w-\[calc\(100%\+1rem\)\][^\n]*flex-nowrap[^\n]*gap-1\.5[^\n]*pe-4/);
  assert.match(shortcuts, /flex-nowrap/);
  assert.doesNotMatch(shortcuts, /w-max|ps-3/);
  assert.doesNotMatch(shortcuts, /\bsticky\b|top-\[calc\(/);
});

test("mobile flight shortcut triggers preserve native-scale target and capsule geometry", () => {
  assert.match(shortcuts, /inline-flex min-h-11 min-w-11 shrink-0/);
  assert.match(shortcuts, /inline-flex h-9 items-center gap-1 rounded-\[9px\]/);
  assert.match(shortcuts, /text-\[13px\]/);
  assert.match(shortcuts, /h-3\.5 w-3\.5/);
  assert.match(shortcuts, /aria-haspopup="dialog"/);
});

test("mobile shortcut copy matches native without changing desktop copy", () => {
  assert.match(shortcuts, /label: "Best"/);
  assert.match(shortcuts, /label: "Cheapest"/);
  assert.match(shortcuts, /label: "Fastest"/);
  assert.doesNotMatch(shortcuts, /Quickest|t\("quickest"\)/);
  const filter = source.slice(source.indexOf("function renderFloatingFilterButton"), source.indexOf("function renderMobileRouteSummaryCard"));
  assert.match(filter, /<span>Filter<\/span>/);
  const desktop = source.slice(source.indexOf("function renderDesktopSortControl"), source.indexOf("function renderGuidedRetryButton"));
  assert.match(desktop, /selectedSortLabel/);
});

test("sort and quick filters open one accessible mobile bottom-sheet system", () => {
  assert.match(shortcuts, /role="dialog"/);
  assert.match(shortcuts, /aria-modal="true"/);
  assert.match(shortcuts, /rounded-\[24px\]/);
  assert.match(shortcuts, /safe-area-inset-bottom/);
  assert.doesNotMatch(shortcuts, /role="menu"|position:\s*"fixed"|mobileShortcutMenuPosition/);
  for (const kind of ["sort", "airlines", "stops", "airports"]) assert.match(shortcuts, new RegExp(`mobileShortcutSheet === "${kind}"`));
});

test("sort sheet uses Cars row scale and stages Flight sort options until Apply", () => {
  for (const copy of ["Best balance of price and journey time", "Lowest total price", "Shortest journey time"]) assert.match(shortcuts, new RegExp(copy));
  assert.match(shortcuts, /const sheetTitle = mobileShortcutSheet === "sort" \? "Sort"/);
  assert.match(shortcuts, /min-h-12 text-\[13px\] leading-\[18px\]/);
  assert.match(shortcuts, /text-xs text-slate-500/);
  assert.match(shortcuts, /h-4 w-4 text-\[#004BB8\]/);
  assert.match(shortcuts, /setMobileDraftSort\(option\.value\)/);
  assert.match(shortcuts, /if \(mobileShortcutSheet === "sort"\) setSortMode\(mobileDraftSort\)/);
  assert.match(shortcuts, /setMobileDraftSort\("best"\)/);
  assert.match(shortcuts, /\? "Apply"/);
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
  assert.match(shortcuts, /setSelectedFromAirports\(mobileDraftFromAirports\)/);
  assert.match(shortcuts, /setSelectedToAirports\(mobileDraftToAirports\)/);
  assert.match(shortcuts, />Apply<\/button>/);
});

test("sheet lifecycle traps focus, closes with Escape, locks scroll, and restores launcher focus", () => {
  assert.match(source, /acquireMobileResultsScrollLock\(\)/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /mobileShortcutLauncherRef\.current\?\.focus/);
  assert.match(source, /mobileShortcutSheetCloseRef\.current\?\.focus/);
  assert.match(shortcuts, /onMouseDown=\{\(\) => closeMobileShortcutSheet\(\)\}/);
});

test("full Filters launcher remains separate and retains its active count", () => {
  const filter = source.slice(source.indexOf("function renderFloatingFilterButton"), source.indexOf("function renderMobileRouteSummaryCard"));
  assert.match(filter, /openMobileFiltersDrawer\(event\.currentTarget, getOverlayActivationModality\(event\)\)/);
  assert.match(filter, /activeFilterCount > 0/);
  assert.match(filter, /t\("filtersWithCount"\)/);
});


test("mobile Flight filter and quick-filter colors mirror Hotel", () => {
  const filter = source.slice(
    source.indexOf("function renderFloatingFilterButton"),
    source.indexOf("function renderMobileRouteSummaryCard"),
  );

  assert.match(filter, /border-\[#142033\] bg-white text-\[#142033\]/);
  assert.match(filter, /rounded-full bg-\[#F1F5F9\][^"]*text-\[#142033\]/);
  assert.match(filter, /<SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth=\{2\.2\}/);

  assert.match(shortcuts, /selected\s*\? "border-\[#142033\] bg-\[#142033\] text-white"/);
  assert.match(shortcuts, /"border-\[#D8E1EC\] bg-white text-\[#142033\] group-hover:bg-slate-50"/);
  assert.match(shortcuts, /aria-label=\{\`Clear \$\{label\} filter\`\}/);
  assert.match(shortcuts, /<X className="h-3 w-3" strokeWidth=\{2\.1\}/);
  assert.match(shortcuts, /renderTrigger\("airlines", "Airlines", selectedAirlines\.length\)/);
  assert.match(shortcuts, /renderTrigger\("stops", "Stops", selectedStops\.length\)/);
  assert.match(shortcuts, /renderTrigger\("airports", "Airports", selectedFromAirports\.length \+ selectedToAirports\.length\)/);
});


test("Flight quick-filter popup mirrors Hotel shell, controls, footer, and animation hooks", () => {
  assert.match(shortcuts, /data-flight-quick-sheet-backdrop/);
  assert.match(shortcuts, /z-\[10020\][^"]*items-end/);
  assert.match(shortcuts, /mobile-results-sheet-backdrop-layer[^"]*bg-\[rgba\(8,18,35,0\.52\)\]/);
  assert.match(shortcuts, /max-h-\[min\(76dvh,620px\)\][^"]*mx-3 mb-3 w-\[calc\(100%-24px\)\]/);
  assert.match(shortcuts, /rounded-\[24px\] bg-\[#F2F4F8\] shadow-none mobile-results-sheet-surface mobile-results-sheet-surface-smooth/);
  assert.match(shortcuts, /relative flex min-h-16 items-center justify-center bg-\[#F2F4F8\] px-16 py-3/);
  assert.match(shortcuts, /text-base font-semibold text-slate-950/);
  assert.match(shortcuts, /h-5 w-5/);
  assert.match(shortcuts, /rounded border border-slate-300/);
  assert.match(shortcuts, /h-4 w-4 text-\[#004BB8\]/);
  assert.match(shortcuts, /gap-3 bg-\[#F2F4F8\] px-6/);
  assert.match(shortcuts, /h-11 w-\[32%\][^"]*rounded-lg/);
  assert.match(shortcuts, /rounded-lg bg-\[#004BB8\][^"]*text-sm font-semibold text-white/);
  assert.doesNotMatch(shortcuts, /bg-\[#075EE8\]|bg-\[#EAF2FF\]/);
});
