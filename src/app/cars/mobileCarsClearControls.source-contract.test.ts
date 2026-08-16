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

test("Cars location clear controls are available only at the desktop breakpoint", () => {
  for (const label of [
    "carsSearch.clearPickupLocation",
    "carsSearch.clearReturnLocation",
  ]) {
    const clearControl = carsPageSource.match(
      new RegExp(
        `aria-label=\\{t\\("${label}"\\)\\}[\\s\\S]*?className="([^"]+)"`,
      ),
    );

    assert.ok(clearControl);
    assert.match(clearControl[1], /\bhidden\b/);
    assert.match(clearControl[1], /\bsm:inline-flex\b/);
  }

  assert.doesNotMatch(carsPageSource, /onClick=\{onClearSearch\}|\{t\("clearAll"\)\}/);
});
