import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const form = readFileSync(
  new URL("./DealsSearchForm.tsx", import.meta.url),
  "utf8",
);
const page = readFileSync(
  new URL("../../app/deals/page.tsx", import.meta.url),
  "utf8",
);

const beforeResultsCar = form.slice(0, form.indexOf("data-deals-results-car"));
const resultsCabin = form.slice(
  form.indexOf('data-deals-results-segment="cabin"'),
  form.indexOf("data-deals-results-stay"),
);
const resultsStay = form.slice(
  form.indexOf("data-deals-results-stay"),
  form.indexOf("data-deals-results-car"),
);
const resultsCar = form.slice(
  form.indexOf("data-deals-results-car"),
  form.indexOf("data-deals-results-travellers"),
);
const landingPrimaryControls = form.slice(
  form.indexOf("const landingPrimaryControls"),
  form.indexOf("return (", form.indexOf("const landingPrimaryControls")),
);
const landingStayOptions = form.slice(
  form.indexOf("data-deals-landing-stay-options"),
  form.indexOf("data-deals-landing-stay-dates"),
);
const landingStayDates = form.slice(
  form.indexOf("data-deals-landing-stay-dates"),
  form.indexOf(") : null}", form.indexOf("data-deals-landing-stay-dates")),
);
const flightLandingRow = form.slice(
  form.indexOf('data-deals-field-content="flight"'),
  form.indexOf("data-deals-results-stay"),
);
const stayLandingRow = form.slice(
  form.indexOf('data-deals-field-content="stay"'),
  form.indexOf("data-deals-results-car"),
);

test("LANDING CONTRACT integrates shared controls into the primary row", () => {
  assert.match(form, /data-deals-layout=\{variant\}/);
  assert.match(form, /data-deals-package-selector/);
  assert.match(form, /data-deals-landing-main-search-row/);
  assert.match(landingPrimaryControls, /data-deals-landing-travellers/);
  assert.match(landingPrimaryControls, /travelersLauncherRef/);
  assert.match(landingPrimaryControls, /travelerSummary/);
  assert.match(landingPrimaryControls, /data-deals-landing-cabin/);
  assert.match(landingPrimaryControls, /search\.flightCabinClass/);
  assert.match(landingPrimaryControls, /\{searchDealsButton\}/);
  assert.doesNotMatch(form, /data-deals-landing-lower-controls/);
  assert.doesNotMatch(form, /data-deals-landing-action-row/);
  assert.match(form, /guidedPreviewPanel/);
  assert.doesNotMatch(page, /variant="results"/);
  assert.match(page, /<DealsSearchForm/);
});

test("Flight landing row keeps route, dates, shared controls, and CTA in order", () => {
  const positions = [
    "data-deals-flight-destination",
    "flightDatesLauncherRef",
    "landingPrimaryControls",
  ].map((value) => flightLandingRow.indexOf(value));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(
    [...positions].sort((a, b) => a - b),
    positions,
  );
  assert.match(
    flightLandingRow,
    /min-\[1050px\]:grid-cols-\[minmax\(0,3fr\)[\s\S]*minmax\(156px,auto\)\]/,
  );
  assert.match(
    landingPrimaryControls,
    /data-deals-landing-travellers[\s\S]*data-deals-landing-cabin[\s\S]*\{searchDealsButton\}/,
  );
});

