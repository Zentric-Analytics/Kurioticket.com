import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cars = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
const skeleton = readFileSync(new URL("../ui/Skeleton.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

test("Cars filter commits use a painted, cancellable covering and reveal lifecycle", () => {
  const start = cars.indexOf("const startFilterResultsTransition");
  const end = cars.indexOf("const toggleCarFilter", start);
  const transition = cars.slice(start, end);

  assert.match(transition, /getBoundingClientRect\(\)\.height/);
  assert.match(transition, /setFilterTransitionPhase\("covering"\)/);
  assert.match(transition, /requestAnimationFrame\(\(\) => \{[\s\S]*requestAnimationFrame/);
  assert.match(transition, /CARS_FILTER_MIN_BUSY_MS/);
  assert.match(transition, /setFilterTransitionPhase\("revealing"\)/);
  assert.match(transition, /setFilterTransitionPhase\("idle"\)/);
  assert.match(transition, /filterTransitionRunRef\.current !== run/);
  assert.match(transition, /cancelAnimationFrame/);
});

test("Cars filter covering preserves geometry and exposes one busy results region", () => {
  assert.match(cars, /filterTransitionMinHeight[\s\S]*\{ minHeight: filterTransitionMinHeight \}/);
  assert.match(cars, /aria-busy="true"/);
  assert.match(cars, /aria-hidden=\{filterTransitionPhase === "covering"/);
  assert.match(cars, /transitionMotion=[\s\S]*?"shimmer"/);
});

test("filtered cards and the filtered empty state share the subtle reveal", () => {
  assert.equal((cars.match(/cars-filter-results-reveal/g) ?? []).length, 2);
  assert.match(styles, /cars-filter-results-reveal 160ms ease-out/);
});

test("the mobile filter skeleton shimmer is surface-only and reduced-motion safe", () => {
  assert.match(skeleton, /transitionMotion === "shimmer" && "cars-filter-card-skeleton"/);
  assert.match(styles, /\.cars-filter-card-skeleton \.animate-pulse/);
  assert.match(styles, /cars-filter-skeleton-shimmer 720ms ease-in-out infinite/);
  assert.match(styles, /prefers-reduced-motion: reduce[\s\S]*\.cars-filter-card-skeleton \.animate-pulse/);
});

test("quick-sheet drafts are immediate and Apply owns the results commit", () => {
  const sheet = cars.slice(cars.indexOf("data-cars-quick-sheet-backdrop"), cars.indexOf("!guidedPlanning && showBackToTop"));
  assert.doesNotMatch(sheet, /setTimeout|Updating filters|disabled=/);
  assert.doesNotMatch(cars, /markQuickFilterUpdating|quickFilterFeedbackTimerRef/);
  assert.match(sheet, /onClick=\{\(\) => setQuickSortDraft\(option\.value\)\}/);
  assert.match(sheet, /onChange=\{\(\) => setQuickFilterDraft/);
  assert.match(sheet, /startFilterResultsTransition\(\); setCurrentPage\(1\)/);
  assert.match(sheet, /closeQuickFilter\(\)/);
});
