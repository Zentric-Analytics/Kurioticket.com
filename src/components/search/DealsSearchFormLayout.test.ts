import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const form = readFileSync(new URL("./DealsSearchForm.tsx", import.meta.url), "utf8");

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
