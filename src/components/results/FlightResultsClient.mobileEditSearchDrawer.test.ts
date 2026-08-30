import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
test("Results delegates mobile Edit Search to the shared drawer", () => {
  assert.match(source, /import \{ FlightEditSearchDrawer/);
  assert.match(source, /<FlightEditSearchDrawer/);
  assert.match(source, /open=\{mobileSearchOpen\}/);
  assert.match(source, /<FlightEditSearchDrawer[\s\S]*?presentation="bottom-sheet"/);
  assert.match(source, /router\.push\(`\/flights\/results\?/);
});

test("Results parent leaves Edit Search scroll locking to the drawer", () => {
  assert.doesNotMatch(source, /mobileSearchScrollLockRef/);
  const openStart = source.indexOf("function openMobileSearchDrawer");
  const openEnd = source.indexOf("function openMobileFiltersDrawer", openStart);
  assert.doesNotMatch(source.slice(openStart, openEnd), /acquireMobileResultsScrollLock/);
  assert.match(source, /mobileFiltersScrollLockRef\.current \?\?= acquireMobileResultsScrollLock\(\)/);
});

test("opening Edit Search cannot select or hide a Results header state", () => {
  const compactHeaderStart = source.indexOf(
    "data-flight-results-compact-header",
  );
  const compactHeaderEnd = source.indexOf("</header>", compactHeaderStart);
  const compactHeader = source.slice(compactHeaderStart, compactHeaderEnd);

  assert.ok(compactHeaderStart >= 0);
  assert.match(compactHeader, /inert=\{mobileSearchOpen \? true : undefined\}/);
  assert.match(compactHeader, /aria-hidden=\{!mobileCompactHeaderVisible\}/);
  assert.doesNotMatch(
    compactHeader,
    /mobileCompactHeaderVisible\s*&&\s*!mobileSearchOpen/,
  );
  assert.doesNotMatch(compactHeader, /aria-hidden=.*mobileSearchOpen/);
  assert.match(source, /data-flight-results-top-summary/);
  assert.match(source, /data-flight-results-main/);
});
