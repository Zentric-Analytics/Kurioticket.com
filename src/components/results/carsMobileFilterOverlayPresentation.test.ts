import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cars = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
const hotels = readFileSync(new URL("./HotelResultsClient.tsx", import.meta.url), "utf8");

test("Cars full Filter follows the Hotel mobile panel hierarchy without changing desktop filters", () => {
  const start = cars.indexOf("data-cars-mobile-filter-shell");
  const end = cars.indexOf('quickFilterGroupId === "sort"', start);
  const shell = cars.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(shell, /h-\[100dvh\] w-full.*bg-\[#F6F8FB\].*sm:w-\[420px\] lg:hidden/);
  assert.match(shell, /border-b border-slate-200 bg-white/);
  assert.match(shell, /SlidersHorizontal/);
  assert.match(shell, /overflow-y-auto overflow-x-hidden overscroll-contain/);
  assert.match(shell, /border-t border-slate-200 bg-white/);
  assert.match(shell, /env\(safe-area-inset-bottom\)/);
  assert.match(cars, /desktop-filter-sidebar/);
});

test("Cars shortcuts use the Hotel quick-sheet canvas, sizing, header, scrolling and footer", () => {
  const sheets = cars.slice(cars.indexOf("data-cars-quick-sheet-backdrop"), cars.indexOf("!guidedPlanning && showBackToTop"));
  for (const contract of [
    /fixed inset-0.*items-end.*bg-slate-950\/35.*backdrop-blur-\[1px\]/,
    /max-h-\[min\(76dvh,620px\)\] w-full overflow-hidden rounded-t-\[24px\] bg-\[#F6F8FB\] shadow-2xl/,
    /border-b border-slate-200 bg-white px-4 py-3/,
    /overflow-y-auto overscroll-contain px-4 py-4/,
    /border-t border-slate-200 bg-white.*env\(safe-area-inset-bottom\)/,
  ]) assert.match(sheets, contract);
  assert.match(hotels, /max-h-\[min\(76dvh,620px\)\] w-full overflow-hidden rounded-t-\[24px\] bg-\[#F6F8FB\] shadow-2xl/);
});

test("Cars shortcut backdrop and inside-click dismissal boundaries remain explicit", () => {
  assert.equal((cars.match(/data-cars-quick-sheet-backdrop/g) ?? []).length, 2);
  assert.equal((cars.match(/onMouseDown=\{\(\) => setQuickFilterGroupId\(null\)\}/g) ?? []).length, 2);
  assert.equal((cars.match(/data-cars-quick-sheet ref=\{quickFiltersDialogRef\}[\s\S]{0,220}onMouseDown=\{\(event\) => event\.stopPropagation\(\)\}/g) ?? []).length, 2);
  assert.match(cars, /window\.addEventListener\("keydown", handleKeyDown\)/);
  assert.match(cars, /const mobileFiltersOverlayOpen = filtersOpen \|\| quickFilterGroupId !== null/);
  assert.match(cars, /const releaseScrollLock = acquireMobileResultsScrollLock\(\)/);
  assert.match(cars, /\}, \[mobileFiltersOverlayOpen\]\)/);
  assert.match(cars, /restoreOverlayLauncherFocus\(launcher, mobileFiltersModalityRef\.current\)/);
});

test("every canonical Cars shortcut shares the one stable mobile overlay lock", () => {
  assert.match(cars, /carQuickFilterGroupIds/);
  assert.match(cars, /quickFilterGroups = carQuickFilterGroupIds\.flatMap/);
  for (const group of [
    "pricePerDay",
    "vehicleType",
    "transmission",
    "seats",
    "cancellation",
    "pickupLocationType",
  ]) {
    assert.match(cars, new RegExp(`\\b${group}\\b`));
  }
  assert.equal((cars.match(/acquireMobileResultsScrollLock\(\)/g) ?? []).length, 3);
});

test("Cars-specific Sort and filter option data remain wired into shortcut sheets", () => {
  assert.match(cars, /carSortOptions\.map\(\(option\) =>/);
  assert.match(cars, /activeQuickFilterGroup\.options\.map\(\(option\) =>/);
  assert.match(cars, /toggleCarFilter\(activeQuickFilterGroup\.id, option\.id\)/);
  assert.match(cars, /typeof option\.count === "number"/);
});
