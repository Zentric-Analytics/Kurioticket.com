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
