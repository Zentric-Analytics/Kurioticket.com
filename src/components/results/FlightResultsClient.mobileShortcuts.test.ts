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

test("sort sheet uses Cars row scale and stages Flight sort options until Apply", () => {
  for (const copy of ["Best balance of price and journey time", "Lowest total price", "Shortest journey time"]) assert.match(shortcuts, new RegExp(copy));
  assert.match(shortcuts, /mobileShortcutSheet === "sort" \? "Sort" : sheetTitle/);
  assert.match(shortcuts, /min-h-\[52px\][^"]*px-\[10px\] py-\[7px\]/);
  assert.match(shortcuts, /text-sm font-semibold leading-5/);
  assert.match(shortcuts, /text-\[10\.5px\] font-medium leading-\[14px\] text-slate-500/);
  assert.match(shortcuts, /h-\[17px\] w-\[17px\][^"]*text-\[#004BB8\]/);
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
  assert.match(filter, /t\("filtersWithCount"\)/);
});


test("mobile Flight filter and quick-filter colors mirror Cars", () => {
  const filter = source.slice(
    source.indexOf("function renderFloatingFilterButton"),
    source.indexOf("function renderMobileRouteSummaryCard"),
  );

  assert.match(filter, /border border-\[#D8E1EC\] bg-white[^"]*text-\[#142033\]/);
  assert.match(filter, /<SlidersHorizontal[\s\S]*className="h-4 w-4 shrink-0"/);
  assert.doesNotMatch(filter, /SlidersHorizontal[\s\S]*text-\[#004BB8\]/);

  assert.match(shortcuts, /selected \? "border-\[#075EE8\] bg-\[#EAF2FF\] text-\[#004BB8\]"/);
  assert.match(shortcuts, /"border-\[#D8E1EC\] bg-white text-\[#142033\] group-hover:bg-slate-50"/);
  assert.match(shortcuts, /rounded-full bg-\[#004BB8\][^"]*text-\[10px\] text-white/);
  assert.match(shortcuts, /renderTrigger\("airlines", "Airlines", selectedAirlines\.length\)/);
  assert.match(shortcuts, /renderTrigger\("stops", "Stops", selectedStops\.length\)/);
  assert.match(shortcuts, /renderTrigger\("airports", "Airports", selectedAirports\.length\)/);
});


test("Flight quick-filter popup mirrors Cars shell, controls, footer, and animation hooks", () => {
  assert.match(shortcuts, /data-flight-quick-sheet-backdrop/);
  assert.match(shortcuts, /z-\[10010\][^"]*items-end/);
  assert.match(shortcuts, /cars-native-quick-scrim[^"]*bg-\[rgba\(15,23,42,0\.35\)\]/);
  assert.match(shortcuts, /cars-native-quick-sheet[^"]*min-h-\[240px\][^"]*max-h-\[min\(76dvh,620px\)\]/);
  assert.match(shortcuts, /rounded-t-\[24px\][^"]*bg-\[#F2F4F8\][^"]*shadow-\[0_16px_36px_rgba\(15,23,42,0\.2\)\]/);
  assert.match(shortcuts, /grid min-h-\[76px\][^"]*grid-cols-\[44px_minmax\(0,1fr\)_44px\]/);
  assert.match(shortcuts, /text-center text-\[18px\] font-bold leading-\[23px\] text-slate-950/);
  assert.match(shortcuts, /h-\[22px\] w-\[22px\]/);
  assert.match(shortcuts, /rounded-\[4px\] border-\[1\.5px\]/);
  assert.match(shortcuts, /border-\[#004BB8\] bg-\[#004BB8\]/);
  assert.match(shortcuts, /text-\[13px\] font-medium tabular-nums text-slate-500/);
  assert.match(shortcuts, /gap-\[10px\] bg-\[#F2F4F8\]/);
  assert.match(shortcuts, /h-\[49px\] min-w-\[116px\]/);
  assert.match(shortcuts, /rounded-xl bg-\[#004BB8\][^"]*text-\[15px\] font-bold text-white/);
  assert.doesNotMatch(shortcuts, /bg-\[#075EE8\]|rounded-full border[^\n]*selected/);
});
