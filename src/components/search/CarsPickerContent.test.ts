import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shared = readFileSync("src/components/search/CarsPickerContent.tsx", "utf8");
const homepage = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const carsPage = readFileSync("src/app/cars/page.tsx", "utf8");

test("shared Cars picker content is consumed by both search surfaces", () => {
  assert.ok(homepage.includes("<CarsRentalDatePickerContent"));
  assert.ok(carsPage.includes("<CarsRentalDatePickerContent"));
  assert.ok(homepage.includes("<CarsTimeRangePickerContent"));
  assert.ok(carsPage.includes("<CarsTimeRangePickerContent"));
  assert.ok(homepage.includes("<CarsDriverAgePickerContent"));
  assert.ok(carsPage.includes("<CarsDriverAgePickerContent"));
});

test("shared calendar exposes range state and disables past dates", () => {
  assert.match(shared, /disabled=\{past\}/);
  assert.match(shared, /data-in-range=\{inRange \|\| undefined\}/);
  assert.match(shared, /aria-pressed=\{selected\}/);
  assert.match(shared, /\[0, 1\]\.map/);
});

test("shared time content renders two independently scrollable button lists", () => {
  assert.match(shared, /data-cars-time-columns/);
  assert.match(shared, /data-cars-time-list=\{kind\}/);
  assert.match(shared, /timeOptions\.map/);
  assert.match(shared, /aria-pressed=\{selectedTime === time\}/);
});

test("shared age content provides compact selection and keyboard semantics", () => {
  for (const key of ["ArrowDown", "ArrowUp", "Home", "End", "Enter"]) assert.ok(shared.includes(key));
  assert.match(shared, /role="option" aria-selected=\{selected\}/);
  assert.match(shared, /data-selected-age-indicator/);
  assert.match(shared, /bg-\[#EAF2FB\]/);
});

test("dedicated Cars desktop time popup has no native selects and stable relationships", () => {
  const timeField = carsPage.slice(carsPage.indexOf("function TimeRangeField("), carsPage.indexOf("function SearchCell("));
  assert.equal(timeField.includes("<select"), false);
  assert.match(timeField, /id="cars-desktop-time-range-dialog"/);
  assert.match(timeField, /aria-controls="cars-desktop-time-range-dialog"/);
  assert.match(timeField, /role="dialog"/);
});
