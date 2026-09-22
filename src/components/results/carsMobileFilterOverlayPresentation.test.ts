import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cars = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

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

test("Cars shortcuts use the native floating quick-sheet presentation", () => {
  const sheets = cars.slice(cars.indexOf("data-cars-quick-sheet-backdrop"), cars.indexOf("!guidedPlanning && showBackToTop"));
  for (const contract of [
    /fixed inset-0.*items-end.*bg-\[rgba\(15,23,42,0\.35\)\]/,
    /mx-3 mb-3.*min-h-\[240px\].*max-h-\[min\(76dvh,620px\)\].*w-\[calc\(100%-24px\)\].*rounded-\[24px\].*bg-\[#F2F4F8\]/,
    /grid min-h-\[76px\].*grid-cols-\[44px_minmax\(0,1fr\)_44px\].*bg-\[#F2F4F8\].*px-\[10px\]/,
    /text-center text-\[18px\] font-bold leading-\[23px\]/,
    /<X className="h-\[22px\] w-\[22px\]"/,
    /overflow-y-auto overscroll-contain bg-\[#F2F4F8\] p-4/,
    /min-h-\[52px\].*gap-\[10px\].*px-\[10px\]/,
    /h-5 w-5.*rounded-\[4px\].*border-\[1\.5px\]/,
    /border-\[#D8DEE8\]/,
    /text-sm font-semibold leading-5/,
    /text-\[13px\] font-medium tabular-nums/,
    /h-\[49px\] min-w-\[116px\].*rounded-xl.*border.*border-\[#D8DEE8\]/,
    /h-\[49px\].*flex-1.*rounded-xl.*bg-\[#004BB8\]/,
    /gap-\[10px\] bg-\[#F2F4F8\]/,
  ]) assert.match(sheets, contract);
  assert.doesNotMatch(sheets, /backdrop-blur|bg-\[#F6F8FB\]|bg-white|Choose one option|selected<\/p>/);
  assert.match(styles, /cars-native-quick-backdrop-in[\s\S]*?opacity: 0[\s\S]*?opacity: 1/);
  assert.match(styles, /cars-native-quick-sheet-in[\s\S]*?28px[\s\S]*?translate3d\(0, 0, 0\)/);
  assert.match(styles, /cars-native-quick-backdrop-in 160ms/);
  assert.match(styles, /cars-native-quick-sheet-in 220ms/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("Cars shortcut backdrop and inside-click dismissal boundaries remain explicit", () => {
  assert.equal((cars.match(/data-cars-quick-sheet-backdrop/g) ?? []).length, 1);
  assert.match(cars, /onMouseDown=\{closeQuickFilter\}/);
  assert.match(cars, /data-cars-quick-sheet[\s\S]{0,350}onMouseDown=\{\(event\) => event\.stopPropagation\(\)\}/);
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
  assert.match(cars, /activeQuickFilterGroup!\.options\.map\(\(option\) =>/);
  assert.match(cars, /quickFilterDraft\.includes\(option\.id\)/);
  assert.match(cars, /typeof option\.count === "number"/);
  assert.match(cars, /quickSortDraft === option\.value[\s\S]*?<Check/);
  assert.match(cars, /Best overall value first/);
  assert.match(cars, /Lowest rental total first/);
  assert.match(cars, /Highest supplier rating first/);
});

test("Cars quick sheets keep changes local until Apply and discard them when closed", () => {
  assert.match(cars, /setQuickFilterDraft\(kind === "sort" \? \[\] : \[\.\.\.\(selectedCarFilters\[kind\] \?\? \[\]\)\]\)/);
  assert.match(cars, /setQuickSortDraft\(sort\)/);
  assert.match(cars, /setQuickFilterDraft\(\(current\) =>/);
  assert.match(cars, /setQuickSortDraft\(option\.value\)/);
  assert.match(cars, /if \(quickFilterGroupId === "sort"\) setSort\(quickSortDraft\)/);
  assert.match(cars, /next\[quickFilterGroupId\] = \[\.\.\.quickFilterDraft\]/);
  assert.match(cars, /onClick=\{closeQuickFilter\}/);
  assert.match(cars, /if \(quickFilterGroupId\) closeQuickFilter\(\)/);
  assert.match(cars, /setQuickSortDraft\("recommended"\)/);
  assert.match(cars, /disabled=\{quickFilterUpdating\}/);
  assert.match(cars, /Updating filters…/);
});
