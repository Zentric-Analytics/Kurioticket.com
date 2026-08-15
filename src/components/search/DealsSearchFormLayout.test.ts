import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const form = readFileSync(
  new URL("./DealsSearchForm.tsx", import.meta.url),
  "utf8",
);
const primaryControls = form.slice(
  form.indexOf("const primaryPackageControls"),
  form.indexOf("return (", form.indexOf("const primaryPackageControls")),
);
const flightRow = form.slice(
  form.indexOf('data-deals-main-search-row="flight"'),
  form.indexOf("{included.hotel &&"),
);
const hotelRow = form.slice(
  form.indexOf('data-deals-main-search-row="stay"'),
  form.indexOf('variant === "landing" &&\n      included.car'),
);
const stayOptions = form.slice(
  form.indexOf("data-deals-stay-options"),
  form.indexOf("{warning}"),
);
const normalResultsSlice = form.slice(
  form.indexOf("<form"),
  form.indexOf("{warning}"),
);

test("landing and Results share one package-aware main-row composition", () => {
  assert.match(form, /data-deals-package-selector-variant=\{variant\}/);
  assert.match(flightRow, /data-deals-main-search-variant=\{variant\}/);
  assert.match(flightRow, /data-deals-results-main-search-row/);
  assert.match(hotelRow, /data-deals-results-main-search-row/);
  assert.match(
    flightRow,
    /data-deals-flight-destination[\s\S]*flightDatesLauncherRef[\s\S]*primaryPackageControls/,
  );
  assert.match(
    hotelRow,
    /data-deals-hotel-destination[\s\S]*hotelDatesLauncherRef[\s\S]*primaryPackageControls/,
  );
  assert.match(
    primaryControls,
    /data-deals-package-travellers[\s\S]*data-deals-package-cabin[\s\S]*searchDealsButton/,
  );
});

test("Results has no separate product or lower Travellers sections", () => {
  for (const marker of [
    "data-deals-results-flight",
    "data-deals-results-stay",
    "data-deals-results-car",
    "data-deals-results-travellers",
  ])
    assert.doesNotMatch(normalResultsSlice, new RegExp(marker));
  assert.doesNotMatch(normalResultsSlice, /data-deals-heading-rail="car"/);
  assert.doesNotMatch(normalResultsSlice, /deals-car-pickup|deals-car-return/);
});

test("Flight package row order is route, dates, Travellers, Cabin, submit", () => {
  const rowPositions = [
    "data-deals-flight-destination",
    "flightDatesLauncherRef",
    "primaryPackageControls",
  ].map((value) => flightRow.indexOf(value));
  const controlPositions = [
    "data-deals-package-travellers",
    "data-deals-package-cabin",
    "searchDealsButton",
  ].map((value) => primaryControls.indexOf(value));
  for (const positions of [rowPositions, controlPositions]) {
    assert.ok(positions.every((position) => position >= 0));
    assert.deepEqual(
      [...positions].sort((left, right) => left - right),
      positions,
    );
  }
  assert.match(flightRow, /flightRowDesktopClasses/);
  assert.match(form, /min-\[1050px\]:grid-cols/);
});

test("Results Flight layout waits for safe widths and keeps its controls in sync", () => {
  assert.match(
    form,
    /variant === "results"[\s\S]*min-\[1180px\]:grid-cols-\[minmax\(0,2\.6fr\)_minmax\(150px,1fr\)_minmax\(185px,1\.15fr\)_minmax\(135px,0\.8fr\)_minmax\(165px,auto\)\][\s\S]*min-\[1050px\]:grid-cols-\[minmax\(0,3fr\)_minmax\(125px,1\.05fr\)_minmax\(145px,1\.15fr\)_minmax\(105px,0\.8fr\)_minmax\(156px,auto\)\]/,
  );
  for (const desktopClasses of [
    "packageTravellersDesktopClasses",
    "packageCabinDesktopClasses",
    "packageSearchDesktopClasses",
  ]) {
    const contract = form.slice(
      form.indexOf(`const ${desktopClasses}`),
      form.indexOf(";", form.indexOf(`const ${desktopClasses}`)),
    );
    assert.match(contract, /variant === "results"/);
    assert.match(contract, /min-\[1180px\]:/);
    assert.match(contract, /min-\[1050px\]:/);
  }
});

test("Flight package labels stay on one line when the row is horizontal", () => {
  assert.match(
    primaryControls,
    /whitespace-nowrap[^>]*>[\s\S]*\{travelersControlLabel\}/,
  );
  assert.match(
    primaryControls,
    /whitespace-nowrap[^>]*[\s\S]*\{t\("deals\.cabinClass"\)\}/,
  );
});

test("Hotel and Car uses the safe destination, dates, Travellers, submit row without Flight controls", () => {
  const positions = [
    "data-deals-hotel-destination",
    "hotelDatesLauncherRef",
    "primaryPackageControls",
  ].map((value) => hotelRow.indexOf(value));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(
    [...positions].sort((a, b) => a - b),
    positions,
  );
  assert.match(
    hotelRow,
    /lg:grid-cols-\[minmax\(0,2fr\)_minmax\(150px,1fr\)_minmax\(180px,1fr\)_minmax\(156px,auto\)\]/,
  );
  assert.doesNotMatch(hotelRow, /data-deals-flight-destination/);
});

