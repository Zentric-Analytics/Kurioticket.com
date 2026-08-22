import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);

const mobileForm = source.match(
  /const renderCarsSearchForm = \([\s\S]*?\n  return \(\n    <main/,
)?.[0];

assert.ok(mobileForm, "the Cars Results search form should remain defined");

test("mobile Results uses the main Cars dedicated picker dialogs", () => {
  assert.match(source, /<MobileDatePickerDialog/);
  assert.match(source, /<MobileCarTimePickerDialog/);
  assert.match(source, /<MobileCarDriverAgePickerDialog/);
  assert.match(source, /<MobileCarLocationPicker/);
  assert.match(
    source,
    /type CarsResultsMobilePicker =\s*\| "pickupLocation"\s*\| "returnLocation"\s*\| "dates"\s*\| "times"\s*\| "driverAge"\s*\| null/,
  );
});

test("mobile launchers enter one nested picker instead of inline panels", () => {
  for (const picker of ["dates", "times", "driverAge"]) {
    assert.match(
      mobileForm,
      new RegExp(
        `if \\(placement === "mobile"\\) \\{\\s*setMobilePicker\\("${picker}"\\);\\s*return;`,
      ),
    );
  }
  assert.match(
    mobileForm,
    /placement !== "mobile" && surfaceOwnsPopovers && timesOpen/,
  );
  assert.match(
    mobileForm,
    /placement !== "mobile" &&[\s\S]*?surfaceOwnsPopovers &&[\s\S]*?driverAgeOpen/,
  );
});

test("picker Back and Done return to Edit Search without submitting", () => {
  const dialogs = source.match(
    /<MobileDatePickerDialog[\s\S]*?<div\n        className=\{cn\(/,
  )?.[0];
  assert.ok(dialogs, "the nested mobile dialogs should remain by the editor");
  assert.equal(
    (dialogs.match(/onClose=\{\(\) => setMobilePicker\(null\)\}/g) ?? [])
      .length,
    5,
  );
  assert.doesNotMatch(
    dialogs,
    /router\.(?:push|replace)|onSubmit|closeMobileSearchDrawer/,
  );
});

test("mobile Driver Age delegates numeric formatting to the shared picker", () => {
  assert.match(
    source,
    /<MobileCarDriverAgePickerDialog[\s\S]*?formatAge=\{\(age\) => age\}/,
  );
  assert.doesNotMatch(
    source.match(/<MobileCarDriverAgePickerDialog[\s\S]*?\/>/)?.[0] ?? "",
    /years old/,
  );
});
