import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);

const start = source.indexOf("function renderMobileSortResultsRow()");
const end = source.indexOf("function renderFloatingFilterButton", start);
const shortcuts = source.slice(start, end);

test("mobile flight shortcuts remain an ordered single-row scroll rail", () => {
  const filter = shortcuts.indexOf("renderFloatingFilterButton");
  const sort = shortcuts.indexOf('renderTrigger(\n              "sort"');
  const airlines = shortcuts.indexOf('renderTrigger(\n              "airlines"');
  const stops = shortcuts.indexOf('renderTrigger(\n              "stops"');
  const airports = shortcuts.indexOf('renderTrigger(\n              "airports"');

  assert.ok(filter >= 0 && filter < sort && sort < airlines && airlines < stops && stops < airports);
  assert.match(shortcuts, /data-mobile-flight-shortcuts/);
  assert.match(shortcuts, /overflow-x-auto/);
  assert.match(shortcuts, /flex-nowrap/);
  assert.match(shortcuts, /w-max/);
  assert.match(shortcuts, /pe-3/);
  assert.doesNotMatch(shortcuts, /flex-wrap/);
});

test("mobile flight shortcut triggers share compact 44px chip styling", () => {
  assert.match(shortcuts, /inline-flex h-11 shrink-0/);
  assert.match(shortcuts, /whitespace-nowrap/);
  assert.match(shortcuts, /rounded-\[11px\]/);
  assert.match(shortcuts, /border-\[#D8E1EC\]/);
  assert.match(shortcuts, /bg-white/);
  assert.match(shortcuts, /text-\[14px\]/);
  assert.match(shortcuts, /<ChevronDown/);
  assert.match(shortcuts, /openMobileShortcutMenu\(menu, width, event\.currentTarget\)/);
});

test("mobile shortcut popovers share one compact production surface", () => {
  assert.equal(shortcuts.match(/const menuClass =/g)?.length, 1);
  assert.match(shortcuts, /rounded-\[13px\]/);
  assert.match(shortcuts, /border-\[#D8E1EC\]/);
  assert.match(shortcuts, /bg-white p-1\.5/);
  assert.match(shortcuts, /shadow-\[0_22px_46px_-22px_rgba\(15,23,42,0\.32\)\]/);
  assert.match(shortcuts, /const menuItemClass =\s*"[^"]*min-h-11[^"]*rounded-\[10px\][^"]*text-\[14px\]/);
});

test("shortcut menu choices retain accessible behavior and restrained selection", () => {
  assert.match(shortcuts, /role="menuitemradio"/);
  assert.match(shortcuts, /role="menuitemcheckbox"/);
  assert.match(shortcuts, /aria-checked=\{sortMode === option\.value\}/);
  assert.match(shortcuts, /aria-checked=\{selectedAirlines\.includes\(option\.value\)\}/);
  assert.match(shortcuts, /aria-checked=\{selectedStops\.includes\(option\.value\)\}/);
  assert.match(shortcuts, /aria-checked=\{selectedAirports\.includes\(option\.value\)\}/);
  assert.match(shortcuts, /bg-\[#004BB8\]\/6 text-\[#004BB8\]/);
  assert.match(shortcuts, /text-slate-700 hover:bg-slate-50/);
  assert.match(shortcuts, /<Check className="h-4 w-4 shrink-0"/);
  assert.match(shortcuts, /\{option\.count\}/);
  assert.match(shortcuts, /setSortMode\(option\.value\)/);
  assert.match(shortcuts, /toggleFilterValue\(option\.value, setSelectedAirlines\)/);
  assert.match(shortcuts, /toggleFilterValue\(option\.value, setSelectedStops\)/);
  assert.match(shortcuts, /toggleFilterValue\(option\.value, setSelectedAirports\)/);
});

test("shortcut menu placement follows its trigger and clamps to the viewport", () => {
  const positionStart = source.indexOf("const positionMobileShortcutMenu");
  const positionEnd = source.indexOf("useEffect(() =>", positionStart);
  const position = source.slice(positionStart, positionEnd);

  assert.match(shortcuts, /trigger\.getBoundingClientRect\(\)/);
  assert.match(shortcuts, /positionMobileShortcutMenu\(rect, width\)/);
  assert.match(position, /const gutter = 12/);
  assert.match(position, /Math\.min\(width, window\.innerWidth - gutter \* 2\)/);
  assert.match(position, /Math\.max\(rect\.left, gutter\)/);
  assert.match(position, /rect\.bottom \+ 8/);
});

test("mobile Filter retains its icon and existing drawer handler", () => {
  const filterStart = source.indexOf("function renderFloatingFilterButton");
  const filterEnd = source.indexOf("function renderMobileCompactResultsHeader", filterStart);
  const filter = source.slice(filterStart, filterEnd);

  assert.match(filter, /inline-flex h-11 shrink-0/);
  assert.match(filter, /whitespace-nowrap/);
  assert.match(filter, /border-\[#D8E1EC\]/);
  assert.match(filter, /bg-white/);
  assert.match(filter, /<SlidersHorizontal/);
  assert.match(filter, /openMobileFiltersDrawer\(event\.currentTarget\)/);
});