test("adaptive Travellers label and Flight-only cabin are shared by both variants", () => {
  assert.match(form, /const travelersControlLabel = !included\.hotel/);
  assert.match(primaryControls, /\{travelersControlLabel\}/);
  assert.match(primaryControls, /\{included\.flight \? \(/);
  assert.match(primaryControls, /search\.flightCabinClass/);
  assert.match(
    primaryControls,
    /id=\{`deals-\$\{variant\}-flight-cabin`\}|id="deals-flight-cabin"/,
  );
});

test("Hotel plus Flight modes expose only the date-specific Stay override below the row", () => {
  assert.match(
    form,
    /const supportsStayDateOverride = included\.hotel && included\.flight/,
  );
  assert.match(stayOptions, /data-deals-change-stay-dates/);
  assert.match(stayOptions, /checked=\{!search\.stayDatesLinked\}/);
  assert.match(stayOptions, /customizeInheritedField\(current, "stayDates"/);
  assert.match(stayOptions, /relinkInheritedField\(current, "stayDates"\)/);
  assert.match(stayOptions, /data-deals-stay-dates/);
  assert.match(stayOptions, /hotelDatesLauncherRef/);
  assert.match(stayOptions, /hotelDatesSummary/);
  assert.match(stayOptions, /border-b border-slate-200/);
});

test("legacy Results normalization relinks hidden overrides and preserves custom Flight Stay dates", () => {
  const normalizer = form.slice(
    form.indexOf("export function normalizeUnifiedResultsSearch"),
    form.indexOf("export function DealsSearchForm"),
  );
  assert.match(normalizer, /relinkInheritedField\(next, "stayDestination"\)/);
  assert.match(
    normalizer,
    /if \(!included\.flight \|\| next\.stayDatesLinked\)/,
  );
  assert.match(normalizer, /relinkInheritedField\(next, "stayDates"\)/);
  assert.match(normalizer, /relinkInheritedField\(next, "carPickup"\)/);
  assert.match(normalizer, /relinkInheritedField\(next, "carDates"\)/);
  assert.match(normalizer, /setCarReturnMode\(next, false\)/);
});

test("normalization occurs on authoritative edits, mode changes, and Results submit, not initialization", () => {
  const initialization = form.slice(
    form.indexOf("useState<DealsSearch>"),
    form.indexOf("const [errors"),
  );
  assert.doesNotMatch(initialization, /normalizeUnifiedResultsSearch/);
  assert.match(
    form,
    /const applyAuthoritativeDestination[\s\S]*normalizeUnifiedResultsSearch\(current\)/,
  );
  assert.match(
    form,
    /const applyAuthoritativeDates[\s\S]*normalizeUnifiedResultsSearch\(current\)/,
  );
  assert.match(
    form,
    /transitionDealsMode\(current, mode\)[\s\S]*normalizeUnifiedResultsSearch\(next\)/,
  );
  assert.match(
    form,
    /const submittedSearch =[\s\S]*normalizeUnifiedResultsSearch\(search\)[\s\S]*onSubmitSearch\(submittedSearch\)/,
  );
});

test("desktop Travellers popover remains viewport-aware and scrolling-safe", () => {
  const popover = form.slice(
    form.indexOf("function DealsFlightPopover"),
    form.indexOf("function DealsDestinationPopover"),
  );
  assert.match(popover, /getBoundingClientRect/);
  assert.match(popover, /openAbove/);
  assert.match(popover, /maxHeight/);
  assert.match(form, /overflow-y-auto/);
  assert.match(form, /data-deals-flight-travellers-popover/);
  assert.match(form, /draftHotelRooms >= 6/);
  assert.match(form, /rooms: Math\.max\(1, Math\.min\(6, draftHotelRooms\)\)/);
});

test("each mutually exclusive presentation retains its existing submit source", () => {
  assert.equal(form.match(/type="submit"/g)?.length, 2);
  assert.match(form, /mobileHomepageControls[\s\S]*type="submit"/);
  assert.match(form, /const searchDealsButton =[\s\S]*type="submit"/);
});

test("desktop landing keeps the approved controls in one fixed-height row", () => {
  assert.match(form, /presentation\?: "default" \| "mobile-homepage" \| "desktop-landing"/);
  assert.match(form, /data-deals-desktop-package-selector/);
  assert.match(form, /lg:h-\[78px\][\s\S]*lg:grid-cols-\[minmax\(0,2\.5fr\)_minmax\(0,1\.3fr\)_minmax\(0,1\.3fr\)_minmax\(0,1\.05fr\)_minmax\(148px,\.95fr\)\]/);
  for (const control of [
    "origin",
    "destination",
    "travelDates",
    "data-deals-package-travellers",
    "data-deals-package-cabin",
    "deals.searchButton",
  ]) assert.match(form, new RegExp(control));
  assert.match(form, /swapDealsFlightAirports[\s\S]*swapFlightAirports/);
  assert.match(primaryControls, /value=\{search\.flightCabinClass\}/);
});

test("desktop-only styling leaves mobile homepage and results gates intact", () => {
  assert.match(form, /const isDesktopLanding =[\s\S]*presentation === "desktop-landing"/);
  assert.match(form, /presentation === "mobile-homepage"/);
  assert.match(form, /variant === "results"/);
  assert.match(form, /data-deals-results-layout/);
});
