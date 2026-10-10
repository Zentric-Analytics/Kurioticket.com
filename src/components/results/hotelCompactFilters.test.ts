import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { calculateCompactFilterMaxHeight } from "@/lib/hotels/desktopCompactFilter";

const hotelSource = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

const compactStart = hotelSource.indexOf('if (layout === "compact") {');
const compactEnd = hotelSource.indexOf("\n  return (", compactStart + 1);
const compactBranch = compactStart >= 0 && compactEnd > compactStart
  ? hotelSource.slice(compactStart, compactEnd)
  : "";

assert.ok(compactBranch, "the compact Hotel filter branch should be present");

test("compact Hotel filters use a desktop-native panel without a duplicate title", () => {
  assert.match(compactBranch, /desktop-filter-sidebar flex min-h-0 flex-1 flex-col overflow-hidden bg-white/);
  assert.match(compactBranch, /htmlFor="hotel-property-search-compact"/);
  assert.doesNotMatch(compactBranch, /desktop-filter-sidebar__title|hotelResults\.filterBy|<SlidersHorizontal/);
  assert.doesNotMatch(compactBranch, /bg-\[#EEF3F8\]|rounded-2xl/);
  assert.match(compactBranch, /min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain/);
});

test("compact Hotel active-filter controls retain their behavior", () => {
  assert.match(hotelSource, /activeFilterCount > 0/);
  assert.match(
    compactBranch,
    /value=\{propertyNameQuery\} onChange=\{\(event\) => setPropertyNameQuery\(event\.target\.value\)\}/,
  );
  assert.match(hotelSource, /onClick=\{resetFilters\}[\s\S]*?t\("clearAll"\)/);
  assert.match(compactBranch, /aria-label="Clear property search" onClick=\{\(\) => setPropertyNameQuery\(""\)\}/);
});

test("compact Hotel sections retain their order and conditional visibility", () => {
  const expectedOrder = [
    'id: "price"',
    'id: "travellerFeatures"',
    'id: "rating"',
    'id: "locations"',
    'id: "propertyTypes"',
    'id: "facilities"',
    'id: "accessibility"',
    'id: "roomTypes"',
    'id: "bedTypes"',
  ];
  let previousIndex = -1;
  for (const id of expectedOrder) {
    const index = hotelSource.indexOf(id, previousIndex + 1);
    assert.ok(index > previousIndex, `${id} should retain its section order`);
    previousIndex = index;
  }
  assert.match(hotelSource, /section\.id !== "price" \|\| hasPricedResults/);
  assert.match(hotelSource, /section\.id !== "facilities" \|\| options\.facilities\.length > 0/);
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
  assert.match(hotelSource, /hidden=\{!expanded\}/);
  assert.match(hotelSource, /aria-hidden=\{!expanded\}/);
  assert.doesNotMatch(hotelSource, /\{expanded \? \([\s\S]*?id=\{panelId\}/);
  assert.match(hotelSource, /border-t border-\[#D8E1EC\]\/75 first:border-t-0/);
  assert.match(hotelSource, /group flex min-h-9[\s\S]*?px-2\.5 py-2 text-start text-\[13px\]/);
  assert.match(hotelSource, /h-3\.5 w-3\.5[\s\S]*?expanded && "rotate-180 text-\[#004BB8\]"/);
  assert.match(hotelSource, /strokeWidth=\{2\.3\}/);
  assert.match(hotelSource, /selectedCount > 0/);
  assert.match(hotelSource, /min-w-5 rounded-full bg-\[#E2EAF3\]/);
});

test("Hotel sticky popular filters complement the full desktop panel", () => {
  assert.match(hotelSource, /ref=\{desktopFilterPanelRef\}/);
  assert.match(hotelSource, /!guided && showStickyHotelFilters/);
  assert.match(hotelSource, /<StickyHotelPopularFilters/);
  assert.equal(
    compactBranch.match(/overflow-y-auto/g)?.length,
    1,
    "the compact Hotel accordion body should be the only vertical scroll owner",
  );
  assert.match(hotelSource, /<HotelFilters layout="desktop"/);
  assert.match(hotelSource, /toggleFilter=\{toggleFilter\}/);
  assert.match(hotelSource, /toggleRating=\{toggleHotelClass\}/);
});

test("compact Hotel maximum height reserves its viewport offsets", () => {
  assert.equal(
    calculateCompactFilterMaxHeight({
      viewportHeight: 600,
      topOffset: 116,
      bottomGap: 16,
    }),
    468,
  );
});

test("compact Hotel maximum height is finite and never negative", () => {
  assert.equal(
    calculateCompactFilterMaxHeight({
      viewportHeight: 100,
      topOffset: 116,
      bottomGap: 16,
    }),
    0,
  );
  assert.equal(
    calculateCompactFilterMaxHeight({
      viewportHeight: Number.POSITIVE_INFINITY,
      topOffset: 116,
      bottomGap: 16,
    }),
    0,
  );
});
