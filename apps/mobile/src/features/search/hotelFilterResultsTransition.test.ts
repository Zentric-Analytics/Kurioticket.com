import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NATIVE_FILTER_RESULTS_TRANSITION_MS, NATIVE_FILTER_SELECTION_FEEDBACK_MS } from "./filterResultsTransition";

const full = readFileSync("src/features/search/HotelFilterSheet.tsx", "utf8");
const quick = readFileSync("src/features/search/HotelResultsQuickFilterSheet.tsx", "utf8");
const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

test("Hotel filter feedback uses the shared native timings", () => {
  assert.equal(NATIVE_FILTER_SELECTION_FEEDBACK_MS, 400);
  assert.equal(NATIVE_FILTER_RESULTS_TRANSITION_MS, 700);
  assert.match(full, /filterUpdating.*markUpdating/s);
  assert.match(quick, /filterUpdating.*Updating filters…/s);
});

test("Hotel quick filters retain functional draft apply semantics", () => {
  assert.match(quick, /onChange\(current=>\{switch\(kind\)/);
  assert.match(quick, /case "facilities":return/);
  assert.match(quick, /case "roomTypes":return/);
});

test("Hotel result transitions are local, accessible, and reuse skeletons", () => {
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
