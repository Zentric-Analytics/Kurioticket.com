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
  assert.doesNotMatch(fieldInputClass, /(?:^|\s)truncate(?:\s|$)/);
});

test("results location autocomplete owns the remaining value-row width", () => {
  const searchInputCell = source.match(
    /function SearchInputCell\([\s\S]*?\n}\n\nfunction ResultsDesktopPopover/,
  )?.[0];

  assert.ok(searchInputCell, "SearchInputCell should remain defined");
  assert.match(
    searchInputCell,
    /<Icon[\s\S]*?<div className="min-w-0 flex-1">\s*<CarLocationAutocomplete[\s\S]*?<\/div>[\s\S]*?showClearButton && value/,
  );
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
  assert.match(source, /useCompactDateSummary=\{placement !== "mobile"\}/);
  assert.match(source, /showRentalDuration=\{placement === "desktop-full"\}/);
  assert.match(
    source,
    /dateFormatter = useCompactDateSummary \? formatCompactDate : formatDate/,
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

test("desktop-sticky compact date summary is independent from rental duration", () => {
  assert.match(source, /useCompactDateSummary=\{placement !== "mobile"\}/);
  assert.match(source, /showRentalDuration=\{placement === "desktop-full"\}/);
  assert.match(source, /useCompactDateSummary: boolean/);
  assert.match(
    source,
    /dateFormatter = useCompactDateSummary \? formatCompactDate : formatDate/,
  );
  assert.doesNotMatch(
    source,
    /dateFormatter = showRentalDuration \? formatCompactDate : formatDate/,
  );
});

test("desktop-full rental dates compose calendar, value stack, then chevron", () => {
  const searchDateCell = source.match(
    /function SearchDateCell\([\s\S]*?\n}\n\nfunction SearchTimeCell/,
  )?.[0];

  assert.ok(searchDateCell, "SearchDateCell should remain defined");
  assert.match(
    searchDateCell,
    /\{showRentalDuration \? \(\s*<Calendar[\s\S]*?className="h-4 w-4 shrink-0 text-slate-500"[\s\S]*?<span className="min-w-0 flex-1">[\s\S]*?\{summary\}[\s\S]*?showRentalDuration && rentalDayCount > 0[\s\S]*?\{rentalDaysLabel\}[\s\S]*?<ChevronDown/,
  );
  const labelRow = searchDateCell.match(
    /<div className=\{fieldLabelClass\}>[\s\S]*?<\/div>/,
  )?.[0];
  assert.ok(labelRow, "SearchDateCell label row should remain defined");
  assert.doesNotMatch(labelRow, /<Calendar\b/);
});

test("Cars main search retains its location-width and rental-date references", () => {
  assert.match(
    carsPageSource,
    /<div className="min-w-0 flex-1">\s*<CarLocationAutocomplete/,
  );
  const rentalDatesField = carsPageSource.match(
    /function RentalDatesField\([\s\S]*?\n}\n\nfunction TimeRangeField/,
  )?.[0];

  assert.ok(rentalDatesField, "RentalDatesField should remain defined");
  assert.match(
    rentalDatesField,
    /<Calendar[\s\S]*?\{dateSummary\}[\s\S]*?\{rentalDaysLabel\}[\s\S]*?<ChevronDown/,
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
