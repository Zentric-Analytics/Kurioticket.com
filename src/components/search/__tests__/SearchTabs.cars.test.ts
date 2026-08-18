import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const carsBranch = source.slice(source.lastIndexOf("<form onSubmit={onCarsSubmit}"));
const returnLocationField = source.slice(
  source.indexOf("const carsReturnLocationField"),
  source.indexOf('if (mobileHomepage && tab === "flights")'),
);

test("homepage calendar shows today with a ring and no decorative dot", () => {
  assert.match(source, /isToday && !isDisabledDate && "ring-1 ring-inset ring-\[#004BB8\]\/25"/);
  assert.doesNotMatch(source, /isToday && !isStart && !isEnd \? \(/);
  assert.doesNotMatch(source, /bottom-1\.5 h-1 w-1 rounded-full bg-\[#004BB8\]/);
});

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
  assert.match(carsBranch, /<CarLocationAutocomplete id=\{mobileHomepage \? "homepage-cars-pickup-desktop" : "homepage-cars-pickup"\}/);
  assert.match(carsBranch, /value=\{carsDateSummary\}/);
  assert.match(carsBranch, /value=\{carsTimeSummary\}/);
  assert.equal(carsBranch.includes("<select"), false);
});

test("source contract: homepage Rental Dates renders localized two-slot summary states", () => {
  assert.match(source, /const carsPickupDateDisplay =\s*formatCarsDate\(carsValues\.pickupDate\) \|\|\s*translate\("carsSearch\.pickupDateLabel"\) \|\|\s*"Pickup date";/);
  assert.match(source, /const carsReturnDateDisplay =\s*formatCarsDate\(carsValues\.dropoffDate\) \|\|\s*translate\("carsSearch\.returnDateLabel"\) \|\|\s*"Return date";/);
  assert.match(source, /\{carsPickupDateDisplay\}<\/span>\s*<span className="text-slate-400"> — <\/span>\s*<span className=\{carsValues\.dropoffDate \? "text-slate-900" : "text-slate-500"\}>\{carsReturnDateDisplay\}/);
  assert.equal(source.slice(source.indexOf("const carsDateSummary"), source.indexOf("const formatCarsTime")).includes("chooseRentalDates"), false);
});

test("source contract: homepage Rental Dates alone uses a decorative Calendar and hides its chevron", () => {
  const rentalDatesLauncher = carsBranch.slice(
    carsBranch.indexOf('<CarsSummaryField id="homepage-cars-rental-dates"'),
    carsBranch.indexOf("<CarsRentalDatePickerContent"),
  );
  assert.match(rentalDatesLauncher, /leadingIcon=\{<Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" \/>\}/);
  assert.match(rentalDatesLauncher, /showChevron=\{false\}/);
  assert.match(source, /showChevron = true/);
  assert.match(source, /\{showChevron \? <ChevronDown aria-hidden="true"/);
});

test("source contract: Rental Dates launcher stays one accessible button with the existing dialog", () => {
  const summaryField = source.slice(source.indexOf("function CarsSummaryField"), source.indexOf("export function SearchTabs"));
  assert.match(summaryField, /<button ref=\{launcherRef\} type="button" aria-expanded=\{open\} aria-controls=\{panelId\} aria-haspopup=\{popupRole\}/);
  assert.match(carsBranch, /id="homepage-cars-rental-dates"[\s\S]*desktopWidth=\{620\}[\s\S]*<CarsRentalDatePickerContent/);
  assert.equal((summaryField.match(/<button/g) ?? []).length, 1);
});

test("source contract: Time and Driver Age retain the default summary-field chevron", () => {
  for (const id of ["homepage-cars-time-range", "homepage-cars-driver-age"]) {
    const start = carsBranch.indexOf(`<CarsSummaryField id="${id}"`);
    const invocation = carsBranch.slice(start, carsBranch.indexOf(">", start) + 1);
    assert.equal(invocation.includes("showChevron"), false, id);
  }
});

test("wide homepage Cars renders one conditional return-location field beside pickup", () => {
  assert.match(returnLocationField, /carsValues\.returnToDifferentLocation \? \(/);
  assert.equal((source.match(/data-testid="cars-return-location-field"/g) ?? []).length, 1);
  assert.match(carsBranch, /cars-pickup-location-field[\s\S]*?\{compactHero \? carsReturnLocationField : null\}[\s\S]*?homepage-cars-rental-dates/);
  assert.match(carsBranch, /Different return location[\s\S]*?\{!compactHero \? carsReturnLocationField : null\}/);
  assert.match(carsBranch, /homepage-cars-driver-age[\s\S]*?Different return location/);
  assert.match(source, /if \(key === "returnToDifferentLocation" && value === false\) \{\s*next\.dropoffLocation = "";/);
  assert.match(returnLocationField, /sm:!bg-white/);
});

test("Cars autocomplete uses responsive presentation and input anchoring", () => {
  assert.match(carsBranch, /ref=\{carsSearchSurfaceRef\} data-testid="cars-search-surface"/);
  const allCarsFields = carsBranch + returnLocationField;
  assert.equal((allCarsFields.match(/presentation="responsive"/g) ?? []).length, 2);
  assert.doesNotMatch(allCarsFields, /fieldAnchorRef=|searchCardRef=/);
  assert.match(returnLocationField, /value=\{carsValues\.dropoffLocation\}/);
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

test("desktop Cars pickers stay open for selection and use viewport-safe homepage placement", () => {
  for (const id of ["homepage-cars-rental-dates", "homepage-cars-time-range", "homepage-cars-driver-age"]) {
    const start = carsBranch.indexOf(`<CarsSummaryField id="${id}"`);
    const invocation = carsBranch.slice(start, carsBranch.indexOf("\n", start));
    assert.match(invocation, /desktopPlacement=\{compactHero \? "above" : "below"\}/, id);
  }

  const timePicker = carsBranch.slice(
    carsBranch.indexOf("<CarsTimeRangePickerContent"),
    carsBranch.indexOf("</CarsSummaryField>", carsBranch.indexOf("<CarsTimeRangePickerContent")),
  );
  const agePicker = carsBranch.slice(
    carsBranch.indexOf("<CarsDriverAgePickerContent"),
    carsBranch.indexOf("</CarsSummaryField>", carsBranch.indexOf("<CarsDriverAgePickerContent")),
  );
  assert.doesNotMatch(timePicker, /setCarsOpenPicker\(null\)/);
  assert.doesNotMatch(agePicker, /setCarsOpenPicker\(null\)/);
});

test("mobile homepage Cars launches every picker in the shared full-screen shell", () => {
  assert.match(carsBranch, /mobilePresentation=\{mobileHomepage \? "shell" : "inline"\}/);
  assert.match(carsBranch, /mobileHomepage && tab === "cars"/);
  assert.match(carsBranch, /<MobileCarLocationPicker/);
  assert.match(carsBranch, /<MobileCarTimePickerDialog/);
  assert.match(carsBranch, /<MobileCarDriverAgePickerDialog/);
  assert.match(carsBranch, /\(\["pickup", "dropoff"\] as const\)\.map/);
  assert.match(carsBranch, /<MobileCarLocationPicker/);
  assert.match(carsBranch, /<MobileDatePickerDialog/);
});

test("mobile Cars fields stay launchers without inline panels or persistent open rings", () => {
  const summaryField = source.slice(source.indexOf("function CarsSummaryField"), source.indexOf("export function SearchTabs"));
  assert.match(summaryField, /mobilePresentation === "inline" \? <div className="mt-3">\{panel\}<\/div> : null/);
  assert.match(source, /focus-within:border-\[#dee5ed\] focus-within:ring-0 sm:rounded-xl/);
  assert.match(carsBranch, /carsPickupLauncherRef[\s\S]*sm:hidden/);
  assert.match(returnLocationField, /carsDropoffLauncherRef[\s\S]*sm:hidden/);
});

test("mobile time and age selection use pale connected rows and filled check indicators", () => {
  const pickerSource = readFileSync("src/components/search/CarsPickerContent.tsx", "utf8");
  assert.match(pickerSource, /data-selected-time-indicator/);
  assert.match(pickerSource, /data-selected-age-indicator/);
  assert.match(pickerSource, /bg-\[#eff6ff\] font-bold text-\[#075EE8\]/);
  assert.match(pickerSource, /selected \? "bg-\[#075EE8\]" : "border border-slate-400"/);
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
