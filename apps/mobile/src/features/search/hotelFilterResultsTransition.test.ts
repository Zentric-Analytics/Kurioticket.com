import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Keep this coverage Hotel-only so shared Flight and Cars timing stays unchanged.
const full = readFileSync("src/features/search/HotelFilterSheet.tsx", "utf8");
const quick = readFileSync("src/features/search/HotelResultsQuickFilterSheet.tsx", "utf8");
const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

test("Hotel filter controls no longer block local draft changes behind timed feedback", () => {
  for (const source of [full, quick]) {
    assert.doesNotMatch(source, /filterUpdating|markUpdating|NATIVE_FILTER_SELECTION_FEEDBACK_MS|Updating filters…|ActivityIndicator/);
  }
  assert.match(full, /disabled=\{matchingCount===0\}/);
  assert.match(quick, /accessibilityRole="button" onPress=\{apply\}/);
});

test("Hotel quick filters retain functional draft apply semantics", () => {
  assert.match(quick, /onChange\(current=>\{switch\(kind\)/);
  assert.match(quick, /case "facilities":return/);
  assert.match(quick, /case "roomTypes":return/);
});

test("Hotel filter Apply keeps the existing results shell mounted without a timed search loader", () => {
  assert.doesNotMatch(screen, /hotelFilterApplying|hotelFilterFeedbackTimerRef|startHotelFilterFeedback|NATIVE_FILTER_RESULTS_TRANSITION_MS/);
  assert.match(screen, /if \(status === "loading" \|\| hotelCurrencyPending\) return <NativeBrandedSearchLoading product=\{product\} \/>/);
  assert.match(screen, /const \[hotelFilterPending, startHotelFilterTransition\] = useTransition\(\)/);
  assert.match(screen, /accessibilityState=\{\{ busy: hotelFilterPending \}\}/);
  assert.match(screen, /updating=\{hotelFilterPending\}/);
  assert.match(screen, /accessibilityLabel="Updating hotel results"/);
});

test("quick Apply defers only filter derivation while dismissal stays urgent", () => {
  const apply = screen.slice(screen.indexOf("const changeHotelQuickFilters"), screen.indexOf("const transitionHotelFilters"));
  const close = screen.slice(screen.indexOf("const closeHotelQuickFilter"), screen.indexOf("const clearHotelQuickFilter"));
  assert.match(apply, /startHotelFilterTransition\(\(\) => setHotelFilters\(next\)\)/);
  assert.doesNotMatch(apply, /setHotelQuickFilter|setTimeout|travelApi|setStatus/);
  assert.match(close, /setHotelQuickFilter\(null\)/);
  assert.doesNotMatch(close, /startHotelFilterTransition|setTimeout|setStatus/);
  assert.match(screen, /onChange=\{changeHotelQuickFilters\} onClose=\{closeHotelQuickFilter\}/);
  assert.match(close, /startHotelResultsTransition\(false\)/);
});

test("successive chip clears compose against the latest queued filter state", () => {
  const clear = screen.slice(screen.indexOf("const clearHotelQuickFilter"), screen.indexOf("const handleFullFlightFiltersChange"));
  assert.match(clear, /transitionHotelFilters\(current => \{/);
  assert.match(clear, /const next = \{ \.\.\.current \}/);
  assert.match(clear, /return next/);
  assert.doesNotMatch(clear, /\.\.\.hotelFilters/);
  assert.match(screen, /const transitionHotelFilters = \(next: SetStateAction<HotelFilters>\)/);
});

test("changed Hotel Sort Apply updates ordering immediately and resets scroll position", () => {
  const sheet = screen.slice(screen.indexOf("<HotelResultsQuickFilterSheet"), screen.indexOf("/> : null", screen.indexOf("<HotelResultsQuickFilterSheet")));
  assert.match(sheet, /onSortChange=\{\(next\) => \{ if\(next===hotelSort\)return;setHotelSort\(next\);startHotelResultsTransition\(\); \}\}/);
  assert.doesNotMatch(sheet, /setHotelFilters|travelApi|setStatus|setRetry|router|load\(/);
});


test("Hotel result chrome stays vertically stable after filter Apply", () => {
  assert.doesNotMatch(screen, /contentContainerStyle=\{s0\.hotelFilterChips\}/);
  assert.match(screen, /HotelResultsShortcut label=\{hotelPriceShortcutLabel\}/);
  assert.match(screen, /HotelResultsShortcut label=\{hotelFacilitiesShortcutLabel\}/);
  assert.doesNotMatch(screen, /hotelFilterRefreshSlot|hotelFilterRefreshTrack|hotelFilterRefreshProgress/);
  assert.doesNotMatch(screen, /hotelResultsApplying|HotelCardSkeleton/);
});
