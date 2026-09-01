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

test("Hotel shortcuts keep Filter and Cheapest unchanged while Stars and Amenities use quick menus", () => {
  assert.match(screen, /label="Filter" count=\{activeHotelFilters \|\| undefined\} icon onPress=\{\(\) => openHotelFilters\("all"\)\}/);
  assert.doesNotMatch(screen, /openHotelFilters\("rating"\)/);
  assert.doesNotMatch(screen, /openHotelFilters\("facilities"\)/);
  assert.match(screen, /openHotelShortcutMenu\("stars", starsShortcutRef\)/);
  assert.match(screen, /openHotelShortcutMenu\("amenities", amenitiesShortcutRef\)/);
  assert.match(screen, /<HotelResultsShortcutMenu kind=\{hotelShortcutMenu\} anchor=\{hotelShortcutAnchor\} filters=\{hotelFilters\} options=\{hotelOptions\} onChange=\{setHotelFilters\}/);
  assert.doesNotMatch(screen, /openHotelFilters\("price"\)|openHotelFilters\("propertyTypes"\)/);
  assert.doesNotMatch(screen, /Filter · \$\{activeHotelFilters\}/);
  assert.match(screen, /setHotelSortOpen\(true\)/);
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
  const modal = screen.slice(screen.indexOf("function HotelSortModal"), screen.indexOf("function FlightCard"));
  assert.match(modal, /accessibilityLabel="Sort hotels"/);
  assert.match(modal, /accessibilityRole="radiogroup"/);
  assert.match(modal, /accessibilityRole="radio"/);
  assert.doesNotMatch(modal, /router\.|setParams|navigate/);
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
