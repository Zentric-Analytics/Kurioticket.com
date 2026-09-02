import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const sheet = readFileSync("src/features/search/HotelFilterSheet.tsx", "utf8");

test("Hotel shortcut rail has the web order and derives active labels from filter state", () => {
  const filter = screen.indexOf('<HotelResultsShortcut label="Filter"');
  const sort = screen.indexOf("hotelSortLabel(hotelSort)", filter);
  const stars = screen.indexOf('hotelFilters.starRating ? `${hotelFilters.starRating}', sort);
  const amenities = screen.indexOf('hotelFilters.facilities.length ? `Amenities', stars);
  assert.ok(filter >= 0 && filter < sort && sort < stars && stars < amenities);
  assert.match(screen, /defaultHotelSort/);
  assert.match(screen, /hotelFilters\.starRating === 1 \? "star" : "stars"/);
  assert.match(screen, /hotelFilters\.facilities\.length/);
});

test("Hotel shortcuts keep Filter full-screen while Sort, Stars, and Amenities use quick menus", () => {
  assert.match(screen, /label="Filter" count=\{activeHotelFilters \|\| undefined\} icon onPress=\{\(\) => openHotelFilters\("all"\)\}/);
  assert.match(screen, /sortShortcutRef = useRef<View>\(null\)/);
  assert.match(screen, /ref=\{sortShortcutRef\}[\s\S]*expanded=\{hotelShortcutMenu === "sort"\}[\s\S]*openHotelShortcutMenu\("sort", sortShortcutRef\)/);
  assert.doesNotMatch(screen, /openHotelFilters\("rating"\)/);
  assert.doesNotMatch(screen, /openHotelFilters\("facilities"\)/);
  assert.match(screen, /openHotelShortcutMenu\("stars", starsShortcutRef\)/);
  assert.match(screen, /openHotelShortcutMenu\("amenities", amenitiesShortcutRef\)/);
  assert.match(screen, /<HotelResultsShortcutMenu kind="sort" anchor=\{hotelShortcutAnchor\} sort=\{hotelSort\} onSortChange=\{setHotelSort\}/);
  assert.match(screen, /<HotelResultsShortcutMenu kind=\{hotelShortcutMenu\} anchor=\{hotelShortcutAnchor\} filters=\{hotelFilters\} options=\{hotelOptions\} onChange=\{setHotelFilters\}/);
  assert.doesNotMatch(screen, /openHotelFilters\("price"\)|openHotelFilters\("propertyTypes"\)/);
  assert.doesNotMatch(screen, /Filter · \$\{activeHotelFilters\}/);
  assert.doesNotMatch(screen, /setHotelSortOpen\(true\)|hotelSortOpen/);
});

test("Hotel-only visual controls use sliders, count badge, and down chevrons", () => {
  assert.match(screen, /SlidersHorizontal/);
  assert.match(screen, /ChevronDown/);
  assert.match(screen, /hotelShortcutCount/);
  assert.match(screen, /`Filter, \$\{count\} active filters`/);
});

test("Hotel sort selector has exactly the three web modes and no navigation", () => {
  const model = readFileSync("src/features/search/hotelSort.ts", "utf8");
  assert.deepEqual([...model.matchAll(/label: "(Cheapest|Best value|Top rated)"/g)].map((match) => match[1]), ["Cheapest", "Best value", "Top rated"]);
  const menu = readFileSync("src/features/search/HotelResultsShortcutMenu.tsx", "utf8");
  const sortBranch = menu.slice(menu.indexOf('kind === "sort" ? hotelSortOptions.map'), menu.indexOf('}) : kind === "stars"'));
  assert.match(sortBranch, /accessibilityRole="radio"/);
  assert.doesNotMatch(sortBranch, /router\.|setParams|navigate|description/);
  assert.doesNotMatch(screen, /function HotelSortModal|<HotelSortModal/);
  assert.match(screen, /function FlightSortModal|<FlightSortModal/);
});

test("Price and Property Type remain in the full Filter sheet and facilities is focusable", () => {
  for (const label of ["BUDGET / PRICE", "PROPERTY TYPE", "FACILITIES"]) assert.ok(sheet.includes(label));
  assert.match(sheet, /HotelFilterSectionName = [^;]+\| "facilities"/);
  assert.match(sheet, /onLayout=\{anchor\(group\)\}/);
});

test("obsolete Hotel shortcut wording is absent from the rail implementation", () => {
  const rail = screen.slice(screen.indexOf("const filterRail"), screen.indexOf("const resultContent"));
  for (const oldLabel of ['"Price"', '"Star rating"', '"Property type"', "Sort: Recommended", "Sort: Price"]) assert.equal(rail.includes(oldLabel), false, oldLabel);
});
