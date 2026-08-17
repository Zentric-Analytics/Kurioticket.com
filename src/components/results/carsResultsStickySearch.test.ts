import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
test("source-contract: Cars uses the full form measurement and in-place dialog", () => {
  assert.match(source, /shouldShowDesktopStickySearch/);
  assert.match(source, /new IntersectionObserver/);
  assert.match(source, /role="dialog"\s+aria-modal="true"\s+aria-labelledby="sticky-cars-search-title"/);
  assert.match(source, /focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /cars-results-full-search/);
  assert.match(source, /sticky-cars-search/);
  assert.doesNotMatch(source, /stickySentinelRef|isSearchExpandedWhileSticky|scrollIntoView/);
});

test("source-contract: sticky editor lifecycle keeps scroll locking independent from nested controls", () => {
  assert.match(source, /const desktopStickySearchOpen = desktopStickySearchSection !== null/);
  assert.match(source, /const scrollLock = lockBodyScroll\(\);[\s\S]*?scrollLock\.restore\(\);[\s\S]*?\}, \[desktopStickySearchOpen\]\);/);
  const scrollLockEffect = source.match(/useEffect\(\(\) => \{[\s\S]*?const scrollLock = lockBodyScroll\(\);[\s\S]*?\}, \[desktopStickySearchOpen\]\);/)?.[0] ?? "";
  assert.doesNotMatch(scrollLockEffect, /datesOpen|timesOpen|driverAgeOpen/);
  assert.match(source, /const frame = requestAnimationFrame[\s\S]*?desktopStickySearchRefs\.pickupInputRef[\s\S]*?cancelAnimationFrame\(frame\)[\s\S]*?\[desktopStickySearchSection, desktopStickySearchRefs\.pickupInputRef\]/);
  assert.doesNotMatch(source, /if \(!next\) setDesktopStickySearchSection\(null\)/);
});

test("source-contract: sticky editor has layered Escape handling and isolated surface refs", () => {
  assert.match(source, /if \(desktopStickySearchOpen\) return;[\s\S]*?event\.key === "Escape"/);
  assert.match(source, /if \(datesOpen \|\| timesOpen \|\| driverAgeOpen\)[\s\S]*?setDatesOpen\(false\)[\s\S]*?else closeDesktopStickySearch\(\)/);
  assert.match(source, /stickyLauncherRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /const desktopFullSearchRefs = useSearchSurfaceRefs\(\)/);
  assert.match(source, /const desktopStickySearchRefs = useSearchSurfaceRefs\(\)/);
  assert.match(source, /const mobileSearchRefs = useSearchSurfaceRefs\(\)/);
  assert.match(source, /desktopStickySearchOpen[\s\S]*?\? desktopStickySearchRefs[\s\S]*?: mobileSearchOpen[\s\S]*?\? mobileSearchRefs[\s\S]*?: desktopFullSearchRefs/);
});
