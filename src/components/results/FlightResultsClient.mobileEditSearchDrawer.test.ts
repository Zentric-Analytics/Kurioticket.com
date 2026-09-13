import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");

test("standard mobile filters unmount when closed and wire existing focus management", () => {
  const start = source.lastIndexOf('{filtersOpen ? <aside');
  assert.ok(start > 0);
  const drawer = source.slice(start, source.indexOf('</aside> : null}', start));
  assert.match(drawer, /ref=\{mobileFiltersDialogRef\}/);
  assert.match(drawer, /ref=\{mobileFiltersCloseButtonRef\}/);
  assert.doesNotMatch(drawer, /translate-y-full/);
});
test("Results delegates mobile Edit Search to the shared drawer", () => {
  assert.match(source, /import \{ FlightEditSearchDrawer/);
  assert.match(source, /<FlightEditSearchDrawer/);
  assert.match(source, /open=\{mobileSearchOpen\}/);
  assert.match(source, /<FlightEditSearchDrawer[\s\S]*?presentation="bottom-sheet"/);
  assert.match(source, /router\.push\(`\/flights\/results\?/);
});

test("Results launcher avoids Android tap flash while retaining focus-visible", () => {
  const start = source.indexOf("function renderMobileControlsRow");
  const end = source.indexOf("function renderDesktopSortControl", start);
  const launcher = source.slice(start, end);
  assert.match(launcher, /\[-webkit-tap-highlight-color:transparent\]/);
  assert.match(launcher, /focus-visible:ring-2 focus-visible:ring-\[#004BB8\]\/35/);
  assert.doesNotMatch(launcher, /group-active:bg-slate-200/);
});

test("Results parent leaves Edit Search scroll locking to the drawer", () => {
  assert.doesNotMatch(source, /mobileSearchScrollLockRef/);
  const openStart = source.indexOf("function openMobileSearchDrawer");
  const openEnd = source.indexOf("function openMobileFiltersDrawer", openStart);
  assert.doesNotMatch(source.slice(openStart, openEnd), /acquireMobileResultsScrollLock/);
  assert.match(source, /mobileFiltersScrollLockRef\.current \?\?= acquireMobileResultsScrollLock\(\)/);
});

test("Edit Search preserves visual header state while making the background inaccessible", () => {
  const compactHeaderStart = source.indexOf(
    "data-flight-results-compact-header",
  );
  const compactHeaderEnd = source.indexOf("</header>", compactHeaderStart);
  const compactHeader = source.slice(compactHeaderStart, compactHeaderEnd);

  assert.ok(compactHeaderStart >= 0);
  assert.match(compactHeader, /inert=\{mobileSearchOpen \? true : undefined\}/);
  assert.match(compactHeader, /mobileCompactHeaderVisible \? "opacity-100" : "opacity-0"/);
  assert.match(compactHeader, /aria-hidden=\{!mobileCompactHeaderVisible \|\| mobileSearchOpen\}/);
  assert.match(compactHeader, /mobileCompactHeaderVisible\s*&&\s*!mobileSearchOpen\s*\? "pointer-events-auto"\s*: "pointer-events-none"/);
  assert.match(source, /data-flight-results-top-summary/);
  assert.match(source, /data-flight-results-main/);
});
