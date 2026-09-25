import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source = fs.readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
const editSheet = fs.readFileSync(
  new URL("../search/MobileResultsEditSheet.tsx", import.meta.url),
  "utf8",
);

function classConstant(name: string) {
  const value = source.match(new RegExp(`const ${name} =\\s*\\n?\\s*"([^"]+)";`))?.[1];
  assert.ok(value, `${name} should remain defined`);
  return value;
}

test("Cars mobile edit search matches Hotels independent-card geometry with an external CTA", () => {
  assert.match(source, /placement === "mobile" && "grid grid-cols-1 gap-\[10px\]"/);
  assert.doesNotMatch(source, /placement === "mobile"[^\n]*divide-y/);
  assert.match(source, /min-h-\[66px\][^"]*rounded-\[13px\][^"]*border border-\[#E7ECF5\] bg-white[^"]*px-3[^"]*py-\[10px\][^"]*shadow-none/);
  assert.match(source, /data-cars-mobile-grouped-row/);
  assert.match(source, /data-cars-mobile-search-submit/);
  assert.match(source, /placement === "mobile"[\s\S]*border-0 bg-transparent p-0 shadow-none ring-0/);
});

test("Cars mobile Edit car search title keeps the Hotels 19px semibold hierarchy", () => {
  assert.match(source, /title=\{t\("carsResults\.editCarSearch"\)\}/);
  assert.match(
    editSheet,
    /carsResultsEdit && "pointer-events-none absolute inset-x-12 top-1\/2 -translate-y-1\/2 text-center text-\[19px\] font-semibold leading-\[24px\] tracking-normal"/,
  );
});

test("mobile pickup keeps the car-specific leading MapPin without a disclosure arrow", () => {
  const launcher = source.slice(source.indexOf("function MobileLocationLauncher"), source.indexOf("function SearchInputCell"));
  assert.match(launcher, /<Icon className="h-\[18px\] w-\[18px\] shrink-0 text-\[#334155\]"/);
  assert.doesNotMatch(launcher, /Chevron(?:Down|Right)/);
  assert.match(launcher, /onClick=\{onClick\}/);
});

test("grouped mobile leading field icons keep the neutral Hotel-compatible tone", () => {
  const pickup = source.slice(
    source.indexOf("function MobileLocationLauncher"),
    source.indexOf("function SearchInputCell"),
  );
  const dates = source.slice(
    source.indexOf("function SearchDateCell"),
    source.indexOf("function SearchTimeCell"),
  );
  const times = source.slice(
    source.indexOf("function SearchTimeCell"),
    source.indexOf("function DriverAgeCell"),
  );
  const age = source.slice(
    source.indexOf("function DriverAgeCell"),
    source.indexOf("\nfunction ", source.indexOf("function DriverAgeCell") + 10),
  );

  assert.match(pickup, /h-\[18px\] w-\[18px\] shrink-0 text-\[#334155\]/);
  assert.match(dates, /h-\[18px\] w-\[18px\] shrink-0 text-\[#334155\]/);
  assert.match(times, /h-\[18px\] w-\[18px\] shrink-0 text-\[#334155\]/);
  assert.match(age, /h-\[18px\] w-\[18px\] shrink-0 text-\[#334155\]/);
});

test("grouped mobile rows use Hotels radius, border, padding, and flat surface", () => {
  const shell = classConstant("carsMobileEditFieldShellClass");

  assert.match(shell, /min-h-\[66px\]/);
  assert.match(shell, /justify-center/);
  assert.match(shell, /rounded-\[13px\]/);
  assert.match(shell, /border-\[#E7ECF5\]/);
  assert.match(shell, /px-3/);
  assert.match(shell, /py-\[10px\]/);
  assert.match(shell, /shadow-none/);
  assert.doesNotMatch(shell, /rounded-\[15px\]|shadow-\[/);
  assert.equal(source.match(/groupedMobile \? carsMobileEditFieldShellClass/g)?.length, 4);
});

test("Edit car search labels and values use the Hotels typography hierarchy", () => {
  const pickupLabel = classConstant("carsMobileEditPickupLabelClass");
  const summaryLabel = classConstant("carsMobileEditFieldLabelClass");
  const summaryButton = classConstant("carsMobileEditSummaryButtonClass");
  const pickupValue = classConstant("carsMobileEditPickupValueClass");
  const valueGroup = classConstant("carsMobileEditValueGroupClass");

  for (const label of [pickupLabel, summaryLabel]) {
    assert.match(label, /mb-\[3px\]/);
    assert.match(label, /text-\[11px\]/);
    assert.match(label, /font-medium/);
    assert.match(label, /normal-case/);
    assert.match(label, /leading-\[14px\]/);
    assert.match(label, /tracking-normal/);
    assert.match(label, /text-\[#595959\]/);
    assert.doesNotMatch(label, /uppercase|font-extrabold|text-\[10px\]/);
  }

  for (const value of [summaryButton, pickupValue]) {
    assert.match(value, /h-auto/);
    assert.match(value, /min-h-6/);
    assert.match(value, /text-\[15px\]/);
    assert.match(value, /font-semibold/);
    assert.match(value, /leading-5/);
    assert.match(value, /text-\[#1A1A1A\]/);
  }

  assert.match(valueGroup, /gap-\[10px\]/);
});

test("grouped Pickup Location preserves car-specific primary and supporting text", () => {
  const launcher = source.slice(
    source.indexOf("function MobileLocationLauncher"),
    source.indexOf("function SearchInputCell"),
  );
  const secondary = classConstant("carsMobileEditSecondaryValueClass");

  assert.match(launcher, /groupedMobile \? carsMobileEditPickupLabelClass : fieldLabelClass/);
  assert.match(launcher, /carsMobileEditPickupValueClass/);
  assert.match(launcher, /carsMobileEditSecondaryValueClass/);

  assert.match(secondary, /text-\[12px\]/);
  assert.match(secondary, /font-normal/);
  assert.match(secondary, /leading-4/);
  assert.match(secondary, /text-\[#595959\]/);
});

test("grouped Rental Dates retains the current Cars date value and Hotels text classes", () => {
  const start = source.indexOf("function SearchDateCell");
  const end = source.indexOf("function SearchTimeCell", start);
  const cell = source.slice(start, end);

  assert.match(cell, /formatTravelDateDisplay\(pickupDate, intlLocale\)/);
  assert.match(cell, /formatTravelDateDisplay\(dropoffDate, intlLocale\)/);
  assert.match(cell, /groupedMobile \? carsMobileEditFieldLabelClass : fieldLabelClass/);
  assert.match(cell, /\? carsMobileEditSummaryButtonClass/);
  assert.match(cell, /className=\{carsMobileEditValueGroupClass\}/);
  assert.match(cell, /!groupedMobile \? \([\s\S]*?<ChevronDown/);
});

test("grouped Time and Driver Age retain Cars behavior with Hotels typography", () => {
  for (const name of ["SearchTimeCell", "DriverAgeCell"]) {
    const start = source.indexOf(`function ${name}`);
    const next = source.indexOf("\nfunction ", start + 10);
    const cell = source.slice(start, next < 0 ? undefined : next);

    assert.match(cell, /groupedMobile \? carsMobileEditFieldLabelClass : fieldLabelClass/);
    assert.match(cell, /\? carsMobileEditSummaryButtonClass/);
    assert.match(cell, /className=\{carsMobileEditValueGroupClass\}/);
    assert.match(cell, /min-w-0 flex-1 truncate text-start/);
  }
});

test("mobile Search CTA matches the Hotels Results editor", () => {
  assert.match(
    source,
    /data-cars-mobile-search-submit[\s\S]*?mt-3 h-\[52px\] w-full rounded-\[12px\] bg-\[#064CF7\][^"]*text-\[16px\][^"]*font-semibold[^"]*shadow-none/,
  );
  assert.doesNotMatch(
    source,
    /data-cars-mobile-search-submit[\s\S]*?h-\[54px\][^"]*font-bold/,
  );
});

test("time and driver age retain their existing disclosure behavior", () => {
  for (const name of ["SearchTimeCell", "DriverAgeCell"]) {
    const start = source.indexOf(`function ${name}`);
    const next = source.indexOf("\nfunction ", start + 10);
    const cell = source.slice(start, next < 0 ? undefined : next);
    assert.match(
      cell,
      /<ChevronDown[\s\S]*?groupedMobile && "text-\[#334155\]"[\s\S]*?aria-hidden="true"/,
    );
  }

  const datesStart = source.indexOf("function SearchDateCell");
  const datesEnd = source.indexOf("function SearchTimeCell", datesStart);
  const datesCell = source.slice(datesStart, datesEnd);
  assert.match(datesCell, /!groupedMobile \? \([\s\S]*?<ChevronDown/);
});
