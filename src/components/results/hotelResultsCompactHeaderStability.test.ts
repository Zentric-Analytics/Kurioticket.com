import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

const compactHeaderStart = source.indexOf("!guided && showMobileCompactHotelSearch");
const compactHeaderEnd = source.indexOf("!guided ? (", compactHeaderStart);
const compactHeader = source.slice(compactHeaderStart, compactHeaderEnd);

test("Hotel compact header uses an atomic scroll-driven branch", () => {
  assert.ok(compactHeader, "compact Hotel header branch must exist");
  assert.match(compactHeader, /!guided && showMobileCompactHotelSearch/);
  assert.doesNotMatch(compactHeader, /translate-y|opacity-0|transition-all/);
  assert.match(compactHeader, /mobileHotelSearchOpen && "pointer-events-none"/);
  assert.match(compactHeader, /inert=\{mobileHotelSearchOpen \? true : undefined\}/);
  assert.doesNotMatch(compactHeader, />\s*Sort\s*</);
});

test("Hotel shortcut rail stays in document flow and owns the handoff sentinel", () => {
  const shortcutsStart = source.indexOf("data-mobile-hotel-shortcuts");
  const shortcutsEnd = source.indexOf("mobileSearchSummarySentinelRef", shortcutsStart);
  const shortcutBranch = source.slice(shortcutsStart, shortcutsEnd + 100);

  assert.ok(shortcutsStart >= 0 && shortcutsEnd > shortcutsStart);
  assert.doesNotMatch(shortcutBranch, /sticky top-/);
  assert.match(shortcutBranch, /mobileSearchSummarySentinelRef/);
  assert.doesNotMatch(shortcutBranch, /trigger\("sort"|>\s*Sort\s*</);
});

test("Hotel mobile handoff updates directly in the scroll event", () => {
  const effectStart = source.indexOf('setShowMobileCompactHotelSearch(window.innerWidth < 640');
  const effectEnd = source.indexOf("}, [guided]);", effectStart);
  const handoffEffect = source.slice(effectStart, effectEnd);

  assert.match(handoffEffect, /getBoundingClientRect\(\)\.bottom <= 0/);
  assert.match(handoffEffect, /window\.addEventListener\("scroll", update/);
  assert.doesNotMatch(handoffEffect, /requestAnimationFrame|IntersectionObserver/);
});

test("opening and closing Hotel Edit Search does not reset scroll visibility", () => {
  const openHandler = source.match(
    /const openMobileHotelSearch = useCallback\([\s\S]*?\n\s+\}, \[\]\);/,
  )?.[0];
  const closeHandler = source.match(
    /const closeMobileHotelSearch = useCallback\([\s\S]*?\n\s+\}, \[\]\);/,
  )?.[0];

  assert.ok(openHandler);
  assert.ok(closeHandler);
  assert.doesNotMatch(openHandler, /setShowMobileCompactHotelSearch/);
  assert.doesNotMatch(closeHandler, /setShowMobileCompactHotelSearch/);
});
