import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const screen = source.slice(source.indexOf("export function ApprovedResultsScreen"), source.indexOf("function FlightResultsHeader"));
const pagination = source.slice(source.indexOf("function FlightResultsPagination"), source.indexOf("const hotelResultCountLabel"));

test("native Flight pagination derives a local page after filter and sort", () => {
  assert.match(screen, /const sorted = useMemo/);
  assert.match(screen, /getFlightResultsPageCount\(product === "flight" \? sorted\.length : 0\)/);
  assert.match(screen, /paginateFlightResults\(sorted as FlightResult\[\], clampedFlightPage\)/);
  assert.match(screen, /pageSize: FLIGHT_RESULTS_PAGE_SIZE/);
  assert.match(screen, /sections=\{\[\{ data: !flightState \? flightPageResults : \[\] \}\]\}/);
  assert.match(screen, /displayedResultCount: sorted\.length/);
});

test("Flight page resets are scoped to filters, clear, sort, and search identity", () => {
  assert.match(screen, /previousFlightSearchKey\.current !== plan\.plan\.key[\s\S]*?setFlightPage\(1\)/);
  assert.match(screen, /handleFlightFiltersChange[\s\S]*?setFlightPage\(1\)[\s\S]*?setFilters\(next\)/);
  assert.match(screen, /clearFlightFilters[\s\S]*?setFlightPage\(1\)[\s\S]*?setFilters\(emptyFlightFilters\(\)\)/);
  assert.match(screen, /<FlightSortSheet[\s\S]*?onApply=\{\(next\) => \{ setFlightPage\(1\); setSort\(next\)/);
  assert.match(screen, /flightPage !== clampedFlightPage\) setFlightPage\(clampedFlightPage\)/);
});

test("Flight page controls are compact, accessible, bounded, and after cards", () => {
  assert.match(pagination, /if \(pages <= 1\) return null/);
  assert.match(pagination, /buildFlightPaginationItems\(page, pages, true\)/);
  assert.match(pagination, /Previous flight results page/);
  assert.match(pagination, /Next flight results page/);
  assert.match(pagination, /accessibilityLabel=\{`Flight results page \$\{item\}`\}/);
  assert.match(pagination, /accessibilityState=\{\{ selected: item === page, disabled \}\}/);
  assert.match(screen, /renderItem=[\s\S]*?ListFooterComponent=[\s\S]*?<FlightResultsPagination/);
});

test("page changes only update local state and scroll to the first Flight card", () => {
  const changePage = screen.slice(screen.indexOf("const changeFlightPage"), screen.indexOf("const handleFlightFiltersChange"));
  assert.match(changePage, /setFlightPage\(nextPage\)/);
  assert.match(changePage, /requestAnimationFrame/);
  assert.match(changePage, /scrollToLocation\(\{ sectionIndex: 0, itemIndex: 0, viewPosition: 0 \}\)/);
  assert.doesNotMatch(changePage, /travelApi\.searchFlights|setRetry|router\.setParams/);
});
