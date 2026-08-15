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

test("Driver Age and Search cars controls remain present without a new age icon", () => {
  const driverAgeSource = searchBarSource.slice(
    searchBarSource.indexOf('label={t("carsSearch.driverAgeLabel")}'),
    searchBarSource.indexOf('type="submit"'),
  );
  assert.match(driverAgeSource, /ChevronDown/);
  assert.doesNotMatch(driverAgeSource, /<Clock|<MapPin|<CarFront/);
  assert.match(searchBarSource, /type="submit"/);
  assert.match(searchBarSource, /\{isSubmitting \? t\("searchingCars"\) : t\("searchCars"\)\}/);
});

test("homepage Cars SearchTabs remains independently owned", () => {
  assert.match(homepageSource, /<SearchTabs/);
  assert.doesNotMatch(homepageSource, /function CarsSearchBar/);
});
