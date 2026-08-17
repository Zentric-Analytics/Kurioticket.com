import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const carsPageSource = readFileSync(
  new URL("../../app/cars/page.tsx", import.meta.url),
  "utf8",
);

test("results search preserves both desktop grid geometries and outer footprint", () => {
  assert.match(source, /mx-auto w-full min-w-0 max-w-5xl/);
  assert.match(source, /lg:min-h-\[58px\]/);
  assert.match(
    source,
    /minmax\(0,1\.18fr\).*minmax\(0,1\.08fr\).*_118px_116px/,
  );
  assert.match(source, /minmax\(0,2\.26fr\).*_118px_116px/);
  assert.match(
    source,
    /returnToDifferentLocation\s*\? differentReturnSearchGridClass/,
  );
});

test("results search conditionally renders return location and canonical marker", () => {
  assert.match(
    source,
    /returnToDifferentLocation \? \([\s\S]*?<SearchInputCell[\s\S]*?name="dropoffLocation"/,
  );
  assert.match(source, /name="returnToDifferentLocation"[\s\S]*?value="1"/);
  assert.match(
    source,
    /setReturnToDifferentLocation\(false\)[\s\S]*?setDropoffLocation\(""\)/,
  );
});

test("different-return action is landing-page only while same-as-pickup remains", () => {
  assert.doesNotMatch(source, /carsSearch\.differentReturnLocation/);
  assert.match(source, /carsResults\.sameAsPickup/);
  assert.match(carsPageSource, /carsSearch\.differentReturnLocation/);
});

test("results location inputs use a clean local focus presentation", () => {
  const fieldInputClass = source.match(
    /const fieldInputClass =\s*\n\s*"([^"]+)";/,
  )?.[1];

  assert.ok(fieldInputClass, "fieldInputClass should remain defined");
  assert.doesNotMatch(fieldInputClass, /(?:^|\s)focus-ring(?:\s|$)/);
  assert.match(fieldInputClass, /(?:^|\s)focus-visible:outline-none(?:\s|$)/);
  assert.match(fieldInputClass, /(?:^|\s)focus-visible:shadow-none(?:\s|$)/);
});

test("pickup alone removes its clear action and reclaims the input width", () => {
  const pickupCell = source.match(
    /<SearchInputCell[\s\S]*?name="pickupLocation"[\s\S]*?\/>/,
  )?.[0];
  const returnCell = source.match(/name="dropoffLocation"[\s\S]*?\/>/)?.[0];

  assert.ok(pickupCell, "Pickup SearchInputCell should remain rendered");
  assert.match(pickupCell, /showClearButton=\{false\}/);
  assert.ok(returnCell, "Return SearchInputCell should remain rendered");
  assert.doesNotMatch(returnCell, /showClearButton=\{false\}/);
  assert.match(returnCell, /onClear=\{\(\) => \{/);
  assert.match(
    source,
    /inputClassName=\{cn\(fieldInputClass, showClearButton && "pr-8"\)\}/,
  );
  assert.match(source, /\{showClearButton && value \? \(/);
  assert.doesNotMatch(
    source,
    /inputClassName=\{cn\(fieldInputClass, "pr-8"\)\}/,
  );
});

test("desktop-full rental dates use compact dates and localized duration", () => {
  assert.match(source, /showRentalDuration=\{placement === "desktop-full"\}/);
  assert.match(
    source,
    /dateFormatter = showRentalDuration \? formatCompactDate : formatDate/,
  );
  assert.match(
    source,
    /const rentalDayCount =[\s\S]*?Math\.max\([\s\S]*?0,[\s\S]*?Math\.round\([\s\S]*?dropoffParsed\.getTime\(\) - pickupParsed\.getTime\(\)[\s\S]*?86_400_000/,
  );
  assert.match(
    source,
    /t\("carsSearch\.rentalDays"\)\.replace\([\s\S]*?"\{count\}"[\s\S]*?String\(rentalDayCount\)/,
  );
  assert.match(
    source,
    /showRentalDuration && rentalDayCount > 0[\s\S]*?\{rentalDaysLabel\}/,
  );
  assert.match(source, /name="pickupDate" value=\{pickupDate\}/);
  assert.match(source, /name="dropoffDate" value=\{dropoffDate\}/);
});

test("desktop controls reuse Cars autocomplete, picker content, and fixed popovers", () => {
  for (const primitive of [
    "CarLocationAutocomplete",
    "CarsRentalDatePickerContent",
    "CarsTimeRangePickerContent",
    "CarsDriverAgePickerContent",
    "useCarsDesktopPopover",
    "createPortal",
    "carsDesktopPopoverClassName",
  ])
    assert.match(source, new RegExp(primitive));
});
