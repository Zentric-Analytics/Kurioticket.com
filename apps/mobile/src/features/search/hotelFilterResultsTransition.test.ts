import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NATIVE_FILTER_RESULTS_TRANSITION_MS } from "./filterResultsTransition";

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

test("Hotel result changes keep cards mounted and use compact page-loading progress", () => {
  assert.equal(NATIVE_FILTER_RESULTS_TRANSITION_MS, 700);
  const helper = screen.match(/const startHotelResultsTransition[\s\S]*?\n  };/)?.[0] ?? "";
  const feedback = screen.match(/const startHotelFilterFeedback[\s\S]*?\n  }, \[hotelFilterProgress\]\);/)?.[0] ?? "";
  assert.match(screen, /hotelFilterSessionDirtyRef/);
  assert.match(feedback, /setHotelFilterApplying\(true\)/);
  assert.match(feedback, /Animated\.timing\(hotelFilterProgress/);
  assert.match(feedback, /duration: NATIVE_FILTER_RESULTS_TRANSITION_MS/);
  assert.match(feedback, /setHotelFilterApplying\(false\)/);
  assert.match(helper, /setHotelPage\(1\)/);
  assert.match(helper, /scrollToHotelResultsBeginning\(\)/);
  assert.match(helper, /startHotelFilterFeedback\(\)/);
  assert.doesNotMatch(helper, /travelApi|setStatus|setRetry|router|load\(/);
  assert.match(screen, /transitionHotelFilters\(emptyHotelFilters\(\)\)/);
  assert.match(screen, /accessibilityLabel="Updating hotel results"/);
  assert.match(screen, /backgroundColor: "rgba\(0,75,184,0\.10\)"/);
  assert.match(screen, /backgroundColor: "#2B8FCB"/);
});

test("changed Hotel Sort Apply updates ordering immediately and resets pagination", () => {
  const sheet = screen.slice(screen.indexOf("<HotelResultsQuickFilterSheet"), screen.indexOf("/> : null", screen.indexOf("<HotelResultsQuickFilterSheet")));
  assert.match(sheet, /onSortChange=\{\(next\) => \{ if\(next===hotelSort\)return;setHotelSort\(next\);startHotelResultsTransition\(\); \}\}/);
  assert.doesNotMatch(sheet, /setHotelFilters|travelApi|setStatus|setRetry|router|load\(/);
});


test("Hotel result chrome stays vertically stable after filter Apply", () => {
  assert.doesNotMatch(screen, /contentContainerStyle=\{s0\.hotelFilterChips\}/);
  assert.match(screen, /HotelResultsShortcut label=\{hotelPriceShortcutLabel\}/);
  assert.match(screen, /HotelResultsShortcut label=\{hotelFacilitiesShortcutLabel\}/);
  assert.match(screen, /hotelFilterRefreshSlot: \{ height: 5/);
  assert.doesNotMatch(screen, /hotelResultsApplying|HotelCardSkeleton/);
});
