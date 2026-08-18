import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const globals = readFileSync(
  new URL("../globals.css", import.meta.url),
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
