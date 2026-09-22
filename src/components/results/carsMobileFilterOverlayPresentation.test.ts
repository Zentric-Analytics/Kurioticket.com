import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cars = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");

test("Cars full Filter follows the native Cars filter hierarchy without changing desktop filters", () => {
  const start = cars.indexOf("data-cars-mobile-filter-shell");
  const end = cars.indexOf('quickFilterGroupId === "sort"', start);
  const shell = cars.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(shell, /h-\[100dvh\] w-full.*bg-\[#F2F4F8\].*sm:w-\[420px\] lg:hidden/);
  assert.match(shell, /min-h-\[76px\].*bg-\[#F2F4F8\].*pe-\[10px\] ps-5/);
  assert.doesNotMatch(shell, /SlidersHorizontal|All cars shown|clearAll/);
  assert.match(shell, /activeFilterCount > 0[\s\S]*?activeFilterLabel[\s\S]*?: null/);
  assert.match(shell, /h-11 w-11[\s\S]*?<X className="h-\[22px\] w-\[22px\]"/);
  assert.match(shell, /overflow-y-auto overflow-x-hidden overscroll-contain/);
  assert.match(shell, /bg-\[#F2F4F8\] px-6 pb-8 pt-4/);
  assert.match(shell, /border-t border-\[#D8DEE8\] bg-\[#F2F4F8\]/);
  assert.match(shell, /max\(0\.75rem,env\(safe-area-inset-bottom\)\)/);
  assert.match(shell, /activeFilterCount > 0[\s\S]*?min-w-\[116px\][\s\S]*?carsResults\.reset/);
  assert.match(shell, /Show \{visibleResults\.length\}/);
  assert.match(cars, /desktop-filter-sidebar/);
});

test("Cars mobile filter sections remain expanded with native row and checkbox geometry", () => {
  const start = cars.indexOf('if (layout === "mobile")');
  const end = cars.indexOf("\n  return (\n    <section\n      className={cn(", start);
  const mobile = cars.slice(start, end);
  assert.match(mobile, /grid gap-\[5px\]/);
  assert.match(mobile, /min-h-7/);
  assert.match(mobile, /text-\[15px\] font-extrabold/);
  assert.match(mobile, /min-h-\[46px\].*gap-2\.5.*text-\[13px\] font-medium/);
  assert.match(mobile, /peer sr-only/);
  assert.match(mobile, /h-5 w-5 shrink-0.*border-\[1\.5px\]/);
  assert.match(mobile, /border-\[#D8DEE8\]/);
  assert.match(mobile, /<Check className="h-3\.5 w-3\.5" strokeWidth=\{3\}/);
  assert.match(mobile, /max-w-\[42%\] shrink-0 text-right text-xs leading-4 tabular-nums/);
  assert.doesNotMatch(mobile, /ChevronDown|aria-expanded|hidden=\{/);
  assert.match(cars, /layout === "mobile"\s*\? "grid gap-6 bg-transparent"/);
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
  assert.equal((cars.match(/acquireMobileResultsScrollLock\(\)/g) ?? []).length, 3);
});

test("Cars-specific Sort and filter option data remain wired into shortcut sheets", () => {
  assert.match(cars, /carSortOptions\.map\(\(option\) =>/);
  assert.match(cars, /activeQuickFilterGroup\.options\.map\(\(option\) =>/);
  assert.match(cars, /toggleCarFilter\(activeQuickFilterGroup\.id, option\.id\)/);
  assert.match(cars, /typeof option\.count === "number"/);
});
