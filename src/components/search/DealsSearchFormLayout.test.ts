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
const resultsCar = form.slice(
  form.indexOf("data-deals-results-car"),
  form.indexOf("data-deals-results-travellers"),
);

test("LANDING CONTRACT keeps the approved compact composition", () => {
  assert.match(form, /data-deals-layout=\{variant\}/);
  assert.match(form, /data-deals-upper-controls/);
  assert.match(form, /data-deals-upper-cabin/);
  assert.match(form, /connectedShell/);
  assert.match(form, /variant === "landing"[\s\S]*data-deals-car-recovery/);
  assert.match(form, /variant === "landing"[\s\S]*data-deals-search-actions/);
  assert.match(form, /guidedPreviewPanel/);
  assert.doesNotMatch(page, /variant="results"/);
  assert.match(page, /<DealsSearchForm/);
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

test("there is exactly one runtime submit action shared by both variants", () => {
  assert.equal(form.match(/type="submit"/g)?.length, 1);
  assert.match(
    form,
    /variant === "results"[\s\S]*deals\.results\.editor\.update/,
  );
});
