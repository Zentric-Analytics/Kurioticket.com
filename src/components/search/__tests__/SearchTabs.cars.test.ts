import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const carsBranch = source.slice(source.lastIndexOf("<form onSubmit={onCarsSubmit}"));

test("homepage Cars search uses one responsive joined primary row", () => {
  assert.match(source, /data-testid="cars-joined-search-card"/);
  assert.match(source, /data-testid="cars-primary-row"/);
  assert.match(source, /lg:grid-cols-\[minmax\(0,1\.65fr\)_minmax\(170px,1\.25fr\)_minmax\(170px,1\.15fr\)_minmax\(135px,0\.85fr\)_136px\]/);
  assert.match(source, /"grid grid-cols-1 gap-2 sm:grid-cols-2 lg:gap-0"/);
  assert.equal(carsBranch.includes("lg:grid-cols-[minmax(0,1.2fr)"), false);
});

test("homepage Cars primary fields use summaries and the location autocomplete", () => {
  for (const label of [
    "carsSearch.pickupLocationLabel",
    "carsSearch.rentalDatesLabel",
    "carsSearch.pickupReturnTimeLabel",
    "carsSearch.driverAgeLabel",
  ]) assert.ok(carsBranch.includes(label), label);
  assert.match(carsBranch, /<CarLocationAutocomplete id="homepage-cars-pickup"/);
  assert.match(carsBranch, /value=\{carsDateSummary\}/);
  assert.match(carsBranch, /value=\{carsTimeSummary\}/);
  assert.equal(carsBranch.includes("<select"), false);
});

test("homepage Cars return location is conditional and outside the primary row", () => {
  const primaryRowEnd = carsBranch.indexOf("</div>\n          </div>\n          <div className=\"flex min-h-8");
  const primaryRow = carsBranch.slice(0, primaryRowEnd);
  assert.equal(primaryRow.includes("homepage-cars-dropoff"), false);
  assert.match(carsBranch, /carsValues\.returnToDifferentLocation \? <div ref=\{carsDropoffFieldRef\}/);
  assert.match(source, /if \(key === "returnToDifferentLocation" && value === false\) \{\s*next\.dropoffLocation = "";/);
});

test("Cars autocomplete uses responsive presentation and the complete surface boundary", () => {
  assert.match(carsBranch, /ref=\{carsSearchSurfaceRef\} data-testid="cars-search-surface"/);
  assert.equal((carsBranch.match(/presentation="responsive"/g) ?? []).length, 2);
  assert.equal((carsBranch.match(/searchCardRef=\{carsSearchSurfaceRef\}/g) ?? []).length, 2);
  assert.match(carsBranch, /fieldAnchorRef=\{carsPickupFieldRef\}/);
  assert.match(carsBranch, /fieldAnchorRef=\{carsDropoffFieldRef\}/);
});

test("Cars summary popup IDs are stable and field-specific", () => {
  for (const id of ["homepage-cars-rental-dates", "homepage-cars-time-range", "homepage-cars-driver-age"]) {
    assert.ok(carsBranch.includes(`id="${id}"`), id);
  }
  assert.equal(source.includes("label.toLowerCase"), false);
  assert.equal(source.includes("lg:top-1/2"), false);
  assert.equal(source.includes("lg:-translate-y-1/2"), false);
});

test("homepage Cars picker source contracts use the shared experiences", () => {
  assert.match(carsBranch, /<CarsRentalDatePickerContent/);
  assert.match(carsBranch, /desktopWidth=\{620\}/);
  assert.equal(carsBranch.includes('type="date"'), false);

  assert.match(carsBranch, /<CarsTimeRangePickerContent/);
  assert.match(carsBranch, /<CarsDriverAgePickerContent/);
  assert.match(carsBranch, /desktopAlign="right" desktopWidth=\{248\}/);
  assert.match(carsBranch, /popupRole="listbox"/);
});

test("homepage Cars calendar preserves range selection and localized controls", () => {
  assert.match(source, /const selectHomepageRentalDate/);
  assert.match(source, /selectedIso < carsValues\.pickupDate/);
  assert.match(source, /setCarsVisibleMonthDate/);
  for (const key of ["carsSearch.previousMonth", "carsSearch.nextMonth", "carsSearch.selectDateAriaPrefix", "clear", "done"]) {
    assert.ok(carsBranch.includes(key), key);
  }
});

test("homepage Cars submit remains Cars-specific while visible copy is generic and single-line", () => {
  assert.match(carsBranch, /aria-label=\{translate\("searchCars"\) \|\| "Search cars"\}/);
  assert.match(carsBranch, /"whitespace-nowrap"/);
  assert.match(carsBranch, /translate\("search"\) \|\| "Search"/);
  assert.equal(carsBranch.includes(': translate("searchCars") || "Search cars"'), false);
});

test("Cars results URL retains every required parameter and validation", () => {
  const submit = source.slice(source.indexOf("const onCarsSubmit"), source.indexOf("const isCarsSearchDisabled"));
  assert.match(submit, /validateCarsForm\(carsValues/);
  for (const parameter of ["pickupLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge", "dropoffLocation"]) {
    assert.ok(submit.includes(parameter), parameter);
  }
  assert.match(submit, /router\.push\(`\/cars\/results\?\$\{params\.toString\(\)\}`\)/);
});
