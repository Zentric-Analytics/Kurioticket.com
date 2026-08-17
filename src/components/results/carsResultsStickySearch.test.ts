import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
test("source-contract: Cars uses the full form measurement and in-place dialog", () => {
  assert.match(source, /shouldShowDesktopStickySearch/);
  assert.match(source, /new IntersectionObserver/);
  assert.match(
    source,
    /role="dialog"\s+aria-modal="true"\s+aria-labelledby="sticky-cars-search-title"/,
  );
  assert.match(source, /focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /cars-results-full-search/);
  assert.match(source, /sticky-cars-search/);
  assert.doesNotMatch(
    source,
    /stickySentinelRef|isSearchExpandedWhileSticky|scrollIntoView/,
  );
});

test("source-contract: sticky editor lifecycle keeps scroll locking independent from nested controls", () => {
  assert.match(
    source,
    /const desktopStickySearchOpen = desktopStickySearchSection !== null/,
  );
  assert.match(
    source,
    /const scrollLock = lockDesktopPageScroll\(\);[\s\S]*?scrollLock\.restore\(\);[\s\S]*?\}, \[desktopStickySearchOpen\]\);/,
  );
  const scrollLockEffect =
    source.match(
      /useEffect\(\(\) => \{[\s\S]*?const scrollLock = lockDesktopPageScroll\(\);[\s\S]*?\}, \[desktopStickySearchOpen\]\);/,
    )?.[0] ?? "";
  assert.doesNotMatch(scrollLockEffect, /datesOpen|timesOpen|driverAgeOpen/);
  assert.match(
    source,
    /const frame = requestAnimationFrame[\s\S]*?stickyDialogRef\.current\?\.focus\(\{ preventScroll: true \}\)[\s\S]*?cancelAnimationFrame\(frame\)[\s\S]*?\[desktopStickySearchSection\]/,
  );
  assert.doesNotMatch(
    source,
    /if \(!next\) setDesktopStickySearchSection\(null\)/,
  );
});

test("source-contract: sticky editor opens with nested controls closed and focuses the dialog", () => {
  const openHelper =
    source.match(
      /const openDesktopStickySearch = useCallback\([\s\S]*?\r?\n  \);/,
    )?.[0] ?? "";
  assert.match(openHelper, /setOpenLocation\(null\)/);
  assert.match(openHelper, /setDatesOpen\(false\)/);
  assert.match(openHelper, /setTimesOpen\(false\)/);
  assert.match(openHelper, /setDriverAgeOpen\(false\)/);
  assert.match(openHelper, /setDesktopStickySearchSection\(section\)/);
  assert.doesNotMatch(
    openHelper,
    /setDatesOpen\(true\)|setTimesOpen\(true\)|setDriverAgeOpen\(true\)/,
  );

  const initialFocusEffect =
    source.match(
      /useEffect\(\(\) => \{\r?\n    if \(!desktopStickySearchSection\)[\s\S]*?\r?\n  \}, \[desktopStickySearchSection\]\);/,
    )?.[0] ?? "";
  assert.match(
    initialFocusEffect,
    /stickyDialogRef\.current\?\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.doesNotMatch(
    initialFocusEffect,
    /setDatesOpen\(true\)|setTimesOpen\(true\)|setDriverAgeOpen\(true\)|pickupInputRef/,
  );
  assert.match(
    source,
    /aria-labelledby="sticky-cars-search-title"\s+tabIndex=\{-1\}/,
  );
});

test("source-contract: explicit picker toggles remain mutually exclusive", () => {
  assert.match(
    source,
    /setDatesOpen\(\(current\) => !current\);\s+setOpenLocation\(null\);\s+setTimesOpen\(false\);\s+setDriverAgeOpen\(false\)/,
  );
  assert.match(
    source,
    /setTimesOpen\(\(current\) => !current\);\s+setOpenLocation\(null\);\s+setDatesOpen\(false\);\s+setDriverAgeOpen\(false\)/,
  );
  assert.match(
    source,
    /setDriverAgeOpen\(\(current\) => !current\);\s+setOpenLocation\(null\);\s+setDatesOpen\(false\);\s+setTimesOpen\(false\)/,
  );
});

test("source-contract: sticky editor has layered Escape handling and isolated surface refs", () => {
  assert.match(
    source,
    /if \(desktopStickySearchOpen\) return;[\s\S]*?event\.key === "Escape"/,
  );
  assert.match(
    source,
    /if \(datesOpen \|\| timesOpen \|\| driverAgeOpen\)[\s\S]*?setDatesOpen\(false\)[\s\S]*?else closeDesktopStickySearch\(\)/,
  );
  assert.match(
    source,
    /stickyLauncherRef\.current\?\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(
    source,
    /const desktopFullSearchRefs = useSearchSurfaceRefs\(\)/,
  );
  assert.match(
    source,
    /const desktopStickySearchRefs = useSearchSurfaceRefs\(\)/,
  );
  assert.match(source, /const mobileSearchRefs = useSearchSurfaceRefs\(\)/);
  assert.match(
    source,
    /desktopStickySearchOpen[\s\S]*?\? desktopStickySearchRefs[\s\S]*?: mobileSearchOpen[\s\S]*?\? mobileSearchRefs[\s\S]*?: desktopFullSearchRefs/,
  );
});

test("source-contract: expanded sticky editor uses the Flights-style floating shell", () => {
  assert.match(
    source,
    /fixed inset-0 z-\[1100\] hidden bg-slate-950\/30 backdrop-blur-\[2px\] lg:block/,
  );
  assert.match(
    source,
    /flex min-h-dvh items-start justify-center px-6 pb-10 pt-24 xl:pt-28/,
  );
  assert.match(
    source,
    /w-full rounded-2xl border border-slate-200\/90 bg-\[#fbfaf7\]\/95 p-4 text-start shadow-\[0_30px_90px_-32px_rgba\(15,23,42,0\.72\)\] ring-1 ring-white\/80 backdrop-blur-md/,
  );
  assert.match(
    source,
    /returnToDifferentLocation \? "max-w-5xl" : "max-w-4xl"/,
  );
  assert.doesNotMatch(source, /max-w-6xl rounded-2xl bg-white p-5 shadow-2xl/);
  assert.match(
    source,
    /mb-4 flex items-start justify-between gap-4 border-b border-slate-200\/80 pb-3/,
  );
  assert.match(source, /aria-label=\{t\("carsResults\.closeEditSearch"\)\}/);
  assert.match(
    source,
    /h-9 w-9 shrink-0[\s\S]*?border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950/,
  );
  assert.match(source, /\{renderCarsSearchForm\("desktop-sticky"\)\}/);
});

test("source-contract: sticky controls form one restrained segmented row", () => {
  assert.match(
    source,
    /isCompactSearch[\s\S]*?"rounded-xl border-slate-200\/85 bg-white\/90 p-0 shadow-\[0_14px_34px_-28px_rgba\(15,23,42,0\.64\)\]"/,
  );
  assert.doesNotMatch(source, /isCompactSearch \? "p-1" : "p-1\.5"/);
});
