import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cars = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
const hotels = readFileSync(new URL("./HotelResultsClient.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../../lib/cars/carFilterPresentation.ts", import.meta.url), "utf8");

test("Cars full Filter follows the native Cars filter hierarchy without changing desktop filters", () => {
  const start = cars.indexOf("data-cars-mobile-filter-shell");
  const end = cars.indexOf('quickFilterGroupId === "sort"', start);
  const shell = cars.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(shell, /h-\[100dvh\] w-full.*bg-\[#F2F4F8\].*sm:w-\[420px\] lg:hidden/);
  assert.match(shell, /min-h-\[64px\].*bg-\[#F2F4F8\].*pe-\[10px\] ps-5/);
  assert.doesNotMatch(shell, /SlidersHorizontal|All cars shown|clearAll/);
  assert.match(shell, /activeFilterCount > 0[\s\S]*?activeFilterLabel[\s\S]*?: null/);
  assert.match(shell, /h-11 w-11[\s\S]*?<X className="h-\[22px\] w-\[22px\]"/);
  assert.match(shell, /overflow-y-auto overflow-x-hidden overscroll-contain/);
  assert.match(shell, /bg-\[#F2F4F8\] px-6 pb-8 pt-4/);
  assert.match(shell, /border-t border-\[#D8DEE8\] bg-\[#F2F4F8\]/);
  assert.match(shell, /max\(20px,env\(safe-area-inset-bottom\)\)/);
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

test("Cars shortcuts use the Hotels continuous overlay and sheet motion system", () => {
  const sheets = cars.slice(
    cars.indexOf("data-cars-quick-sheet-backdrop"),
    cars.indexOf("!guidedPlanning && showBackToTop"),
  );
  for (const contract of [
    /fixed inset-0.*items-end.*lg:hidden/,
    /data-cars-quick-sheet-scrim[\s\S]*?mobile-results-sheet-backdrop-layer pointer-events-none fixed inset-x-0 bottom-0 w-full bg-\[rgba\(15,23,42,0\.35\)\][\s\S]*?top: "env\(safe-area-inset-top\)"/,
    /mobile-results-sheet-surface mobile-results-sheet-surface-smooth cars-results-quick-sheet-surface relative z-10 mx-3 mb-3.*flex min-h-\[240px\].*max-h-\[min\(76dvh,620px\)\].*w-\[calc\(100%_-_24px\)\].*rounded-\[24px\].*bg-\[#F2F4F8\].*outline-none shadow-none/,
    /relative flex min-h-16.*items-center justify-center bg-\[#F2F4F8\] px-16 py-3/,
    /text-center text-base font-semibold text-slate-950/,
    /absolute right-3 inline-flex h-11 w-11.*rounded-xl text-slate-700/,
    /<X className="h-5 w-5"/,
    /overflow-y-auto overscroll-contain bg-\[#F2F4F8\] p-4/,
    /min-h-\[52px\].*gap-\[10px\].*px-\[10px\]/,
    /h-5 w-5.*rounded-\[4px\].*border-\[1\.5px\]/,
    /border-\[#D8DEE8\]/,
    /text-sm font-semibold leading-5/,
    /text-\[13px\] font-medium tabular-nums/,
    /h-\[49px\] min-w-\[116px\].*rounded-xl.*border.*border-\[#D8DEE8\]/,
    /h-\[49px\].*flex-1.*rounded-xl.*bg-\[#004BB8\]/,
    /gap-\[10px\] bg-\[#F2F4F8\]/,
    /paddingBottom: "max\(12px, calc\(env\(safe-area-inset-bottom, 0px\) - 12px\)\)"/,
  ]) assert.match(sheets, contract);

  assert.doesNotMatch(sheets, /boxShadow: "0 0 0 9999px/);
  assert.doesNotMatch(sheets, /cars-native-quick-scrim|cars-native-quick-sheet/);
  assert.match(styles, /mobile-results-sheet-surface-in[\s\S]*?translate3d\(0, 100%, 0\)[\s\S]*?translate3d\(0, 0, 0\)/);
  assert.match(styles, /\.mobile-results-sheet-surface-smooth \{ animation-duration: 320ms; \}/);
  assert.match(styles, /cars-results-quick-sheet-surface-in[\s\S]*?translate3d\(0, 28px, 0\)[\s\S]*?translate3d\(0, 0, 0\)/);
  assert.match(styles, /\.cars-results-quick-sheet-surface \{[\s\S]*?animation: cars-results-quick-sheet-surface-in 220ms/);
  assert.doesNotMatch(styles, /\.cars-results-quick-sheet-surface \{[^}]*backface-visibility/);
  assert.match(
    hotels,
    /mobile-results-sheet-backdrop-layer[\s\S]*?mobile-results-sheet-surface mobile-results-sheet-surface-smooth/,
  );
});

test("Cars edit search uses a white browser canvas and starts its isolated backdrop below the top safe area", () => {
  assert.match(
    cars,
    /appearance="carsResultsEdit"[\s\S]*?browserCanvasColor="#ffffff"[\s\S]*?freezeBodyPosition=\{false\}[\s\S]*?isolatedBackdrop[\s\S]*?backdropClassName="\[top:env\(safe-area-inset-top\)\]"/,
  );
});

test("Cars pointer-opened quick sheets avoid the blue close-button focus container", () => {
  assert.match(
    cars,
    /const shouldFocusCloseButton =\s*!quickFilterGroupId \|\| mobileFiltersModalityRef\.current === "keyboard"/,
  );
  assert.match(
    cars,
    /activeDialogRef\.current\?\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(
    cars,
    /quickFiltersCloseButtonRef[\s\S]*?focus-visible:ring-2 focus-visible:ring-\[#004BB8\]\/35/,
  );
  assert.match(
    cars,
    /data-cars-quick-sheet[\s\S]*?outline-none shadow-none/,
  );
});

test("Cars shortcut backdrop preserves the white top safe area without a giant-shadow compositing barrier", () => {
  assert.equal((cars.match(/data-cars-quick-sheet-backdrop/g) ?? []).length, 1);
  assert.match(
    cars,
    /data-cars-quick-sheet-backdrop[\s\S]*?fixed inset-0 z-\[10010\] flex items-end lg:hidden/,
  );
  assert.match(
    cars,
    /data-cars-quick-sheet-scrim[\s\S]*?fixed inset-x-0 bottom-0 w-full[\s\S]*?top: "env\(safe-area-inset-top\)"/,
  );
  assert.doesNotMatch(cars, /quickFilterBackdropMaskId|data-cars-quick-sheet-cutout|quickFilterCutoutRect|<mask/);
  assert.doesNotMatch(cars, /9999px rgba\(15, 23, 42, 0\.35\)/);
  assert.match(
    cars,
    /data-cars-quick-sheet[\s\S]{0,900}onMouseDown=\{\(event\) => event\.stopPropagation\(\)\}/,
  );
  assert.match(cars, /window\.addEventListener\("keydown", handleKeyDown\)/);
  assert.match(cars, /const mobileFiltersOverlayOpen = filtersOpen \|\| quickFilterGroupId !== null/);
  assert.match(
    cars,
    /const releaseScrollLock = acquireMobileResultsScrollLock\(\{\s*freezeBodyPosition: false,\s*\}\)/,
  );
  assert.match(cars, /restoreOverlayLauncherFocus\(launcher, mobileFiltersModalityRef\.current\)/);
});

test("every canonical Cars shortcut shares the one stable mobile overlay lock", () => {
  assert.match(cars, /carQuickFilterGroupIds/);
  assert.match(cars, /quickFilterGroups = carQuickFilterGroupIds\.flatMap/);
  for (const groupId of ["pricePerDay", "vehicleType", "transmission", "seats", "cancellation", "pickupLocationType"]) {
    assert.match(presentation, new RegExp(`"${groupId}"`));
  }
  assert.match(cars, /quickFilterGroupId === "sort" \|\| activeQuickFilterGroup/);
  assert.equal((cars.match(/data-cars-quick-sheet(?:-backdrop|-scrim)?/g) ?? []).length, 3);
  assert.equal((cars.match(/acquireMobileResultsScrollLock\(/g) ?? []).length, 3);
});

test("Cars quick sheet dims the page below the stable top safe area", () => {
  assert.match(
    cars,
    /data-cars-quick-sheet-scrim[\s\S]*?fixed inset-x-0 bottom-0 w-full bg-\[rgba\(15,23,42,0\.35\)\][\s\S]*?top: "env\(safe-area-inset-top\)"/,
  );
  assert.doesNotMatch(cars, /quickFilterCutoutRect|measureQuickFilterCutout|quickFilterBackdropMaskId|data-cars-quick-sheet-cutout|<mask/);
  assert.match(
    hotels,
    /mobile-results-sheet-backdrop-layer pointer-events-none fixed inset-0/,
  );
});

test("Cars shortcut chevrons mirror native expanded state", () => {
  assert.match(
    cars,
    /quickFilterGroupId === "sort" && "rotate-180"/,
  );
  assert.match(
    cars,
    /quickFilterGroupId === group\.id && "rotate-180"/,
  );
  assert.match(
    cars,
    /transition-transform duration-150 motion-reduce:transition-none/,
  );
  const filterButton = cars.slice(
    cars.indexOf("ref={filtersButtonRef}"),
    cars.indexOf('aria-expanded={quickFilterGroupId === "sort"}'),
  );
  assert.doesNotMatch(filterButton, /ChevronDown/);
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
  assert.match(cars, /startFilterResultsTransition\(\); setCurrentPage\(1\); if \(quickFilterGroupId === "sort"\) setSort\(quickSortDraft\)/);
  assert.match(cars, /next\[quickFilterGroupId\] = \[\.\.\.quickFilterDraft\]/);
  assert.match(cars, /onClick=\{closeQuickFilter\}/);
  assert.match(cars, /if \(quickFilterGroupId\) closeQuickFilter\(\)/);
  assert.match(cars, /setQuickSortDraft\("recommended"\)/);
  assert.doesNotMatch(cars, /quickFilterUpdating|markQuickFilterUpdating|Updating filters…/);
  assert.doesNotMatch(cars, /quickFilterFeedbackTimerRef|setTimeout\([^)]*400/);
});

test("Cars quick-sheet dismissal keeps the shared surface and backdrop mounted through exit motion", () => {
  assert.match(cars, /const \[quickFilterClosing, setQuickFilterClosing\] = useState\(false\)/);
  assert.match(cars, /quickFilterClosingRef = useRef\(false\)/);
  assert.match(cars, /setQuickFilterClosing\(true\)/);
  assert.match(cars, /window\.setTimeout\(\s*finishQuickFilterClose,\s*340,/);
  assert.match(
    cars,
    /quickFilterClosing &&\s*"mobile-results-sheet-backdrop-layer-closing"/,
  );
  assert.match(
    cars,
    /quickFilterClosing && "mobile-results-sheet-surface-closing"/,
  );
  assert.match(cars, /onAnimationEnd=\{\(event\) =>/);
  assert.match(cars, /finishQuickFilterClose\(\)/);
  assert.match(styles, /mobile-results-sheet-backdrop-layer-closing[\s\S]*?280ms ease-out/);
  assert.match(styles, /mobile-results-sheet-surface-closing[\s\S]*?280ms cubic-bezier/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});


test("Cars mobile filter overlays avoid duplicate top safe-area padding and keep footer actions above browser chrome", () => {
  const fullStart = cars.indexOf("data-cars-mobile-filter-shell");
  const fullEnd = cars.indexOf('quickFilterGroupId === "sort"', fullStart);
  const full = cars.slice(fullStart, fullEnd);
  assert.doesNotMatch(full, /pt-\[env\(safe-area-inset-top\)\]/);
  assert.match(full, /min-h-\[64px\]/);
  assert.match(full, /pb-\[max\(20px,env\(safe-area-inset-bottom\)\)\]/);

  const quickStart = cars.indexOf("data-cars-quick-sheet-backdrop");
  const quickEnd = cars.indexOf("!guidedPlanning && showBackToTop", quickStart);
  const quick = cars.slice(quickStart, quickEnd);
  assert.match(quick, /min-h-\[64px\]/);
  assert.match(
    quick,
    /paddingBottom: "max\(12px, calc\(env\(safe-area-inset-bottom, 0px\) - 12px\)\)"/,
  );
  assert.match(quick, /mx-3 mb-3/);
  assert.match(quick, /w-\[calc\(100%_-_24px\)\]/);
  assert.match(quick, /rounded-\[24px\]/);
});
