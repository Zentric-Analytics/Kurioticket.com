import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const flight = readFileSync("src/features/search/FlightResultsQuickControls.tsx", "utf8");

const block = (source: string, name: string, next: string) => source.slice(source.indexOf(`${name}:`), source.indexOf(`${next}:`, source.indexOf(`${name}:`)));

test("Hotel rail keeps Filter Price Stars Facilities Room & bed without Flight business controls", () => {
  const wholeRail = screen.slice(screen.indexOf("const filterRail"), screen.indexOf("const resultContent"));
  const rail = wholeRail.slice(wholeRail.indexOf(") : ("));
  const labels = ["Filter", "Price", "Stars", "Facilities", "Room & bed"].map((label) => rail.indexOf(`label="${label}"`));
  assert.ok(labels.every((index) => index >= 0) && labels.every((index, i) => i === 0 || labels[i - 1] < index));
  assert.match(rail, /hotelOptions\.price \?/);
  assert.match(rail, /openHotelQuickFilter\("price"\)/);
  assert.match(rail, /starRatings\.length \|\| undefined/);
  assert.match(rail, /facilities\.length \|\| undefined/);
  assert.match(rail, /roomTypes\.length \|\| undefined/);
  assert.match(rail, /hotelQuickFilter === "facilities"/);
  assert.match(rail, /openHotelQuickFilter\("facilities"\)/);
  assert.match(rail, /hotelQuickFilter === "roomTypes"/);
  assert.match(rail, /openHotelQuickFilter\("roomTypes"\)/);
  assert.match(rail, /hotelOptions\.roomTypes\.length >= 2/);
  assert.doesNotMatch(rail, /label="Amenities"|openHotelQuickFilter\("amenities"\)/);
  assert.doesNotMatch(rail, /hotelSortLabel|Cheapest|Airlines|Stops|Airports/);
});

test("Hotel filter launcher stays outside the scrolling rail with compact accessible controls", () => {
 const rail=screen.slice(screen.indexOf("const filterRail"),screen.indexOf("const resultContent"));
 const hotel=rail.slice(rail.indexOf(") : ("));
 assert.ok(hotel.indexOf('label="Filter"') < hotel.indexOf('<ScrollView horizontal'));
 assert.match(screen,/hotelShortcut: \{ height: 44, minHeight: 44/);
 assert.match(screen,/hotelFilterRail: \{ height: 48, flex: 1 \}/);
 const summary=screen.slice(screen.indexOf("function HotelResultsSummaryRow"),screen.indexOf("function PriceAlert"));
 assert.match(summary,/Sort: \{hotelSortLabel\(sort\)\}/);
 assert.match(summary,/onPress=\{onSort\}/);
 assert.match(screen,/sortHotelsForResults\([\s\S]*?hotelSort,/);
 assert.match(screen,/\[hotelFilters, hotelSort, plan\.plan\?\.key, product\]/);
});

test("Hotel controls use Flight light tokens and semantic dark tokens", () => {
  const component = screen.slice(screen.indexOf("const HotelResultsShortcut"), screen.indexOf("function FlightCard"));
  for (const token of ["#D8E1EC", "#142033", "#004BB8", "#64748B", "#F8FAFC", "#FFFFFF", "rgba(0,75,184,0.08)"]) assert.match(component, new RegExp(token.replace(/[().]/g, "\\$&")));
  for (const semantic of ["theme.surface", "theme.border", "theme.textPrimary", "theme.textSecondary"]) assert.match(component, new RegExp(semantic.replace(".", "\\.")));
  assert.match(component, /#8FB5FF/);
});

test("Hotel Filter launcher has sliders without a chevron while quick filters keep rotating chevrons", () => {
  const rail = screen.slice(screen.indexOf("const filterRail"), screen.indexOf("const resultContent"));
  const component = screen.slice(screen.indexOf("const HotelResultsShortcut"), screen.indexOf("function FlightCard"));
  const shortcut = (label: string) => rail.slice(rail.indexOf(`label="${label}"`), rail.indexOf("/>", rail.indexOf(`label="${label}"`)) + 2);
  const filter = shortcut("Filter");
  assert.match(filter, /accessibilityLabel="Filters"/);
  assert.match(filter, /count=\{activeHotelFilters \|\| undefined\}/);
  assert.match(filter, /\bicon\b/);
  assert.match(filter, /showChevron=\{false\}/);
  assert.match(filter, /expanded=\{hotelFilterOpen\}/);
  assert.match(filter, /onPress=\{\(\) => openHotelFilters\("all"\)\}/);
  for (const label of ["Price", "Stars", "Facilities", "Room & bed"]) assert.doesNotMatch(shortcut(label), /showChevron=\{false\}/);
  assert.match(component, /showChevron = true/);
  assert.match(component, /<SlidersHorizontal accessible=\{false\} size=\{16\} strokeWidth=\{2\.2\}/);
  assert.match(component, /\{showChevron \? <ChevronDown accessible=\{false\} size=\{14\} strokeWidth=\{1\.9\}/);
  assert.match(component, /style=\{expanded \? s0\.hotelShortcutChevronExpanded : undefined\}/);
  assert.match(screen, /hotelShortcutChevronExpanded: \{ transform: \[\{ rotate: "180deg" \}\] \}/);
  assert.doesNotMatch(component, /ChevronRight|measureInWindow|Anchor/);
});
