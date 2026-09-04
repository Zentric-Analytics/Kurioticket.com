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

test("full filters and search identity reset while quick filters and sort preserve then clamp the page", () => {
  assert.match(screen, /previousFlightSearchKey\.current !== plan\.plan\.key[\s\S]*?setFlightPage\(1\)/);
  assert.match(screen, /handleFullFlightFiltersChange[\s\S]*?setFlightPage\(1\)[\s\S]*?setFilters\(next\)/);
  assert.match(screen, /handleQuickFlightFiltersChange[\s\S]*?setFilters\(next\)/);
  assert.doesNotMatch(screen.slice(screen.indexOf("const handleQuickFlightFiltersChange"),screen.indexOf("const clearFlightFilters")),/setFlightPage/);
  assert.match(screen, /clearFlightFilters[\s\S]*?setFlightPage\(1\)[\s\S]*?setFilters\(emptyFlightFilters\(\)\)/);
  assert.match(screen, /<FlightSortSheet[\s\S]*?onApply=\{\(next\) => \{ setSort\(next\); setSortOpen\(false\); \}\}/);
  assert.match(screen, /onChange=\{filterSection === "all" \? handleFullFlightFiltersChange : handleQuickFlightFiltersChange\}/);
  assert.match(screen, /flightPage !== clampedFlightPage\) setFlightPage\(clampedFlightPage\)/);
  assert.match(screen, /setFlightPaginationPendingPage\(null\)[\s\S]*?\}, \[clearFlightPaginationTimers, filters, plan\.plan\?\.key, sort\]\)/);
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

test("page changes show a pending skeleton and reposition before committing local state", () => {
  const changePage = screen.slice(screen.indexOf("const clearFlightPaginationTimers"), screen.indexOf("const handleFullFlightFiltersChange"));
  const request = changePage.indexOf("setFlightPaginationPendingPage(targetPage)");
  const scroll = changePage.indexOf("scrollToLocation({ sectionIndex: 0, itemIndex: 0, viewPosition: 0, animated: true })");
  const commit = changePage.indexOf("setFlightPage(targetPage)");
  const clear = changePage.indexOf("setFlightPaginationPendingPage(null)");
  assert.ok(request >= 0 && scroll > request && commit >= 0 && commit < scroll && clear > scroll);
  assert.match(changePage, /flightPaginationTargetRef\.current !== null/);
  assert.match(changePage, /setTimeout\(commitFlightPaginationTarget, 1400\)/);
  assert.match(screen, /onMomentumScrollEnd=\{commitFlightPaginationTarget\}/);
  assert.doesNotMatch(changePage.slice(changePage.indexOf("const changeFlightPage")), /travelApi\.searchFlights|setRetry|router\.(?:setParams|replace|push)/);
});

test("pending Flight pagination disables controls and reuses the themed card skeleton", () => {
  assert.match(screen, /disabled=\{flightPaginationPendingPage !== null\}/);
  assert.match(screen, /accessibilityState=\{\{ busy: flightPaginationPendingPage !== null \}\}/);
  assert.match(screen, /accessibilityLabel=\{flightPaginationPendingPage !== null \? "Loading flight results page"/);
  assert.match(screen, /flightPaginationPendingPage !== null \? <View[^>]*><FlightLoadingSkeleton \/><\/View>/);
  assert.match(screen, /flightPaginationHiddenCard/);
  assert.match(screen, /importantForAccessibility=\{flightPaginationPendingPage !== null \? "no-hide-descendants" : "auto"\}/);
  assert.equal(source.match(/function FlightLoadingSkeleton\(/g)?.length, 1);
});

test("only completing the full Filter closes and scrolls to the results item geometry", () => {
  assert.match(screen, /completeFullFlightFilters[\s\S]*?setFilterOpen\(false\)[\s\S]*?scrollToFlightResultsBeginning\(\)/);
  assert.match(screen, /scrollToFlightResultsBeginning[\s\S]*?scrollToLocation\(\{ sectionIndex: 0, itemIndex: 0, viewPosition: 0, animated: true \}\)/);
  assert.match(screen, /onClose=\{\(\) => setFilterOpen\(false\)\}[\s\S]*?onComplete=\{completeFullFlightFilters\}/);
  const completion = screen.slice(screen.indexOf("const scrollToFlightResultsBeginning"), screen.indexOf("const canonicalHotelDestination"));
  assert.doesNotMatch(completion, /setFlightPaginationPendingPage|setFlightPage|travelApi\.searchFlights|setRetry/);
});
