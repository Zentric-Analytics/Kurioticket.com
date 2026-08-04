import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const form = readFileSync(new URL("./DealsSearchForm.tsx", import.meta.url), "utf8");
const mobilePickerShell = readFileSync(
  new URL("./FlightMobilePickerShell.tsx", import.meta.url),
  "utf8",
);

test("Deals planner renders coordinated product rows and a final travellers row", () => {
  assert.match(form, /aria-labelledby="deals-flight-heading"/);
  assert.match(form, /htmlFor="deals-flight-cabin"/);
  assert.match(form, /aria-labelledby="deals-hotel-heading"/);
  assert.match(form, /aria-labelledby="deals-car-heading"/);
  assert.match(form, /data-deals-travellers-row/);
  assert.match(form, /\{t\("deals\.travellersRooms"\)\}/);
  assert.match(form, /data-deals-travellers-row[\s\S]*\{searchDealsButton\}/);
  assert.doesNotMatch(form, /\{t\("deals\.travelersCabinLabel"\)\}/);
});

test("the approved primary row field labels are explicit", () => {
  assert.match(form, /t\(kind\)/);
  assert.match(form, /\{t\("deals\.cabinClass"\)\}/);
  assert.match(form, /\{t\("deals\.pickup"\)\}/);
  assert.match(form, /\{t\("deals\.returnLocation"\)\}/);
  assert.match(form, /\{t\("deals\.sameAsPickup"\)\}/);
  assert.match(form, /\{t\("deals\.carOptions"\)\}/);
});

test("the shared travellers picker keeps its mobile behavior without an unsupported marker", () => {
  assert.match(
    form,
    /onClick=\{\(\) => travelersOpen \? dismissDesktopTravelers\(\) : openTravelers\(\)\}/,
  );
  assert.match(
    form,
    /<FlightMobilePickerShell open=\{mobileTravelersOpen\}[\s\S]*?onClose=\{closeMobileTravelers\}[\s\S]*?>\{travelersPicker\}<\/FlightMobilePickerShell>/,
  );
  assert.match(form, /commitTravelers\(true\); requestClose\(\);/);
  assert.doesNotMatch(form, /pickerMarker="shared-travellers"/);
});

test("the mobile picker shell retains only its implemented marker semantics", () => {
  assert.match(
    mobilePickerShell,
    /pickerMarker\?: "flight-date" \| "traveler-cabin";/,
  );
  assert.match(
    mobilePickerShell,
    /pickerMarker === "flight-date" \? "true" : undefined/,
  );
  assert.match(
    mobilePickerShell,
    /pickerMarker === "traveler-cabin" \? "true" : undefined/,
  );
  assert.doesNotMatch(mobilePickerShell, /shared-travellers/);
});
