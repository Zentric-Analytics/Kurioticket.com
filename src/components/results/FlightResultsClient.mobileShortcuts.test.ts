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
