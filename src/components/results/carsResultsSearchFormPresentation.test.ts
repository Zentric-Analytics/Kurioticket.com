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
  assert.match(
    source,
    /<CarLocationAutocomplete[\s\S]*?inputClassName=\{cn\(fieldInputClass, "pr-8"\)\}/,
  );
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
