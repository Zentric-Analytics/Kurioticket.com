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

test("the full mobile drawer defers its transition until changed filters become visible", () => {
  const handlers = cars.slice(
    cars.indexOf("const toggleMobileDrawerCarFilter"),
    cars.indexOf("const closeQuickFilter"),
  );
  const drawer = cars.slice(
    cars.indexOf("data-cars-mobile-filter-shell"),
    cars.indexOf("data-cars-quick-sheet-backdrop"),
  );

  assert.match(handlers, /const toggleMobileDrawerCarFilter[\s\S]*setCurrentPage\(1\)[\s\S]*setSelectedCarFilters/);
  assert.match(handlers, /const clearMobileDrawerCarFilters[\s\S]*setCurrentPage\(1\)[\s\S]*setSelectedCarFilters\(\{\}\)/);
  assert.doesNotMatch(
    handlers.slice(0, handlers.indexOf("const closeMobileFiltersDrawer")),
    /startFilterResultsTransition/,
  );
  assert.match(drawer, /onClear=\{clearMobileDrawerCarFilters\}/);
  assert.match(drawer, /onToggle=\{toggleMobileDrawerCarFilter\}/);
  assert.match(drawer, /onClick=\{clearMobileDrawerCarFilters\}/);
  assert.doesNotMatch(drawer, /onToggle=\{toggleCarFilter\}|onClick=\{clearCarFilters\}/);
});

test("every full mobile drawer exit compares its opening snapshot before closing", () => {
  const closeHandler = cars.slice(
    cars.indexOf("const closeMobileFiltersDrawer"),
    cars.indexOf("const openMobileFiltersDrawer"),
  );
  const openHandler = cars.slice(
    cars.indexOf("const openMobileFiltersDrawer"),
    cars.indexOf("const closeQuickFilter"),
  );
  const drawer = cars.slice(
    cars.indexOf("data-cars-mobile-filter-shell"),
    cars.indexOf("data-cars-quick-sheet-backdrop"),
  );

  assert.match(openHandler, /mobileFilterDrawerInitialFiltersRef\.current =[\s\S]*getSelectedCarFiltersSignature/);
  assert.match(closeHandler, /mobileFilterDrawerInitialFiltersRef\.current !==[\s\S]*getSelectedCarFiltersSignature\(selectedCarFiltersRef\.current\)/);
  assert.match(closeHandler, /if \(filtersChanged\) startFilterResultsTransition\(\);[\s\S]*setFiltersOpen\(false\)/);
  assert.equal((drawer.match(/onClick=\{closeMobileFiltersDrawer\}/g) ?? []).length, 2);
  assert.match(cars, /else closeMobileFiltersDrawer\(\)/);
  assert.match(cars, /onClick=\{closeMobileFiltersDrawer\}[\s\S]*Show \{visibleResults\.length\}/);
  assert.doesNotMatch(drawer, /onClick=\{\(\) => setFiltersOpen\(false\)\}/);
});

test("the drawer filter signature treats reordered and reverted selections as unchanged", async () => {
  const { getSelectedCarFiltersSignature } = await import("../../lib/cars/carFilterSelection");
  const opening = getSelectedCarFiltersSignature({
    vehicleType: ["suv", "small"],
    transmission: ["automatic"],
  });

  assert.equal(
    opening,
    getSelectedCarFiltersSignature({
      transmission: ["automatic"],
      vehicleType: ["small", "suv"],
    }),
  );
  assert.notEqual(opening, getSelectedCarFiltersSignature({ vehicleType: ["suv"] }));
});
