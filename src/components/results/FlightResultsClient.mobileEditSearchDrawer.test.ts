import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");

test("standard mobile filters unmount when closed and wire existing focus management", () => {
  const start = source.indexOf("function renderMobileFullFiltersSheet");
  assert.ok(start > 0);
  const drawer = source.slice(start, source.indexOf("if (guidedMode)", start));
  assert.match(drawer, /if \(!filtersOpen\) return null/);
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
  const start = source.indexOf("function renderMobileRouteSummaryCard");
  const end = source.indexOf("function renderMobileEditSearchDrawer", start);
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

test("Edit Search remains wired to the stable AppHeader results launcher", () => {
  assert.match(source, /mobileResultsSearch=\{renderMobileRouteSummaryCard\(\)\}/);
  assert.match(source, /aria-expanded=\{mobileSearchOpen\}/);
  assert.match(source, /data-flight-results-main/);
  assert.doesNotMatch(source, /data-flight-results-compact-header|mobileCompactHeaderVisible/);
});
