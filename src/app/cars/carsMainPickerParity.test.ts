import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const globals = readFileSync(
  new URL("../globals.css", import.meta.url),
  "utf8",
);
const pickerContent = readFileSync(
  new URL("../../components/search/CarsPickerContent.tsx", import.meta.url),
  "utf8",
);
const pickerShell = readFileSync(
  new URL("../../components/search/FlightMobilePickerShell.tsx", import.meta.url),
  "utf8",
);

const timeField = page.match(
  /function TimeRangeField\([\s\S]*?\n}\n\nfunction SearchCell/,
)?.[0];
assert.ok(timeField, "TimeRangeField should remain defined");

const ageSelection = page.match(
  /<DriverAgeDesktopPopover[\s\S]*?onSelect=\{\(age\) => \{([\s\S]*?)\n\s*}}/,
)?.[1];
assert.ok(
  ageSelection,
  "the desktop Driver Age callback should remain defined",
);

test("main desktop pickers retain Results shell geometry and styling hooks", () => {
  assert.match(
    page,
    /preferredWidth:\s*448,\s*desiredHeight:\s*320,[\s\S]*?align:\s*"center"/,
  );
  assert.match(
    page,
    /data-cars-desktop-popover="times"[\s\S]*?overflow-hidden p-3/,
  );
  assert.match(
    page,
    /preferredWidth:\s*288,\s*desiredHeight:\s*320,[\s\S]*?align:\s*"end"/,
  );
  assert.match(
    page,
    /data-cars-desktop-popover="driver-age"[\s\S]*?overflow-hidden/,
  );
});

test("Results and main desktop lists share the scrollbar contract", () => {
  for (const selector of [
    '[data-cars-results-picker-popover="true"] [data-cars-time-list]',
    '[data-cars-results-picker-popover="true"] [data-cars-age-list]',
    '[data-cars-desktop-popover="times"] [data-cars-time-list]',
    '[data-cars-desktop-popover="driver-age"] [data-cars-age-list]',
  ]) {
    assert.ok(globals.includes(selector), `${selector} should remain scoped`);
  }

  assert.match(globals, /scrollbar-width:\s*thin/);
  assert.match(globals, /scrollbar-color:\s*#64748b transparent/);
  assert.match(globals, /::-webkit-scrollbar\s*\{[\s\S]*?width:\s*4px/);
  assert.match(
    globals,
    /::-webkit-scrollbar-track,[\s\S]*?background:\s*transparent/,
  );
  assert.match(globals, /::-webkit-scrollbar-thumb\s*\{[\s\S]*?#64748b/);
  assert.match(globals, /::-webkit-scrollbar-thumb:hover\s*\{[\s\S]*?#475569/);
  assert.match(
    globals,
    /::-webkit-scrollbar-button\s*\{[\s\S]*?display:\s*none;[\s\S]*?width:\s*0;[\s\S]*?height:\s*0/,
  );
});

test("main desktop Driver Age selection updates and stays open", () => {
  assert.match(ageSelection, /updateValue\("driverAge", age\);/);
  assert.doesNotMatch(ageSelection, /setDriverAgeOpen\(false\)/);
  assert.doesNotMatch(ageSelection, /desktopDriverAgeLauncherRef[^;]*focus/);
});

test("main desktop Return Time selection updates and stays open", () => {
  const returnSelection = timeField.match(
    /onReturnTimeChange=\{\(time\) => \{([\s\S]*?)\n\s*}}/,
  )?.[1];
  assert.ok(returnSelection, "the Return Time callback should remain defined");
  assert.match(returnSelection, /updateValue\("dropoffTime", time\);/);
  assert.doesNotMatch(
    returnSelection,
    /onDone|setTimesOpen|timesLauncherRef|\.focus\(/,
  );
  assert.doesNotMatch(timeField, /\bonDone\b/);
});

test("Cars Main mobile time starts at the top while Results Edit still reveals selection", () => {
  assert.match(
    pickerContent,
    /autoRevealSelected=\{presentation !== "carsMain"\}/,
  );
  assert.match(
    pickerContent,
    /if \(!autoRevealSelected\)[\s\S]*?pickupListRef\.current\.scrollTop = 0[\s\S]*?returnListRef\.current\.scrollTop = 0/,
  );
  assert.match(pickerContent, /positionSelected\(pickupListRef\.current, pickupTime\)/);
  assert.match(pickerContent, /positionSelected\(returnListRef\.current, returnTime\)/);
  assert.match(pickerContent, /nativeCarsAppearance \? "gap-2\.5"/);
  assert.match(pickerContent, /min-h-\[50px\] px-2/);
  assert.match(pickerContent, /h-\[17px\] w-\[17px\]/);
});

test("Cars Main default driver age requires an explicit numeric selection", () => {
  assert.match(
    pickerContent,
    /presentation === "carsMain" && driverAge === defaultDriverAge[\s\S]*?\? undefined/,
  );
  assert.doesNotMatch(pickerContent, /driverAge === defaultDriverAge[\s\S]*?\? "(?:18|30)"/);
  assert.match(pickerContent, /driverAgeOptions\.slice\(1\)/);
  assert.match(pickerContent, /disabled=\{presentation === "carsMain" && draftAge === undefined\}/);
  assert.match(pickerContent, /aria-selected=\{selected\}/);
  assert.match(pickerContent, /const selected = selectedAge === age/);
  assert.match(pickerContent, /min-h-14/);
  assert.match(pickerContent, /h-\[22px\] w-\[22px\]/);
});

test("Cars Main child pickers retain the full-height white mobile-web shell", () => {
  assert.match(pickerShell, /data-cars-main-picker/);
  assert.match(pickerShell, /fixed inset-0 z-\[2147483647\] h-\[100dvh\]/);
  assert.match(pickerShell, /fixed inset-0 flex h-\[100dvh\]/);
  assert.doesNotMatch(pickerShell, /max-h-\[(?:72|82)dvh\]/);
  assert.match(pickerContent, /presentation === "carsMain"[\s\S]*?"bg-white px-4 py-3"/);
});
