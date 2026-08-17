import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);

const renderCarsSearchForm = source.match(
  /const renderCarsSearchForm = \([\s\S]*?\n  return \(\n    <main/,
)?.[0];

assert.ok(renderCarsSearchForm, "renderCarsSearchForm should remain defined");

const driverAgeSelection = renderCarsSearchForm.match(
  /<DriverAgeCell[\s\S]*?onSelect=\{\(age\) => \{([\s\S]*?)\n\s*\}\}/,
)?.[1];

assert.ok(
  driverAgeSelection,
  "the results DriverAgeCell selection callback should remain defined",
);

test("desktop-full Driver Age selection updates without closing the picker", () => {
  assert.match(driverAgeSelection, /setDriverAge\(age\);/);
  assert.doesNotMatch(
    driverAgeSelection,
    /setDriverAge\(age\);\s*setDriverAgeOpen\(false\);/,
  );
});

test("desktop-sticky Driver Age selection updates without closing the picker", () => {
  assert.match(
    renderCarsSearchForm,
    /placement: "desktop-full" \| "desktop-sticky" \| "mobile"/,
  );
  assert.match(driverAgeSelection, /if \(placement === "mobile"\)/);
});

test("mobile Driver Age selection retains close-after-selection behavior", () => {
  assert.match(
    driverAgeSelection,
    /if \(placement === "mobile"\) \{\s*setDriverAgeOpen\(false\);\s*\}/,
  );
});
