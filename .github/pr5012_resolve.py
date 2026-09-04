from pathlib import Path
import re


def sub_once(text: str, pattern: str, replacement: str, label: str) -> str:
    compiled = re.compile(pattern, re.MULTILINE)
    match = compiled.search(text)
    if not match:
        raise SystemExit(f"{label}: expected one match, found 0")
    if compiled.search(text, match.end()):
        raise SystemExit(f"{label}: expected one match, found more than one")
    return text[:match.start()] + replacement + text[match.end():]

screen_path = Path("apps/mobile/src/features/search/ApprovedResultsScreen.tsx")
screen = screen_path.read_text()
screen = sub_once(
    screen,
    r"  const handleFlightFiltersChange = useCallback\(\(next: FlightFilters\) => \{\n    cancelFlightPagination\(\);\n    setFlightPage\(1\);\n    setFilters\(next\);\n  \}, \[cancelFlightPagination\]\);",
    """  const handleFullFlightFiltersChange = useCallback((next: FlightFilters) => {
    cancelFlightPagination();
    setFlightPage(1);
    setFilters(next);
  }, [cancelFlightPagination]);
  const handleQuickFlightFiltersChange = useCallback((next: FlightFilters) => {
    cancelFlightPagination();
    setFilters(next);
  }, [cancelFlightPagination]);""",
    "split filter handlers",
)
screen = sub_once(
    screen,
    r"  const clearFlightFilters = useCallback\(\(\) => \{\n    cancelFlightPagination\(\);\n    setFlightPage\(1\);\n    setFilters\(emptyFlightFilters\(\)\);\n  \}, \[cancelFlightPagination\]\);",
    '''  const clearFlightFilters = useCallback(() => {
    cancelFlightPagination();
    setFlightPage(1);
    setFilters(emptyFlightFilters());
  }, [cancelFlightPagination]);
  const scrollToFlightResultsBeginning = useCallback(() => {
    requestAnimationFrame(() => {
      try {
        flightResultsListRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, viewPosition: 0, animated: true });
      } catch (error) {
        if (__DEV__) console.warn("[flight-results:filter-complete-scroll]", error);
        try {
          flightResultsListRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, viewPosition: 0, animated: false });
        } catch (fallbackError) {
          if (__DEV__) console.warn("[flight-results:filter-complete-scroll-fallback]", fallbackError);
        }
      }
    });
  }, []);
  const completeFullFlightFilters = useCallback(() => {
    setFilterOpen(false);
    scrollToFlightResultsBeginning();
  }, [scrollToFlightResultsBeginning]);''',
    "add completion scroll",
)
old = "      stopsActive={filters.maxStops != null}"
if screen.count(old) != 1:
    raise SystemExit(f"stops quick control: expected one match, found {screen.count(old)}")
screen = screen.replace(old, "      stopsCount={filters.stops?.length || Number(filters.maxStops != null)}", 1)
old = '<FlightSortSheet visible={sortOpen} sort={sort} onApply={(next) => { cancelFlightPagination(); setFlightPage(1); setSort(next); setSortOpen(false); }} onClose={() => setSortOpen(false)} />'
if screen.count(old) != 1:
    raise SystemExit(f"sort binding: expected one match, found {screen.count(old)}")
screen = screen.replace(old, '<FlightSortSheet visible={sortOpen} sort={sort} onApply={(next) => { cancelFlightPagination(); setSort(next); setSortOpen(false); }} onClose={() => setSortOpen(false)} />', 1)
old = "            onChange={handleFlightFiltersChange}\n            onClose={() => setFilterOpen(false)}"
if screen.count(old) != 1:
    raise SystemExit(f"filter sheet binding: expected one match, found {screen.count(old)}")
screen = screen.replace(old, '            onChange={filterSection === "all" ? handleFullFlightFiltersChange : handleQuickFlightFiltersChange}\n            onClose={() => setFilterOpen(false)}\n            onComplete={completeFullFlightFilters}', 1)
screen_path.write_text(screen)

pagination_path = Path("apps/mobile/src/features/search/flightResultsPagination.test.ts")
pagination = pagination_path.read_text()
pagination = sub_once(
    pagination,
    r'test\("Flight page resets are scoped to filters, clear, sort, and search identity", \(\) => \{[\s\S]*?\n\}\);',
    '''test("full filters and search identity reset while quick filters and sort preserve then clamp the page", () => {
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
});''',
    "replace reset behavior test",
)
pagination = pagination.replace('screen.indexOf("const handleFlightFiltersChange")', 'screen.indexOf("const handleFullFlightFiltersChange")')
pagination = pagination.replace('handleFlightFiltersChange[\\s\\S]*cancelFlightPagination\\(\\)[\\s\\S]*setFlightPage\\(1\\)', 'handleFullFlightFiltersChange[\\s\\S]*cancelFlightPagination\\(\\)[\\s\\S]*setFlightPage\\(1\\)')
pagination = pagination.replace('onApply=\\{\\(next\\) => \\{ cancelFlightPagination\\(\\); setFlightPage\\(1\\); setSort', 'onApply=\\{\\(next\\) => \\{ cancelFlightPagination\\(\\); setSort')
pagination += '''

test("only completing the full Filter closes and scrolls to the results item geometry", () => {
  assert.match(screen, /completeFullFlightFilters[\s\S]*?setFilterOpen\(false\)[\s\S]*?scrollToFlightResultsBeginning\(\)/);
  assert.match(screen, /scrollToFlightResultsBeginning[\s\S]*?scrollToLocation\(\{ sectionIndex: 0, itemIndex: 0, viewPosition: 0, animated: true \}\)/);
  assert.match(screen, /onClose=\{\(\) => setFilterOpen\(false\)\}[\s\S]*?onComplete=\{completeFullFlightFilters\}/);
  const completion = screen.slice(screen.indexOf("const scrollToFlightResultsBeginning"), screen.indexOf("const canonicalHotelDestination"));
  assert.doesNotMatch(completion, /setFlightPaginationPendingPage|setFlightPage|travelApi\.searchFlights|setRetry/);
});
'''
pagination_path.write_text(pagination)

sort_path = Path("apps/mobile/src/features/search/flightSortExperience.test.ts")
sort_test = sort_path.read_text()
sort_test = sort_test.replace('test("sort changes apply immediately like web mobile", () => {', 'test("sort changes apply immediately without resetting the current results page", () => {', 1)
old = '  assert.match(screen, /onApply=\\{\\(next\\) => \\{ cancelFlightPagination\\(\\); setFlightPage\\(1\\); setSort\\(next\\); setSortOpen\\(false\\); \\}\\}/);'
if sort_test.count(old) != 1:
    raise SystemExit(f"sort test assertion: expected one match, found {sort_test.count(old)}")
sort_test = sort_test.replace(old, '  assert.match(screen, /onApply=\\{\\(next\\) => \\{ cancelFlightPagination\\(\\); setSort\\(next\\); setSortOpen\\(false\\); \\}\\}/);\n  const sortBinding = screen.slice(screen.indexOf("<FlightSortSheet"), screen.indexOf("<FlightFilterSheet"));\n  assert.doesNotMatch(sortBinding, /setFlightPage\\(1\\)/);', 1)
sort_path.write_text(sort_test)
