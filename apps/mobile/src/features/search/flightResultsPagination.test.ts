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
  assert.match(screen, /handleFullFlightFiltersChange[\s\S]*?cancelFlightPagination\(\)[\s\S]*?setFlightPage\(1\)[\s\S]*?setFilters\(next\)/);
  assert.match(screen, /handleQuickFlightFiltersChange[\s\S]*?cancelFlightPagination\(\)[\s\S]*?setFilters\(next\)/);
  const quickFilter = screen.slice(screen.indexOf("const handleQuickFlightFiltersChange"), screen.indexOf("const clearFlightFilters"));
  assert.doesNotMatch(quickFilter, /setFlightPage/);
  assert.match(screen, /clearFlightFilters[\s\S]*?cancelFlightPagination\(\)[\s\S]*?setFlightPage\(1\)[\s\S]*?setFilters\(emptyFlightFilters\(\)\)/);
  assert.match(screen, /<FlightSortSheet[\s\S]*?onApply=\{\(next\) => \{ cancelFlightPagination\(\); setSort\(next\); setSortOpen\(false\); \}\}/);
  const sortBinding = screen.slice(screen.indexOf("<FlightSortSheet"), screen.indexOf("<FlightFilterSheet"));
  assert.doesNotMatch(sortBinding, /setFlightPage\(1\)/);
  assert.match(screen, /onChange=\{filterSection === "all" \? handleFullFlightFiltersChange : handleQuickFlightFiltersChange\}/);
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
  const changePage = screen.slice(screen.indexOf("const changeFlightPage"), screen.indexOf("const handleFullFlightFiltersChange"));
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
  const changePage = screen.slice(screen.indexOf("const changeFlightPage"), screen.indexOf("const handleFullFlightFiltersChange"));
  assert.match(changePage, /scrollToLocation\(\{[\s\S]*?sectionIndex: 0,[\s\S]*?itemIndex: 0,[\s\S]*?viewPosition: 0,[\s\S]*?animated: true/);
  assert.doesNotMatch(changePage, /viewOffset:/);
  assert.doesNotMatch(screen, /flightFilterSectionHeight/);
  assert.match(screen, /onScroll=\{\(\) => flightPaginationScheduleSettled\.current\?\.\(\)\}/);
  assert.match(screen, /onMomentumScrollEnd=\{\(\) => flightPaginationFinishPositioning\.current\?\.\(\)\}/);
  assert.match(changePage, /FLIGHT_PAGINATION_SCROLL_SETTLE_MS/);
  assert.match(changePage, /FLIGHT_PAGINATION_SCROLL_FALLBACK_MS/);
  assert.doesNotMatch(changePage, /setInterval|while\s*\(/);
});

test("Flight pagination reuses the theme-aware skeleton through commit and reveal", () => {
  const transition = screen.slice(screen.indexOf("flightPaginationPendingPage !== null ?"), screen.indexOf("</Animated.View>", screen.indexOf("flightPaginationPendingPage !== null ?")));
  const changePage = screen.slice(screen.indexOf("const changeFlightPage"), screen.indexOf("const handleFullFlightFiltersChange"));
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
  assert.match(screen, /handleFullFlightFiltersChange[\s\S]*cancelFlightPagination\(\)[\s\S]*setFlightPage\(1\)/);
  assert.match(screen, /clearFlightFilters[\s\S]*cancelFlightPagination\(\)[\s\S]*setFlightPage\(1\)/);
  assert.match(screen, /onApply=\{\(next\) => \{ cancelFlightPagination\(\); setSort/);
  assert.doesNotMatch(screen.slice(screen.indexOf("const changeFlightPage"), screen.indexOf("const handleFullFlightFiltersChange")), /searchFlights|setRetry|router\.(?:setParams|push|replace)/);
});

test("Date Strip navigation cancels pagination and resets page one without changing filter or sort values", () => {
  const selection = screen.slice(screen.indexOf("const selectNearbyDate"), screen.indexOf("const flightDateStrip ="));
  assert.match(selection, /cancelFlightPagination\(\);[\s\S]*?setFlightPage\(1\)/);
  assert.match(selection, /setSortOpen\(false\);[\s\S]*?setFilterOpen\(false\)/);
  assert.match(selection, /const expectedSearchPlan = buildSearchPlan\("flight", \{[\s\S]*?\.\.\.params,[\s\S]*?departureDate: nextDepartureDate,[\s\S]*?returnDate[\s\S]*?\}\)\.plan;[\s\S]*?pendingDateStripSelection\.current = expectedSearchPlan\?\.key \?\? null;[\s\S]*?router\.setParams/);
  assert.doesNotMatch(selection, /setSort\(|setFilters\(|emptyFlightFilters|setFlightPaginationPendingPage|setFlightPaginationPhase/);
});

test("only the matching Date Strip identity preserves preferences and its intent is consumed", () => {
  const identity = screen.slice(screen.indexOf("if (!flightResults || !plan.plan?.key) return;"), screen.indexOf("useEffect(() => {", screen.indexOf("if (!flightResults || !plan.plan?.key) return;") + 1));
  assert.match(identity, /const pendingSearchKey = pendingDateStripSelection\.current;[\s\S]*?pendingDateStripSelection\.current = null/);
  assert.match(identity, /clearTimeout\(pendingDateStripSelectionTimer\.current\)[\s\S]*?pendingDateStripSelectionTimer\.current = undefined/);
  assert.match(identity, /const pendingSearchKey = pendingDateStripSelection\.current;[\s\S]*?pendingSearchKey != null[\s\S]*?pendingSearchKey === plan\.plan\.key/);
  assert.doesNotMatch(identity, /pendingSearchKey[\s\S]*?payload\.(?:departureDate|returnDate)/);
  assert.match(identity, /cancelFlightPagination\(\);[\s\S]*?setFlightPage\(1\)/);
  assert.match(identity, /if \(!preserveDateStripPreferences\) \{[\s\S]*?setSort\("price"\);[\s\S]*?setFilters\(emptyFlightFilters\(\)\)/);
  assert.match(identity, /setSortOpen\(false\);[\s\S]*?setFilterOpen\(false\)/);
});

test("stale Date Strip intent expires instead of leaking into a later search", () => {
  const selection = screen.slice(screen.indexOf("const selectNearbyDate"), screen.indexOf("const flightDateStrip ="));
  assert.match(selection, /pendingDateStripSelectionTimer\.current = setTimeout\(\(\) => \{[\s\S]*?pendingDateStripSelection\.current = null;[\s\S]*?pendingDateStripSelectionTimer\.current = undefined;[\s\S]*?\}, 10_000\)/);
});


test("only completing the full Filter closes and scrolls to the results item geometry", () => {
  assert.match(screen, /completeFullFlightFilters[\s\S]*?setFilterOpen\(false\)[\s\S]*?scrollToFlightResultsBeginning\(\)/);
  assert.match(screen, /scrollToFlightResultsBeginning[\s\S]*?scrollToLocation\(\{ sectionIndex: 0, itemIndex: 0, viewPosition: 0, animated: true \}\)/);
  assert.match(screen, /onClose=\{\(\) => setFilterOpen\(false\)\}[\s\S]*?onComplete=\{completeFullFlightFilters\}/);
  const completion = screen.slice(screen.indexOf("const scrollToFlightResultsBeginning"), screen.indexOf("const canonicalHotelDestination"));
  assert.doesNotMatch(completion, /setFlightPaginationPendingPage|setFlightPage|travelApi\.searchFlights|setRetry/);
});
