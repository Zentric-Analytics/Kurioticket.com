import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const hotelSource = readFileSync(new URL("./HotelResultsClient.tsx", import.meta.url), "utf8");
const start = source.indexOf("function renderMobileSortResultsRow()");
const end = source.indexOf("function renderFloatingFilterButton", start);
const shortcuts = source.slice(start, end);
const hotelStart = hotelSource.indexOf("function renderMobileHotelShortcuts()");
const hotelEnd = hotelSource.indexOf("function renderDesktopMinimizedHotelSearchBar", hotelStart);
const hotelShortcuts = hotelSource.slice(hotelStart, hotelEnd);

test("mobile Flight rail uses the exact Hotel horizontal layout contract", () => {
  const filter = shortcuts.indexOf("renderFloatingFilterButton");
  const sort = shortcuts.indexOf('renderTrigger("sort"');
  const airlines = shortcuts.indexOf('renderTrigger("airlines"');
  const stops = shortcuts.indexOf('renderTrigger("stops"');
  const airports = shortcuts.indexOf('renderTrigger("airports"');
  assert.ok(filter >= 0 && filter < sort && sort < airlines && airlines < stops && stops < airports);

  const hotelRailClass =
    "scrollbar-hide -me-4 flex w-[calc(100%+1rem)] flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain pe-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:hidden";
  assert.ok(hotelShortcuts.includes(hotelRailClass));
  assert.ok(shortcuts.includes(hotelRailClass));
  assert.doesNotMatch(shortcuts, /mobileShortcutAxisLockRef|touch-pan-y|touch-pan-x|\bw-max\b|\bps-3\b/);
  assert.doesNotMatch(shortcuts, /\bsticky\b|top-\[calc\(/);
});

test("Flight Filter and quick-filter chips mirror Hotel geometry", () => {
  assert.match(shortcuts, /group inline-flex min-h-11 min-w-11 shrink-0 items-center/);
  assert.match(shortcuts, /inline-flex h-9 items-center gap-1 rounded-\[9px\] border px-2 text-\[13px\] font-semibold transition/);
  assert.match(shortcuts, /aria-haspopup="dialog"/);

  const filter = source.slice(
    source.indexOf("function renderFloatingFilterButton"),
    source.indexOf("function renderMobileRouteSummaryCard"),
  );
  assert.match(filter, /inline-flex h-9 items-center gap-1 rounded-\[9px\] border px-2 text-\[13px\] font-semibold transition/);
  assert.match(filter, /border-\[#142033\] bg-white text-\[#142033\]/);
  assert.match(filter, /border-\[#D8E1EC\] bg-white text-\[#142033\] group-hover:bg-slate-50/);
  assert.match(filter, /rounded-full bg-\[#F1F5F9\][^"]*text-\[10px\] font-semibold text-\[#142033\]/);
  assert.match(filter, /<span>Filter<\/span>/);
});

test("Flight selected quick filters use Hotel dark selected state and clear X", () => {
  assert.match(shortcuts, /border-\[#142033\] bg-\[#142033\] text-white/);
  assert.match(shortcuts, /selected \? "pl-2 pr-6" : "px-2"/);
  assert.match(shortcuts, /Clear .* filter/);
  assert.match(shortcuts, /absolute right-0\.5 top-1\/2[^"]*h-6 w-6[^"]*text-white/);
  assert.match(shortcuts, /<X className="h-3 w-3" strokeWidth=\{2\.1\}/);
  assert.doesNotMatch(shortcuts, /border-\[#075EE8\] bg-\[#EAF2FF\] text-\[#004BB8\]/);
});

test("Flight keeps its own filter content while using Hotel design", () => {
  assert.match(shortcuts, /label: "Best"/);
  assert.match(shortcuts, /label: "Cheapest"/);
  assert.match(shortcuts, /label: "Fastest"/);
  assert.match(shortcuts, /renderTrigger\("airlines", "Airlines", selectedAirlines\.length\)/);
  assert.match(shortcuts, /renderTrigger\("stops", "Stops", selectedStops\.length\)/);
  assert.match(shortcuts, /renderTrigger\("airports", "Airports", selectedFromAirports\.length \+ selectedToAirports\.length\)/);
  assert.match(shortcuts, />From</);
  assert.match(shortcuts, />To</);
  assert.match(shortcuts, /placeholder="Search airlines"/);
});

test("Flight quick-filter floating card mirrors Hotel shell", () => {
  assert.match(shortcuts, /fixed inset-0 z-\[10020\] flex items-end sm:hidden/);
  assert.match(shortcuts, /mobile-results-sheet-backdrop-layer[^"]*bg-\[rgba\(8,18,35,0\.52\)\]/);
  assert.match(
    shortcuts,
    /max-h-\[min\(76dvh,620px\)\] mx-3 mb-3 w-\[calc\(100%-24px\)\] overflow-hidden rounded-\[24px\] bg-\[#F2F4F8\] shadow-none mobile-results-sheet-surface mobile-results-sheet-surface-smooth/,
  );
  assert.match(shortcuts, /relative flex min-h-16 items-center justify-center bg-\[#F2F4F8\] px-16 py-3/);
  assert.match(shortcuts, /text-base font-semibold text-slate-950/);
  assert.match(shortcuts, /absolute right-3 inline-flex h-11 w-11[^"]*rounded-xl text-slate-700/);
  assert.match(shortcuts, /<X className="h-5 w-5"/);
  assert.match(shortcuts, /max-h-\[calc\(min\(76dvh,620px\)-9rem\)\][^"]*bg-\[#F2F4F8\] px-6/);
  assert.match(shortcuts, /mobileShortcutSheet === "sort" \? "space-y-1 px-10 py-6" : "space-y-2 py-4"/);
});

test("Flight quick-filter options mirror Hotel row and selected checkbox design", () => {
  assert.match(shortcuts, /min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-transparent bg-transparent px-0 text-left text-\[14px\] font-normal text-slate-800/);
  assert.match(shortcuts, /flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300/);
  assert.match(shortcuts, /<Check className="h-4 w-4 text-\[#004BB8\]"/);
  assert.match(shortcuts, /selected && "font-semibold text-\[#07133B\]"/);
  assert.match(shortcuts, /text-sm font-medium text-slate-500/);
});

test("Flight quick-filter footer mirrors Hotel Reset and Apply layout", () => {
  assert.match(shortcuts, /flex items-center justify-between gap-3 bg-\[#F2F4F8\] px-6 pb-\[calc\(0\.75rem\+env\(safe-area-inset-bottom\)\)\] pt-3/);
  assert.match(shortcuts, /h-11 w-\[32%\] shrink-0 rounded-lg border border-\[#D8DEE8\] bg-\[#F2F4F8\] px-4 text-sm font-semibold text-slate-700/);
  assert.match(shortcuts, /h-11 w-\[32%\] shrink-0 rounded-lg bg-\[#004BB8\] px-4 text-sm font-semibold text-white/);
  assert.match(shortcuts, />\s*Apply\s*<\/button>/);
  assert.doesNotMatch(shortcuts, /View \$\{draftMatches\}/);
});

test("Flight quick filters still stage and commit Flight filter state", () => {
  assert.match(shortcuts, /setMobileDraftSort\(sortMode\)/);
  assert.match(shortcuts, /setMobileDraftAirlines\(selectedAirlines\)/);
  assert.match(shortcuts, /setMobileDraftStops\(selectedStops\)/);
  assert.match(shortcuts, /setMobileDraftFromAirports\(selectedFromAirports\)/);
  assert.match(shortcuts, /setMobileDraftToAirports\(selectedToAirports\)/);
  assert.match(shortcuts, /setSelectedAirlines\(mobileDraftAirlines\)/);
  assert.match(shortcuts, /setSelectedStops\(mobileDraftStops\)/);
  assert.match(shortcuts, /setSelectedFromAirports\(mobileDraftFromAirports\)/);
  assert.match(shortcuts, /setSelectedToAirports\(mobileDraftToAirports\)/);
  assert.match(shortcuts, /if \(mobileShortcutSheet === "sort"\) setSortMode\(mobileDraftSort\)/);
});

test("Hotel-style clear X clears committed Flight quick filters", () => {
  assert.match(shortcuts, /const clearShortcutFilter/);
  assert.match(shortcuts, /if \(sheet === "airlines"\) setSelectedAirlines\(\[\]\)/);
  assert.match(shortcuts, /if \(sheet === "stops"\) setSelectedStops\(\[\]\)/);
  assert.match(shortcuts, /setSelectedFromAirports\(\[\]\)/);
  assert.match(shortcuts, /setSelectedToAirports\(\[\]\)/);
  assert.match(shortcuts, /handleUserFilterCommit\(\)/);
});

test("sheet lifecycle keeps accessibility, scroll lock, Escape and focus restoration", () => {
  assert.match(source, /acquireMobileResultsScrollLock\(\)/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /mobileShortcutLauncherRef\.current\?\.focus/);
  assert.match(source, /mobileShortcutSheetCloseRef\.current\?\.focus/);
  assert.match(shortcuts, /role="dialog"/);
  assert.match(shortcuts, /aria-modal="true"/);
});

test("full Filters launcher remains separate and retains Hotel-style active count", () => {
  const filter = source.slice(
    source.indexOf("function renderFloatingFilterButton"),
    source.indexOf("function renderMobileRouteSummaryCard"),
  );
  assert.match(filter, /openMobileFiltersDrawer\(event\.currentTarget, getOverlayActivationModality\(event\)\)/);
  assert.match(filter, /activeFilterCount > 0/);
  assert.match(filter, /rounded-full bg-\[#F1F5F9\]/);
});
