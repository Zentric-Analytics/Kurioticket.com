import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const carsPageSource = readFileSync("src/app/cars/page.tsx", "utf8");

test("mobile Cars location launchers do not reserve space for clear buttons", () => {
  const pickupLauncher = carsPageSource.match(
    /ref=\{pickupLocationLauncherRef\}[\s\S]*?className=\{`([^`]+)`\}/,
  );
  const returnLauncher = carsPageSource.match(
    /ref=\{dropoffLocationLauncherRef\}[\s\S]*?className=\{`([^`]+)`\}/,
  );

  assert.ok(pickupLauncher);
  assert.ok(returnLauncher);
  assert.doesNotMatch(pickupLauncher[1], /\bpe-9\b/);
  assert.doesNotMatch(returnLauncher[1], /\bpe-9\b/);
});

test("desktop Cars location fields do not render explicit clear controls", () => {
  assert.doesNotMatch(carsPageSource, /carsSearch\.clearPickupLocation/);
  assert.doesNotMatch(carsPageSource, /carsSearch\.clearReturnLocation/);
  assert.doesNotMatch(carsPageSource, /<X\b/);
  assert.doesNotMatch(carsPageSource, /onClick=\{onClearSearch\}|\{t\("clearAll"\)\}/);
});
