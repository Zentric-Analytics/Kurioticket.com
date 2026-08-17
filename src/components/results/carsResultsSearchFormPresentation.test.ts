import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
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
