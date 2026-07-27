import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotelSource = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

const compactBranch = hotelSource.match(
  /if \(layout === "compact"\) \{([\s\S]*?)\n  return \(\n    <div\n      className=\{cn\(/,
)?.[1];

assert.ok(compactBranch, "the compact Hotel filter branch should be present");

test("compact Hotel filters use the Flights panel and header contract", () => {
  assert.match(compactBranch, /desktop-filter-sidebar flex h-auto flex-col overflow-visible rounded-2xl border border-\[#D8E1EC\] bg-\[#EEF3F8\]/);
  assert.match(compactBranch, /desktop-filter-sidebar__header shrink-0 border-b border-\[#D8E1EC\]\/80 bg-\[#EEF3F8\] px-3\.5 py-2\.5/);
  assert.match(compactBranch, /<SlidersHorizontal[\s\S]*?size=\{15\}[\s\S]*?strokeWidth=\{2\.25\}[\s\S]*?aria-hidden="true"/);
  assert.match(compactBranch, /t\("hotelResults\.filterBy"\)/);
  assert.doesNotMatch(compactBranch, /rounded-\[1\.15rem\]/);
  assert.doesNotMatch(compactBranch, /ring-slate-950/);
  assert.doesNotMatch(compactBranch, /maxHeight|overflowY|overscrollBehavior/);
});

test("compact Hotel active-filter controls retain their behavior", () => {
  assert.match(compactBranch, /activeFilterCount > 0/);
  assert.match(
    compactBranch,
    /t\("activeFilterCount"\)\.replace\(\s*"\{\{count\}\}",\s*String\(activeFilterCount\),?\s*\)/,
  );
  assert.match(compactBranch, /onClick=\{onClear\}[\s\S]*?Clear all/);
});

test("compact Hotel sections retain their order and conditional visibility", () => {
  const expectedOrder = [
    'id: "price"',
    'id: "rating"',
    'id: "locations"',
    'id: "propertyTypes"',
    'id: "roomTypes"',
    'id: "bedTypes"',
    'id: "meals"',
    'id: "cancellationPolicies"',
    'id: "facilities"',
  ];
  let previousIndex = -1;
  for (const id of expectedOrder) {
    const index = hotelSource.indexOf(id, previousIndex + 1);
    assert.ok(index > previousIndex, `${id} should retain its section order`);
    previousIndex = index;
  }
  assert.match(hotelSource, /section\.id !== "price" \|\| hasPricedResults/);
  assert.match(hotelSource, /section\.id !== "meals" \|\| options\.meals\.length > 0/);
  assert.match(hotelSource, /<PriceFilterControl/);
  assert.match(hotelSource, /<StarRatingFilterControl/);
  assert.match(hotelSource, /<CheckboxFilterOptions layout="compact"/);
});

test("compact Hotel accordion matches the Flights interaction contract", () => {
  assert.match(hotelSource, /useState<CompactHotelFilterSectionId>\(null\)/);
  assert.match(hotelSource, /current === section\.id \? null : section\.id/);
  assert.match(hotelSource, /aria-expanded=\{expanded\}/);
  assert.match(hotelSource, /aria-controls=\{panelId\}/);
  assert.match(hotelSource, /id=\{panelId\}/);
  assert.match(hotelSource, /border-t border-\[#D8E1EC\]\/75 first:border-t-0/);
  assert.match(hotelSource, /group flex min-h-9[\s\S]*?px-2\.5 py-2 text-start text-\[13px\]/);
  assert.match(hotelSource, /h-3\.5 w-3\.5[\s\S]*?expanded && "rotate-180 text-\[#004BB8\]"/);
  assert.match(hotelSource, /strokeWidth=\{2\.3\}/);
  assert.match(hotelSource, /selectedCount > 0/);
  assert.match(hotelSource, /min-w-5 rounded-full bg-\[#E2EAF3\]/);
});

test("Hotel sticky compact-filter placement contract remains intact", () => {
  assert.match(hotelSource, /desktopCompactFilterTopOffset = 116/);
  assert.match(hotelSource, /shouldShowDesktopCompactFilter\(\{/);
  assert.match(hotelSource, /calculateCompactFilterPlacement\(\{/);
  assert.match(hotelSource, /desktopCompactFilterPlacement === "fixed"/);
  assert.match(hotelSource, /desktopCompactFilterPlacement === "docked"/);
});
