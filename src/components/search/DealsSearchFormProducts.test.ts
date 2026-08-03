import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const form = readFileSync(new URL("./DealsSearchForm.tsx", import.meta.url), "utf8");
const modify = readFileSync(new URL("../results/deals/DealsModifySearchDialog.tsx", import.meta.url), "utf8");
test("one shared selector renders three pressed product buttons rather than package radios", () => { assert.match(form, /dealsProductOrder\.map/); assert.match(form, /data-deals-product=\{product\}/); assert.match(form, /type="button" aria-pressed=\{selected\}/); assert.match(form, /hotel: \{ label: "deals\.journey\.step\.hotel"/); assert.match(form, /flight: \{ label: "deals\.journey\.step\.flight"/); assert.match(form, /car: \{ label: "deals\.journey\.step\.car"/); assert.doesNotMatch(form, /type="radio" name="packageMode"/); assert.match(modify, /<DealsSearchForm/); });
test("blocked toggles announce the minimum and successful hiding closes pickers without clearing values", () => { assert.match(form, /tryToggleDealsProduct/); assert.match(form, /setProductSelectionMessage\(t\("deals\.productSelector\.minimumTwo"\)\)/); assert.match(form, /role="status" aria-live="polite"/); assert.match(form, /if \(wasSelected\) closeProductPickers\(product\)/); assert.match(form, /setFlightDatesOpen\(false\)/); assert.match(form, /setHotelDatesOpen\(false\)/); assert.match(form, /setCarDatesOpen\(false\)/); assert.doesNotMatch(form, /toggleProduct[\s\S]{0,700}(?:flightOriginText|hotelDestination|carPickupLocation): ""/); });

test("advanced package rows and shared control use the approved arrangement", () => {
  assert.match(form, /aria-labelledby="deals-flight-heading"/);
  assert.match(form, /aria-labelledby="deals-hotel-heading"/);
  assert.match(form, /aria-labelledby="deals-car-heading"/);
  assert.match(form, /aria-labelledby="deals-travellers-heading"/);
  assert.match(form, /id="deals-flight-cabin"/);
  assert.match(form, /deals\.travelersRoomsLabel/);
  assert.match(form, /deals\.sameAsPickup/);
  assert.doesNotMatch(form, /type="radio" name="packageMode"/);
});

test("product rows are conditionally rendered and modify search shares the form", () => {
  assert.match(form, /included\.flight && <section/);
  assert.match(form, /included\.hotel && <section/);
  assert.match(form, /included\.car && <section/);
  assert.match(modify, /<DealsSearchForm initialSearch=\{search\} variant="results"/);
});

test("destination and dates remain derived until their product value is customized", () => {
  assert.match(form, /!dirty\.current\.hotelDestination \? \{ hotelDestination: value \}/);
  assert.match(form, /!dirty\.current\.carLocation \? \{ carPickupLocation: value \}/);
  assert.match(form, /!dirty\.current\.hotelDates \? \{ hotelCheckIn: normalizedDeparture, hotelCheckOut: normalizedReturn \}/);
  assert.match(form, /!dirty\.current\.carDates \? \{ carPickupDate: normalizedDeparture, carReturnDate: normalizedReturn \}/);
});

test("travellers and rooms commit through one shared control", () => {
  assert.equal((form.match(/ref=\{travelersLauncherRef\}/g) ?? []).length, 1);
  assert.match(form, /hotelAdults: normalized\.adults/);
  assert.match(form, /hotelChildren: normalized\.children/);
  assert.match(form, /hotelRooms: Math\.max/);
});
