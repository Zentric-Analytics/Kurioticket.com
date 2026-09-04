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
  assert.match(screen, /<FlightSortSheet[\s\S]*?onApply=\{\(next\) => \{ cancelFlightPagination\(\); setFlightPage\(1\); setSort\(next\)/);
  assert.match(screen, /flightPage === clampedFlightPage\) return;[\s\S]*?cancelFlightPagination\(\);[\s\S]*?setFlightPage\(clampedFlightPage\)/);
});

test("Flight page controls are compact, accessible, bounded, and after cards", () => {
  assert.match(pagination, /if \(pages <= 1\) return null/);
  assert.match(pagination, /buildFlightPaginationItems\(page, pages, true\)/);
  assert.match(pagination, /Previous flight results page/);
  assert.match(pagination, /Next flight results page/);
  assert.match(pagination, /accessibilityLabel=\{`Flight results page \$\{item\}`\}/);
  assert.match(pagination, /accessibilityState=\{\{ selected: item === page, disabled \}\}/);
  assert.match(screen, /renderItem=[\s\S]*?ListFooterComponent=[\s\S]*?<FlightResultsPagination/);
  assert.match(screen, /disabled=\{flightPaginationPendingPage !== null\}/);
});

test("Flight page transition establishes a pending target and keeps the committed page while positioning", () => {
  const changePage = screen.slice(screen.indexOf("const changeFlightPage"), screen.indexOf("const handleFlightFiltersChange"));
  assert.match(changePage, /flightPaginationPendingPageRef\.current !== null \|\| nextPage === clampedFlightPage/);
  assert.match(changePage, /flightPaginationPendingPageRef\.current = nextPage;[\s\S]*setFlightPaginationPendingPage\(nextPage\)[\s\S]*setFlightPaginationPhase\("positioning"\)/);
  assert.match(changePage, /const finishPositioning[\s\S]*setFlightPaginationPhase\("committing"\);[\s\S]*setFlightPage\(nextPage\)/);
  assert.match(changePage, /flightPaginationFinishPositioning\.current = finishPositioning[\s\S]*scrollToLocation/);
  assert.match(screen, /paginateFlightResults\(sorted as FlightResult\[\], clampedFlightPage\)/);
  assert.doesNotMatch(changePage, /travelApi\.searchFlights|setRetry|router\.setParams/);
});

test("Flight pagination preserves measured list geometry without guessing card heights", () => {
  assert.match(screen, /onContentSizeChange=\{\(_width, height\) => \{ flightPaginationContentHeight\.current = height; \}\}/);
  assert.match(screen, /setFlightPaginationMinHeight\(flightPaginationContentHeight\.current \|\| null\)/);
  assert.match(screen, /flightPaginationMinHeight !== null && \{ minHeight: flightPaginationMinHeight \}/);
  assert.doesNotMatch(screen, /FLIGHT_CARD_HEIGHT|20\s*\*\s*(?:CARD|FLIGHT)|flightPaginationMinHeight[^\n]*(?:Dimensions|windowDimensions)/);
});

test("Flight pagination waits for native scroll settlement with a bounded fallback", () => {
  const changePage = screen.slice(screen.indexOf("const changeFlightPage"), screen.indexOf("const handleFlightFiltersChange"));
  assert.match(changePage, /scrollToLocation\(\{[\s\S]*?sectionIndex: 0,[\s\S]*?itemIndex: 0,[\s\S]*?viewPosition: 0,[\s\S]*?animated: true/);
  assert.doesNotMatch(changePage, /viewOffset:/);
  assert.doesNotMatch(screen, /flightFilterSectionHeight/);
  assert.match(screen, /listener: \(\) => flightPaginationScheduleSettled\.current\?\.\(\)/);
  assert.match(screen, /onMomentumScrollEnd=\{\(\) => flightPaginationFinishPositioning\.current\?\.\(\)\}/);
  assert.match(changePage, /FLIGHT_PAGINATION_SCROLL_SETTLE_MS/);
  assert.match(changePage, /FLIGHT_PAGINATION_SCROLL_FALLBACK_MS/);
  assert.doesNotMatch(changePage, /setInterval|while\s*\(/);
});

test("Flight pagination reuses the theme-aware skeleton through commit and reveal", () => {
  const transition = screen.slice(screen.indexOf("flightPaginationPendingPage !== null ?"), screen.indexOf("</Animated.View>", screen.indexOf("flightPaginationPendingPage !== null ?")));
  const changePage = screen.slice(screen.indexOf("const changeFlightPage"), screen.indexOf("const handleFlightFiltersChange"));
  assert.match(transition, /accessibilityLabel="Updating flight results"/);
  assert.match(transition, /accessibilityState=\{\{ busy: true \}\}/);
  assert.match(transition, /pointerEvents="auto"/);
  assert.match(transition, /<FlightLoadingSkeleton/);
  assert.match(changePage, /setFlightPage\(nextPage\)[\s\S]*requestAnimationFrame\(\(\) => requestAnimationFrame[\s\S]*setFlightPaginationPhase\("revealing"\)[\s\S]*Animated\.timing/);
  assert.match(changePage, /finished[\s\S]*setFlightPaginationPendingPage\(null\)[\s\S]*setFlightPaginationMinHeight\(null\)/);
  assert.match(source, /function FlightLoadingSkeleton[\s\S]*backgroundColor: theme\.surface[\s\S]*borderColor: theme\.border/);
  assert.doesNotMatch(transition, /NativeBrandedSearchLoading|Searching available/);
});

test("Flight pagination resets cancel an active transition and do not route or search", () => {
  const cancellation = screen.slice(screen.indexOf("const cancelFlightPagination"), screen.indexOf("useEffect(() => () =>", screen.indexOf("const cancelFlightPagination")));
  assert.match(cancellation, /flightPaginationTransitionRef\.current \+= 1/);
  assert.match(cancellation, /clearFlightPaginationTimers\(\)/);
  assert.match(cancellation, /setFlightPaginationPendingPage\(null\)/);
  assert.match(screen, /handleFlightFiltersChange[\s\S]*cancelFlightPagination\(\)[\s\S]*setFlightPage\(1\)/);
  assert.match(screen, /clearFlightFilters[\s\S]*cancelFlightPagination\(\)[\s\S]*setFlightPage\(1\)/);
  assert.match(screen, /onApply=\{\(next\) => \{ cancelFlightPagination\(\); setFlightPage\(1\); setSort/);
  assert.doesNotMatch(screen.slice(screen.indexOf("const changeFlightPage"), screen.indexOf("const handleFlightFiltersChange")), /searchFlights|setRetry|router\.(?:setParams|push|replace)/);
});
