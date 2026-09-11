import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NATIVE_FILTER_RESULTS_TRANSITION_MS } from "./filterResultsTransition";

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

test("Hotel result transition remains local while the parent transition is still isolated from network work", () => {
  assert.equal(NATIVE_FILTER_RESULTS_TRANSITION_MS, 700);
  const helper = screen.match(/const startHotelResultsTransition[\s\S]*?\n  };/)?.[0] ?? "";
  assert.match(screen, /hotelFilterSessionDirtyRef/);
  assert.match(screen, /accessibilityLabel="Updating hotel results"/);
  assert.match(screen, /\[0,1,2\]\.map\(x=><HotelLoadingSkeleton/);
  assert.doesNotMatch(helper, /travelApi|setStatus|setRetry|router|load\(/);
  assert.match(screen, /hotelResultsApplyingTimer\.current.*clearTimeout/s);
  assert.match(helper, /NATIVE_FILTER_RESULTS_TRANSITION_MS/);
  assert.match(screen, /transitionHotelFilters\(chip\.remove/);
  assert.match(screen, /transitionHotelFilters\(emptyHotelFilters\(\)\)/);
});

test("changed Hotel Sort Apply uses the existing local result transition", () => {
  const sheet = screen.slice(screen.indexOf("<HotelResultsQuickFilterSheet"), screen.indexOf("/> : null", screen.indexOf("<HotelResultsQuickFilterSheet")));
  assert.match(sheet, /onSortChange=\{\(next\) => \{ if\(next===hotelSort\)return;setHotelSort\(next\);startHotelResultsTransition\(\); \}\}/);
  assert.doesNotMatch(sheet, /setHotelFilters|travelApi|setStatus|setRetry|router|load\(/);
});