test("Hotel and Car landing row has no empty Flight or Cabin tracks", () => {
  const positions = [
    "data-deals-hotel-destination",
    "hotelDatesLauncherRef",
    "landingPrimaryControls",
  ].map((value) => stayLandingRow.indexOf(value));

  assert.match(stayLandingRow, /data-deals-landing-main-search-row/);
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(
    [...positions].sort((a, b) => a - b),
    positions,
  );
  assert.match(
    stayLandingRow,
    /!included\.flight[\s\S]*landingPrimaryControls/,
  );
  assert.match(
    stayLandingRow,
    /lg:grid-cols-\[minmax\(0,2fr\)_minmax\(150px,1fr\)_minmax\(180px,1fr\)_minmax\(156px,auto\)\]/,
  );
  assert.doesNotMatch(stayLandingRow, /data-deals-flight-destination/);
  assert.doesNotMatch(stayLandingRow, /data-deals-landing-cabin/);
  assert.doesNotMatch(
    stayLandingRow,
    /min-\[1050px\]:grid-cols-\[minmax\(0,2fr\)/,
  );
});

test("landing controls use transparent, collision-safe integrated segments", () => {
  assert.match(form, /const landingActionSegment =\s*[\s\S]*bg-transparent/);
  assert.match(form, /const landingActionControl =\s*[\s\S]*border-0/);
  assert.match(
    landingPrimaryControls,
    /data-deals-landing-travellers[\s\S]*landingActionSegment/,
  );
  assert.match(
    landingPrimaryControls,
    /data-deals-landing-cabin[\s\S]*landingActionSegment/,
  );
  assert.match(
    landingPrimaryControls,
    /id="deals-flight-cabin"[\s\S]*landingActionControl/,
  );
  assert.match(landingPrimaryControls, /min-\[1050px\]:border-s/);
  assert.match(landingPrimaryControls, /min-w-0/);
  assert.match(
    form,
    /const landingTravellersDesktopClasses = included\.flight[\s\S]*lg:min-h-\[54px\] lg:border-b-0 lg:border-s/,
  );
  assert.match(
    form,
    /const landingSearchDesktopClasses = included\.flight[\s\S]*lg:h-full lg:min-w-\[156px\] lg:items-center lg:border-s lg:border-slate-200 lg:px-2/,
  );
  assert.match(
    landingPrimaryControls,
    /landingTravellersDesktopClasses[\s\S]*\{searchDealsButton\}/,
  );
});

test("Stay options follow the main row and never contain the CTA", () => {
  assert.ok(
    form.indexOf("data-deals-landing-main-search-row") <
      form.indexOf("data-deals-change-stay-dates"),
  );
  assert.ok(
    form.indexOf("data-deals-change-stay-dates") <
      form.indexOf("data-deals-landing-stay-dates"),
  );
  assert.match(landingStayOptions, /data-deals-change-stay-dates/);
  assert.doesNotMatch(landingStayOptions, /searchDealsButton/);
});

test("landing Stay-date override reuses linked Hotel calendar state", () => {
  assert.match(landingStayOptions, /type="checkbox"/);
  assert.match(landingStayOptions, /checked=\{!search\.stayDatesLinked\}/);
  assert.match(
    landingStayOptions,
    /customizeInheritedField\(current, "stayDates", \{/,
  );
  assert.match(
    landingStayOptions,
    /relinkInheritedField\(current, "stayDates"\)/,
  );
  assert.match(landingStayDates, /hotelDatesLauncherRef/);
  assert.match(landingStayDates, /hotelDatesOpen \|\| mobileHotelDatesOpen/);
  assert.match(landingStayDates, /hotelDatesSummary/);
  assert.doesNotMatch(form, /useState\([^\n]*changeStayDates/i);
});

test("landing Stay-date launcher uses an integrated line-based treatment", () => {
  assert.match(landingStayDates, /border-b/);
  assert.match(landingStayDates, /border-slate-200/);
  assert.match(landingStayDates, /landingActionSegment/);
  assert.doesNotMatch(landingStayDates, /\$\{field\}/);
  assert.doesNotMatch(landingStayDates, /rounded-xl/);
});

test("landing unlinked Stay dates do not revive the legacy Stay section", () => {
  const stayRenderCondition = form.slice(
    form.indexOf("{included.hotel &&"),
    form.indexOf("data-deals-results-stay"),
  );
  assert.doesNotMatch(stayRenderCondition, /!search\.stayDatesLinked/);
  assert.match(stayRenderCondition, /!search\.stayDestinationLinked/);
  assert.match(resultsStay, /variant === "results"/);
});

test("RESULTS MODIFY-SEARCH CONTRACT moves shared controls into full rows", () => {
  assert.match(form, /data-deals-results-layout/);
  assert.match(form, /data-deals-results-flight/);
  assert.match(form, /data-deals-results-stay/);
  assert.match(form, /data-deals-results-car/);
  assert.match(form, /data-deals-results-travellers/);
  assert.match(form, /id="deals-results-flight-cabin"/);
  assert.match(
    form,
    /variant === "results" \|\|[\s\S]*!search\.stayDestinationLinked/,
  );
  assert.match(form, /!search\.stayDatesLinked/);
  assert.match(form, /included\.car && variant === "results"/);
  assert.match(
    form,
    /ref=\{travelersLauncherRef\}[\s\S]*\{searchDealsButton\}/,
  );
});

test("results sections preserve Flight, Stay, Car, Travellers order", () => {
  const markers = [
    "data-deals-results-flight",
    "data-deals-results-stay",
    "data-deals-results-car",
    "data-deals-results-travellers",
  ];
  const positions = markers.map((marker) => form.indexOf(marker));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(
    [...positions].sort((a, b) => a - b),
    positions,
  );
});

test("results Flight exposes airports, swap, dates and shared cabin state", () => {
  assert.match(beforeResultsCar, /\["origin", "destination"\]/);
  assert.match(beforeResultsCar, /swapDealsFlightAirports/);
  assert.match(beforeResultsCar, /flightDatesLauncherRef/);
  assert.match(beforeResultsCar, /flightCabinClass/);
  assert.match(beforeResultsCar, /update\(\s*"flightCabinClass"/);
  assert.match(resultsCabin, /<select/);
  assert.match(resultsCabin, /data-deals-results-segment="cabin"/);
  assert.match(resultsCabin, /resultsSegment/);
  assert.match(resultsCabin, /lg:border-s/);
  assert.doesNotMatch(
    resultsCabin,
    /rounded-xl border border-slate-300 bg-white px-3 py-2/,
  );
});

test("results Stay uses a plain segmented row instead of the connected card", () => {
  assert.match(resultsStay, /data-deals-results-row=/);
  assert.match(
    resultsStay,
    /variant === "results" \? resultsRow : connectedShell/,
  );
  assert.match(resultsStay, /variant === "results" \? resultsSegment/);
  assert.doesNotMatch(
    resultsStay,
    /data-deals-results-row[^>]*className=\{`\$\{connectedShell\}/,
  );
});

test("results Stay and Car edit and relink inherited shared fields", () => {
  assert.match(form, /customizeInheritedField\([\s\S]*"stayDestination"/);
  assert.match(form, /relinkInheritedField\(current, "stayDestination"\)/);
  assert.match(form, /customizeInheritedField\([\s\S]*"stayDates"/);
  assert.match(form, /relinkInheritedField\(current, "stayDates"\)/);
  assert.match(resultsCar, /customizeInheritedField\([\s\S]*"carPickup"/);
  assert.match(resultsCar, /relinkInheritedField\(current, "carPickup"\)/);
  assert.match(resultsCar, /carDatesLauncherRef/);
  assert.match(resultsCar, /relinkInheritedField\(current, "carDates"\)/);
  assert.match(resultsCar, /setCarReturnMode\(current, false\)/);
});

test("normal results Car row does not expose times or driver age", () => {
  assert.doesNotMatch(
    resultsCar,
    /carTimesLauncherRef|carDriverAge|carOptions|pickupTime|returnTime/,
  );
});

test("results Car heading and fields use the same plain stacked section layout", () => {
  assert.match(resultsCar, /data-deals-heading-rail="car"/);
  assert.match(resultsCar, /data-deals-results-row="car"/);
  assert.match(resultsCar, /data-deals-results-segment="car-pickup"/);
  assert.match(resultsCar, /data-deals-results-segment="car-return"/);
  assert.match(resultsCar, /data-deals-results-segment="car-dates"/);
  assert.doesNotMatch(resultsCar, /lg:grid-cols-\[11rem_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(resultsCar, /className=\{`\$\{connectedShell\}/);
});

test("results Travellers remains an accessible plain launcher beside the CTA", () => {
  const travellersStart = form.indexOf("data-deals-results-travellers");
  const travellers = form.slice(
    travellersStart,
    form.indexOf("data-deals-search-actions", travellersStart),
  );
  assert.ok(travellersStart >= 0);
  assert.match(travellers, /<button[\s\S]*type="button"/);
  assert.match(travellers, /ref=\{travelersLauncherRef\}/);
  assert.match(travellers, /aria-expanded=/);
  assert.match(travellers, /aria-haspopup="dialog"/);
  assert.match(travellers, /aria-controls=/);
  assert.match(travellers, /data-deals-results-plain-launcher="travellers"/);
  assert.match(travellers, /resultsPlainLauncher/);
  assert.match(travellers, /\{t\("deals\.travellersRooms"\)\}/);
  assert.match(travellers, /\{travelerSummary\}/);
  assert.match(travellers, /<ChevronDown/);
  assert.match(travellers, /\{searchDealsButton\}/);
  assert.doesNotMatch(
    travellers,
    /<h2[^>]*>[\s\S]*?\{t\("deals\.travellersRooms"\)\}[\s\S]*?<\/h2>/,
  );
  assert.doesNotMatch(
    travellers.slice(0, travellers.indexOf("searchDealsButton")),
    /className=\{`\$\{field\}/,
  );
  assert.match(form, /type="submit"[\s\S]*rounded-xl bg-\[#004BB8\]/);
  assert.equal(form.match(/type="submit"/g)?.length, 1);
});

test("desktop Travellers popover stays viewport-aware with contained scrolling", () => {
  const popover = form.slice(
    form.indexOf("function DealsFlightPopover"),
    form.indexOf("function DealsDestinationPopover"),
  );
  assert.match(popover, /anchorRef\.current\.getBoundingClientRect\(\)/);
  assert.match(popover, /window\.innerHeight - rect\.bottom - gap - gutter/);
  assert.match(popover, /rect\.top - gap - gutter/);
  assert.match(popover, /openAbove = below < desiredHeight && above > below/);
  assert.match(popover, /bottom: window\.innerHeight - rect\.top \+ gap/);
  assert.match(popover, /maxHeight/);
  assert.match(popover, /addEventListener\("resize", updatePosition\)/);
  assert.match(popover, /addEventListener\("scroll", updatePosition, true\)/);
  assert.match(popover, /data-deals-flight-travellers-popover/);
  assert.match(popover, /overflow-hidden/);

  const desktopPicker = form.slice(
    form.indexOf('id="deals-desktop-travellers"'),
    form.indexOf(
      "<FlightMobilePickerShell",
      form.indexOf('id="deals-desktop-travellers"'),
    ),
  );
  assert.match(desktopPicker, /overflow-y-auto/);
  assert.match(desktopPicker, /overflow-x-hidden/);
  assert.match(desktopPicker, /shrink-0/);
});

test("shared Travellers picker keeps Hotel rooms and their commit path", () => {
  assert.match(form, /\{included\.hotel \? \([\s\S]*t\("rooms"\)/);
  assert.match(form, /draftHotelRooms <= 1/);
  assert.match(form, /Math\.max\(1, value - 1\)/);
  assert.match(form, /draftHotelRooms >= 6/);
  assert.match(form, /Math\.min\(6, value \+ 1\)/);
  assert.match(form, /rooms: Math\.max\(1, Math\.min\(6, draftHotelRooms\)\)/);
  assert.match(form, /hotelRooms: normalized\.rooms/);
});

test("there is exactly one runtime submit action shared by both variants", () => {
  assert.equal(form.match(/type="submit"/g)?.length, 1);
  assert.match(
    form,
    /variant === "results"[\s\S]*deals\.results\.editor\.update/,
  );
});
