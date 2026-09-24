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

test("Cars mobile edit search uses Cars Main card geometry with an external CTA", () => {
  assert.match(source, /placement === "mobile" && "grid grid-cols-1 gap-2"/);
  assert.doesNotMatch(source, /placement === "mobile"[^\n]*divide-y/);
  assert.match(source, /min-h-\[66px\][^"]*rounded-\[15px\][^"]*border border-\[#D8E1EC\] bg-white[^"]*px-3[^"]*py-\[9px\]/);
  assert.match(source, /data-cars-mobile-grouped-row/);
  assert.match(source, /data-cars-mobile-search-submit/);
  assert.match(source, /placement === "mobile"[\s\S]*border-0 bg-transparent p-0 shadow-none ring-0/);
});

test("Cars mobile Edit Search title keeps a restrained native-like hierarchy", () => {
  assert.match(
    editSheet,
    /carsResultsEdit && "text-\[19px\] font-semibold leading-\[24px\] tracking-normal"/,
  );
});

test("mobile pickup uses the Cars Main leading MapPin without a disclosure arrow", () => {
  const launcher = source.slice(source.indexOf("function MobileLocationLauncher"), source.indexOf("function SearchInputCell"));
  assert.match(launcher, /<Icon className="h-\[18px\] w-\[18px\] shrink-0 text-\[#334155\]"/);
  assert.doesNotMatch(launcher, /Chevron(?:Down|Right)/);
  assert.match(launcher, /onClick=\{onClick\}/);
});

test("grouped mobile leading field icons match the Cars Main neutral tone", () => {
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

test("grouped mobile rows match Cars Main compact geometry", () => {
  const shell = classConstant("carsMobileEditFieldShellClass");

  assert.match(shell, /min-h-\[66px\]/);
  assert.match(shell, /justify-center/);
  assert.match(shell, /rounded-\[15px\]/);
  assert.match(shell, /px-3/);
  assert.match(shell, /py-\[9px\]/);
  assert.doesNotMatch(shell, /gap-\[1px\]/);
  assert.equal(source.match(/groupedMobile \? carsMobileEditFieldShellClass/g)?.length, 4);
});

test("Edit Search grouped mobile copy uses the exact Cars Main final text classes", () => {
  const pickupLabel = classConstant("carsMobileEditPickupLabelClass");
  const summaryLabel = classConstant("carsMobileEditFieldLabelClass");
  const summaryButton = classConstant("carsMobileEditSummaryButtonClass");
  const pickupValue = classConstant("carsMobileEditPickupValueClass");
  const valueGroup = classConstant("carsMobileEditValueGroupClass");

  assert.match(pickupLabel, /mb-1/);
  assert.match(pickupLabel, /text-\[10px\]/);
  assert.match(pickupLabel, /font-extrabold/);
  assert.match(pickupLabel, /leading-\[13px\]/);
  assert.match(pickupLabel, /tracking-\[0\.5px\]/);
  assert.match(pickupLabel, /text-slate-600/);

  assert.match(summaryLabel, /mb-1/);
  assert.match(summaryLabel, /text-\[10px\]/);
  assert.match(summaryLabel, /font-extrabold/);
  assert.match(summaryLabel, /leading-\[13px\]/);
  assert.match(summaryLabel, /tracking-\[0\.5px\]/);
  assert.match(summaryLabel, /text-\[#64748B\]/);

  for (const value of [summaryButton, pickupValue]) {
    assert.match(value, /h-8/);
    assert.match(value, /text-\[15px\]/);
    assert.match(value, /font-semibold/);
    assert.match(value, /leading-5/);
    assert.match(value, /text-\[#0F172A\]/);
    assert.doesNotMatch(value, /text-\[14px\]|font-medium|leading-\[19px\]/);
  }

  assert.match(valueGroup, /gap-\[10px\]/);
});

test("grouped Pickup Location uses Cars Main primary and supporting text directly", () => {
  const launcher = source.slice(
    source.indexOf("function MobileLocationLauncher"),
    source.indexOf("function SearchInputCell"),
  );
  const secondary = classConstant("carsMobileEditSecondaryValueClass");

  assert.match(launcher, /groupedMobile \? carsMobileEditPickupLabelClass : fieldLabelClass/);
  assert.match(launcher, /carsMobileEditPickupValueClass/);
  assert.match(launcher, /font-normal text-slate-500/);
  assert.match(launcher, /carsMobileEditSecondaryValueClass/);

  assert.match(secondary, /text-\[12px\]/);
  assert.match(secondary, /font-normal/);
  assert.match(secondary, /leading-4/);
  assert.match(secondary, /text-slate-600/);
});

test("grouped Rental Dates uses Cars Main weekday-inclusive text and direct value classes", () => {
  const start = source.indexOf("function SearchDateCell");
  const end = source.indexOf("function SearchTimeCell", start);
  const cell = source.slice(start, end);

  assert.match(cell, /formatTravelDateDisplay\(pickupDate, intlLocale\)/);
  assert.match(cell, /formatTravelDateDisplay\(dropoffDate, intlLocale\)/);
  assert.match(cell, /groupedMobile \? carsMobileEditFieldLabelClass : fieldLabelClass/);
  assert.match(cell, /\? carsMobileEditSummaryButtonClass/);
  assert.match(cell, /className=\{carsMobileEditValueGroupClass\}/);
  assert.match(cell, /font-normal text-slate-500/);
  assert.match(cell, /!groupedMobile \? \([\s\S]*?<ChevronDown/);
});

test("grouped Time and Driver Age use Cars Main selected-value structure directly", () => {
  for (const name of ["SearchTimeCell", "DriverAgeCell"]) {
    const start = source.indexOf(`function ${name}`);
    const next = source.indexOf("\nfunction ", start + 10);
    const cell = source.slice(start, next < 0 ? undefined : next);

    assert.match(cell, /groupedMobile \? carsMobileEditFieldLabelClass : fieldLabelClass/);
    assert.match(cell, /\? carsMobileEditSummaryButtonClass/);
    assert.match(cell, /className=\{carsMobileEditValueGroupClass\}/);
    assert.match(cell, /min-w-0 flex-1 truncate text-start/);
    assert.doesNotMatch(
      cell,
      /groupedMobile \? \[carsMobileEditValueClass, carsMobileEditValueRowClass\]/,
    );
  }
});

test("mobile Search CTA matches Cars Main height, radius, and weight", () => {
  assert.match(
    source,
    /data-cars-mobile-search-submit[\s\S]*?h-\[54px\] w-full rounded-\[11px\][^\"]*text-sm[^\"]*font-bold/,
  );
});

test("time and driver age retain Cars Main disclosure chevrons while Rental Dates does not", () => {
  for (const name of ["SearchTimeCell", "DriverAgeCell"]) {
    const start = source.indexOf(`function ${name}`);
    const next = source.indexOf("\nfunction ", start + 10);
    const cell = source.slice(start, next < 0 ? undefined : next);
    assert.match(
      cell,
      /<ChevronDown[\s\S]*?text-slate-500[\s\S]*?groupedMobile && "text-\[#334155\]"[\s\S]*?aria-hidden="true"/,
    );
  }

  const datesStart = source.indexOf("function SearchDateCell");
  const datesEnd = source.indexOf("function SearchTimeCell", datesStart);
  const datesCell = source.slice(datesStart, datesEnd);
  assert.match(datesCell, /!groupedMobile \? \([\s\S]*?<ChevronDown/);
});

test("grouped time and driver age values remain left aligned without centering overrides", () => {
  for (const name of ["SearchTimeCell", "DriverAgeCell"]) {
    const start = source.indexOf(`function ${name}`);
    const next = source.indexOf("\nfunction ", start + 10);
    const cell = source.slice(start, next < 0 ? undefined : next);

    assert.match(cell, /min-w-0 flex-1 truncate text-start/);
    assert.doesNotMatch(cell, /text-center|justify-center|mx-auto/);
  }
});
