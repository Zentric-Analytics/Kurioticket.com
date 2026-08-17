import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsSource = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);
const searchBarSource = readFileSync(
  new URL("../search/HotelSearchBar.tsx", import.meta.url),
  "utf8",
);

function stickyHotelDialogSource() {
  const start = resultsSource.indexOf(
    "function renderDesktopStickyHotelSearchDialog()",
  );
  const end = resultsSource.indexOf("if (loading)", start);

  assert.notEqual(start, -1, "sticky Hotel dialog renderer exists");
  assert.notEqual(end, -1, "loading branch follows the sticky dialog renderer");
  return resultsSource.slice(start, end);
}

test("Hotel Results connects its measurement ref to the visible search form", () => {
  assert.match(resultsSource, /desktopFormRef={setDesktopSearchFormRef}/);
  assert.match(searchBarSource, /<form[\s\S]*?ref={setSearchPanelRef}/);
  assert.match(
    resultsSource,
    /desktopSearchFormRef\.current\?\.getBoundingClientRect\(\)\.bottom/,
  );
  assert.doesNotMatch(
    resultsSource,
    /desktopSearchFrameRef\.current\?\.getBoundingClientRect\(\)\.bottom/,
  );
});

test("Hotel Results keeps observer and animation-frame fallback coordination", () => {
  assert.match(resultsSource, /new IntersectionObserver\(scheduleUpdate/);
  assert.match(resultsSource, /addEventListener\("scroll", scheduleUpdate/);
  assert.match(resultsSource, /addEventListener\("resize", scheduleUpdate/);
  assert.match(
    resultsSource,
    /requestAnimationFrame\(updateDesktopSearchState\)/,
  );
  assert.match(resultsSource, /observer\?\.disconnect\(\)/);
  assert.match(resultsSource, /cancelAnimationFrame\(animationFrame\)/);
});

test("compact Hotel filters retain the shared visibility and placement helpers", () => {
  assert.match(resultsSource, /shouldShowDesktopCompactFilter\(\{/);
  assert.match(resultsSource, /calculateCompactFilterPlacement\(\{/);
  assert.match(resultsSource, /top: desktopCompactFilterTopOffset/);
  assert.match(resultsSource, /left: desktopCompactFilterFrame\.left/);
  assert.match(resultsSource, /width: desktopCompactFilterFrame\.width/);
});

test("Hotel sticky editor source contract preserves position and reuses HotelSearchBar", () => {
  assert.doesNotMatch(resultsSource, /scrollToFullHotelSearch|scrollIntoView/);
  assert.match(resultsSource, /desktopStickyHotelSearchOpen/);
  assert.match(resultsSource, /activeDesktopStickyHotelSearchSection/);
  assert.match(
    resultsSource,
    /stickyHotelScrollLockRef\.current = lockDesktopPageScroll\(\)/,
  );
  assert.match(resultsSource, /focus\(\{ preventScroll: true \}\)/);
  assert.match(resultsSource, /role="dialog"/);
  assert.match(resultsSource, /aria-modal="true"/);
  assert.match(resultsSource, /aria-labelledby="sticky-hotel-search-title"/);
  assert.match(resultsSource, /id="sticky-hotel-search-dialog"/);
  assert.match(resultsSource, /event\.target === event\.currentTarget/);
  assert.match(
    resultsSource,
    /initialDestination=\{activeDesktopHotelSearchDraft\.destination\}/,
  );
  assert.match(resultsSource, /desktopPresentation="sticky-dialog"/);
  assert.match(
    resultsSource,
    /submitOnDesktopOpen=\{submitDesktopStickyHotelSearchOnOpen\}/,
  );
  assert.match(resultsSource, /idPrefix="sticky-hotel-search"/);
  assert.match(resultsSource, /idPrefix="hotel-results-full-search"/);

  const stickyBarStart = resultsSource.indexOf("key={`sticky-hotel-");
  const stickyBarEnd = resultsSource.indexOf("/>", stickyBarStart);
  assert.notEqual(stickyBarStart, -1);
  assert.doesNotMatch(
    resultsSource.slice(stickyBarStart, stickyBarEnd),
    /desktopFormRef/,
  );
});

test("HotelSearchBar sticky opt-in activates nested controls and namespaces IDs", () => {
  assert.match(
    searchBarSource,
    /desktopPresentation\?: "inline" \| "sticky-dialog"/,
  );
  assert.match(
    searchBarSource,
    /initialDesktopSection\?: "destination" \| "dates" \| "guests" \| null/,
  );
  assert.match(
    searchBarSource,
    /destinationInputRef\.current\?\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(searchBarSource, /setDatesOpen\(true\)/);
  assert.match(searchBarSource, /setGuestsRoomsOpen\(true\)/);
  assert.match(
    searchBarSource,
    /mobileSearchPanelRef\.current\?\.requestSubmit\(\)/,
  );
  assert.match(
    searchBarSource,
    /aria-controls=\{`\$\{idPrefix\}-destination-suggestions`\}/,
  );
  assert.match(searchBarSource, /event\.stopImmediatePropagation\(\)/);
});

test("Hotel sticky dialog source contract matches the Flights summary hierarchy", () => {
  const dialog = stickyHotelDialogSource();

  assert.match(dialog, /\{t\("searchHotels"\)\}/);
  assert.match(
    dialog,
    /className="text-xs font-bold uppercase tracking-\[0\.16em\] text-\[#004BB8\]"/,
  );
  assert.doesNotMatch(
    dialog,
    /<p className="[^"]*(?:text-navy|text-blue-|text-\[#004BB8\]\/)[^"]*">\s*\{t\("searchHotels"\)\}/,
  );
  assert.match(
    dialog,
    /activeDesktopHotelSearchDraft\.destination \|\| body\.destination/,
  );
  assert.match(
    dialog,
    /desktopMinimizedDateSummary\} · \{desktopMinimizedGuestsSummary/,
  );
  assert.match(
    dialog,
    /<h2\s+id="sticky-hotel-search-title"\s+className="mt-1 text-xl font-bold tracking-tight text-slate-950"/,
  );
  assert.match(dialog, /aria-labelledby="sticky-hotel-search-title"/);
  assert.match(dialog, /h-9 w-9/);
  assert.doesNotMatch(
    dialog,
    /<h2[\s\S]*?\{t\("editHotelSearch"\)\}[\s\S]*?<\/h2>/,
  );
});

test("HotelSearchBar sticky-dialog source contract renders a direct compact row", () => {
  assert.match(
    searchBarSource,
    /const isStickyDialog = desktopPresentation === "sticky-dialog"/,
  );
  assert.match(
    searchBarSource,
    /grid min-h-\[58px\] grid-cols-\[minmax\(0,2\.5fr\)_minmax\(0,1\.45fr\)_minmax\(0,1\.2fr\)_112px\] items-stretch gap-0 overflow-visible rounded-xl border border-slate-200\/85 bg-white\/90/,
  );
  assert.match(searchBarSource, /isStickyDialog\s*\? "p-0 shadow-none"/);
  assert.match(
    searchBarSource,
    /text-\[0\.62rem\] leading-3 tracking-\[0\.12em\] text-slate-500/,
  );
  assert.match(
    searchBarSource,
    /mt-0\.5 h-5 min-w-0 text-sm font-medium leading-5 text-slate-950/,
  );
  assert.match(
    searchBarSource,
    /h-full min-h-\[58px\] w-full rounded-none rounded-e-xl bg-\[#004BB8\]/,
  );
  assert.match(searchBarSource, /role="combobox"/);
  assert.match(searchBarSource, /handleToggleDates/);
  assert.match(searchBarSource, /handleToggleGuestsRooms/);
  assert.match(searchBarSource, /\$\{idPrefix\}-destination-suggestions/);
});

test("sticky Hotel calendar keeps both months and Done inside a non-scrolling compact popover", () => {
  assert.match(searchBarSource, /desiredHeight=\{isStickyDialog \? 360 : 420\}/);
  assert.match(searchBarSource, /isStickyDialog \? "overflow-hidden p-2" : "p-3"/);
  assert.match(searchBarSource, /isStickyDialog \? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"/);
  assert.match(searchBarSource, /isStickyDialog \? "mt-2 pt-2" : "mt-4 pt-3"/);
  assert.match(searchBarSource, /isStickyDialog \? "py-1\.5" : "py-2"/);
});

test("Hotel Results date icons stay neutral in the full and sticky search forms", () => {
  assert.match(
    searchBarSource,
    /<Calendar[^>]*className="shrink-0 text-slate-500"/,
  );
  assert.doesNotMatch(
    searchBarSource,
    /compact \? "text-\[#004BB8\]" : "text-slate-500"/,
  );
});
