import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const form = readFileSync(
  new URL("./DealsSearchForm.tsx", import.meta.url),
  "utf8",
);
const dealsSearchParams = readFileSync(
  new URL("../../lib/deals/dealsSearchParams.ts", import.meta.url),
  "utf8",
);
const mobilePickerShell = readFileSync(
  new URL("./FlightMobilePickerShell.tsx", import.meta.url),
  "utf8",
);

test("product selection remains one pressed-button multi-selector", () => {
  assert.equal(form.match(/data-deals-product-selector/g)?.length, 1);
  assert.match(form, /dealsProductOrder\.map/);
  assert.match(form, /aria-pressed=\{selected\}/);
  assert.match(form, /toggleProduct\(product\)/);
  assert.doesNotMatch(form, /aria-checked=\{selected\}/);
});

test("shared travellers and Flight-only Cabin Class are upper controls", () => {
  const upper =
    form.match(/<div\s+data-deals-upper-controls[\s\S]*?<\/fieldset>/)?.[0] ??
    "";
  assert.match(upper, /ref=\{travelersLauncherRef\}/);
  assert.match(upper, /\{travelerSummary\}/);
  assert.match(upper, /\{included\.flight \? \(/);
  assert.match(upper, /data-deals-upper-cabin/);
  assert.match(upper, /id="deals-flight-cabin"/);
  assert.equal(form.match(/ref=\{travelersLauncherRef\}/g)?.length, 1);
  assert.equal(form.match(/id="deals-flight-cabin"/g)?.length, 1);
});

test("Flight primary connected row contains airports, swap, and combined dates only", () => {
  const flightFields =
    form.match(
      /<div\s+data-deals-field-content="flight"[\s\S]*?<div>\{errorBlock\("flight"\)\}<\/div>/,
    )?.[0] ?? "";
  assert.match(flightFields, /\["origin", "destination"\]/);
  assert.match(flightFields, /swapDealsFlightAirports/);
  assert.match(flightFields, /ref=\{flightDatesLauncherRef\}/);
  assert.match(flightFields, /\{t\("travelDates"\)\}/);
  assert.doesNotMatch(flightFields, /deals-flight-cabin/);
  assert.doesNotMatch(flightFields, /departing|returning/i);
});

test("Flight trip type retains radio and arrow-key semantics", () => {
  assert.match(form, /role="radiogroup"/);
  assert.match(form, /role="radio"/);
  assert.match(form, /aria-checked=\{search\.flightTripType === value\}/);
  assert.match(form, /"ArrowRight",\s*"ArrowLeft",\s*"ArrowDown",\s*"ArrowUp"/);
  assert.match(form, /setDealsFlightTripType\(/);
});

test("linked Flight and Hotel suppress the ordinary Stay row", () => {
  assert.match(
    form,
    /included\.hotel &&\s*!?\s*\(?[\s\S]*?!search\.stayDestinationLinked[\s\S]*?!search\.stayDatesLinked/,
  );
  assert.match(form, /data-deals-hotel-overrides=\{included\.flight/);
  assert.match(
    form,
    /data-deals-heading-rail="stay"[\s\S]{0,80}className="sr-only"/,
  );
});

test("Hotel without Flight uses its existing controls as the primary editor", () => {
  assert.match(form, /data-deals-hotel-primary=\{!included\.flight/);
  assert.match(
    form,
    /\(!included\.flight \|\| !search\.stayDestinationLinked\)/,
  );
  assert.match(form, /ref=\{hotelDestinationInputRef\}/);
  assert.match(form, /ref=\{hotelDatesLauncherRef\}/);
  assert.match(
    form,
    /applySharedDestination\(current, (?:value|option\.searchValue)\)/,
  );
  assert.match(form, /applySharedDates/);
});

test("detached Hotel fields remain visible and recoverable", () => {
  assert.match(form, /!search\.stayDestinationLinked/);
  assert.match(form, /relinkInheritedField\(current, "stayDestination"\)/);
  assert.match(form, /deals\.useMainDestination/);
  assert.match(form, /!search\.stayDatesLinked/);
  assert.match(form, /relinkInheritedField\(current, "stayDates"\)/);
  assert.match(form, /deals\.useMainTravelDates/);
});

test("Car stays a package product without rendering a standalone search row", () => {
  assert.match(form, /dealsProductOrder\.map/);
  assert.match(dealsSearchParams, /"hotel-flight-car"/);
  assert.match(dealsSearchParams, /"flight-car"/);
  assert.match(dealsSearchParams, /"hotel-car"/);
  assert.doesNotMatch(form, /data-deals-field-content="car"/);
  assert.doesNotMatch(form, /deals-car-pickup/);
  assert.doesNotMatch(form, /deals-car-(?:desktop|mobile)/);
  assert.doesNotMatch(form, /carDatesLauncherRef/);
  assert.doesNotMatch(form, /deals\.carOptions/);
  assert.doesNotMatch(form, /carsSearch\.(?:pickup|return)Time/);
  assert.doesNotMatch(form, /carsSearch\.driverAge/);
});

test("detached historical Car inputs have compact relink actions only", () => {
  const recovery =
    form.match(/<aside[\s\S]*?data-deals-car-recovery[\s\S]*?<\/aside>/)?.[0] ??
    "";
  assert.match(recovery, /!search\.carPickupLinked/);
  assert.match(recovery, /relinkInheritedField\(current, "carPickup"\)/);
  assert.match(recovery, /!search\.carDatesLinked/);
  assert.match(recovery, /relinkInheritedField\(current, "carDates"\)/);
  assert.doesNotMatch(recovery, /<input|<select|DatePicker/);
});

test("Flight and Hotel primary controls cover every Car package", () => {
  assert.match(form, /included\.flight/);
  assert.match(form, /\["origin", "destination"\]/);
  assert.match(form, /ref=\{flightDatesLauncherRef\}/);
  assert.match(
    form,
    /data-deals-hotel-primary=\{!included\.flight \? "true" : undefined\}/,
  );
  assert.match(form, /ref=\{hotelDestinationInputRef\}/);
  assert.match(form, /ref=\{hotelDatesLauncherRef\}/);
});

test("exactly one compact search action remains", () => {
  assert.equal(form.match(/type="submit"/g)?.length, 1);
  assert.match(form, /data-deals-search-actions/);
});

test("mobile touch targets and full-width guided preview remain", () => {
  assert.match(form, /data-deals-product=\{product\}[\s\S]{0,300}min-h-11/);
  assert.match(form, /type="submit"[\s\S]{0,180}min-h-12/);
  assert.match(form, /className="w-full">\{guidedPreviewPanel\}<\/div>/);
  assert.match(
    form,
    /min-h-11[\s\S]*ref=\{travelersLauncherRef\}|ref=\{travelersLauncherRef\}[\s\S]*min-h-11/,
  );
  assert.match(
    mobilePickerShell,
    /pickerMarker\?: "flight-date" \| "traveler-cabin";/,
  );
  assert.match(form, /dialogId="deals-mobile-travellers"/);
  assert.match(form, /dialogId="deals-flight-mobile-dates"/);
});
