import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const carsPageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const homepageSource = readFileSync(new URL("../page.tsx", import.meta.url), "utf8");
const searchBarSource = carsPageSource.slice(
  carsPageSource.indexOf("function CarsSearchBar"),
  carsPageSource.indexOf("function CarsMobilePickers"),
);
const timeFieldSource = carsPageSource.slice(
  carsPageSource.indexOf("function TimeRangeField"),
  carsPageSource.indexOf("function SearchCell"),
);
const rentalDatesSource = carsPageSource.slice(
  carsPageSource.indexOf("function RentalDatesField"),
  carsPageSource.indexOf("function TimeRangeField"),
);

test("mobile Cars card uses the refined radius and compact Cars identity", () => {
  assert.match(searchBarSource, /rounded-\[15px\]/);
  assert.doesNotMatch(searchBarSource, /rounded-\[1\.5rem\]/);
  assert.match(
    searchBarSource,
    /className="flex items-center sm:hidden">[\s\S]*?<CarFront[\s\S]*?className="h-5 w-5 text-\[#004BB8\]"[\s\S]*?\{t\("cars"\)\}/,
  );
  assert.match(searchBarSource, /sm:rounded-\[1\.35rem\]/);
});

test("mobile pickup and conditional return launchers lead values with MapPin and retain picker actions", () => {
  assert.match(
    searchBarSource,
    /onClick=\{\(\) => openMobilePicker\("pickupLocation"\)\}[\s\S]*?<MapPin[\s\S]*?h-4 w-4 shrink-0 text-slate-500[\s\S]*?values\.pickupLocation/,
  );
  assert.match(
    searchBarSource,
    /values\.returnToDifferentLocation \? \([\s\S]*?onClick=\{\(\) => openMobilePicker\("dropoffLocation"\)\}[\s\S]*?<MapPin[\s\S]*?h-4 w-4 shrink-0 text-slate-500[\s\S]*?values\.dropoffLocation/,
  );
});

test("rental dates retain Calendar before their dynamic summary", () => {
  assert.ok(rentalDatesSource.indexOf("<Calendar") < rentalDatesSource.indexOf("{dateSummary}"));
});

test("time uses a mobile Clock, hides only the mobile chevron, and retains desktop behavior", () => {
  assert.ok(timeFieldSource.indexOf("<Clock") < timeFieldSource.indexOf("{timeSummary}"));
  assert.match(timeFieldSource, /className="h-4 w-4 shrink-0 text-slate-500 sm:hidden"/);
  assert.match(timeFieldSource, /<ChevronDown[\s\S]*?hidden h-4 w-4[\s\S]*?sm:block/);
  assert.match(timeFieldSource, /onClick=\{onToggle\}/);
  assert.match(timeFieldSource, /aria-expanded=\{isOpen\}/);
  assert.match(timeFieldSource, /data-cars-desktop-popover="times"/);
});

test("mobile Driver Age leads its dynamic value with UserRound and retains its launcher chevron", () => {
  const driverAgeFieldSource = searchBarSource.slice(
    searchBarSource.indexOf('label={t("carsSearch.driverAgeLabel")}'),
    searchBarSource.indexOf('type="submit"'),
  );
  const mobileLauncherSource = driverAgeFieldSource.slice(
    driverAgeFieldSource.indexOf("<button"),
    driverAgeFieldSource.indexOf("</button>") + "</button>".length,
  );

  assert.match(
    mobileLauncherSource,
    /onClick=\{\(\) => openMobilePicker\("driverAge"\)\}/,
  );
  assert.ok(
    mobileLauncherSource.indexOf("<UserRound") <
      mobileLauncherSource.indexOf("values.driverAge"),
  );
  assert.match(
    mobileLauncherSource,
    /<UserRound[\s\S]*?aria-hidden="true"[\s\S]*?className="h-4 w-4 shrink-0 text-slate-500"/,
  );
  assert.match(mobileLauncherSource, /flex min-w-0 flex-1 items-center gap-2/);
  assert.match(mobileLauncherSource, /className="truncate"/);
  assert.match(
    mobileLauncherSource,
    /values\.driverAge === defaultDriverAge[\s\S]*?t\("carsSearch\.driverAgeAnyAgeRange"\)[\s\S]*?: getDriverAgeOptionLabel\(values\.driverAge\)/,
  );
  assert.ok(
    mobileLauncherSource.indexOf("values.driverAge") <
      mobileLauncherSource.indexOf("<ChevronDown"),
  );
  assert.doesNotMatch(mobileLauncherSource, /rounded-full|bg-\[#004BB8\]/);
  assert.ok(
    driverAgeFieldSource.indexOf('label={t("carsSearch.driverAgeLabel")}') <
      driverAgeFieldSource.indexOf("<UserRound"),
  );
  assert.match(searchBarSource, /type="submit"/);
  assert.match(searchBarSource, /\{isSubmitting \? t\("searchingCars"\) : t\("searchCars"\)\}/);
});

test("Driver Age icon is mobile-only and mobile picker uses the shared draft dialog", () => {
  const driverAgeFieldSource = searchBarSource.slice(
    searchBarSource.indexOf('label={t("carsSearch.driverAgeLabel")}'),
    searchBarSource.indexOf('type="submit"'),
  );
  const desktopLauncherSource = driverAgeFieldSource.slice(
    driverAgeFieldSource.indexOf("<button", driverAgeFieldSource.indexOf("</button>") + 1),
    driverAgeFieldSource.lastIndexOf("</button>") + "</button>".length,
  );
  const driverAgePickerSource = searchBarSource.slice(
    searchBarSource.lastIndexOf('activeMobilePicker === "driverAge"'),
  );

  assert.match(desktopLauncherSource, /className="hidden h-7[\s\S]*?sm:flex/);
  assert.match(desktopLauncherSource, /ChevronDown/);
  assert.doesNotMatch(desktopLauncherSource, /UserRound/);
  assert.match(searchBarSource, /<MobileCarDriverAgePickerDialog/);
  assert.match(driverAgePickerSource, /onCommit=\{\(age\) => updateValue\("driverAge", age\)\}/);
  assert.doesNotMatch(driverAgePickerSource, /UserRound/);
});

test("homepage Cars SearchTabs remains independently owned", () => {
  assert.match(homepageSource, /<SearchTabs/);
  assert.doesNotMatch(homepageSource, /function CarsSearchBar/);
});
