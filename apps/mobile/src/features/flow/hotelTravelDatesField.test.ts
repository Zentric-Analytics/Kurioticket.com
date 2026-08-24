import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/HotelSearchPanel.tsx", "utf8");

test("Hotels uses one strict Travel dates range sheet", () => {
  assert.equal(panel.match(/<CompactSearchField label="Travel dates"/g)?.length, 1);
  assert.match(panel, /<DateRangeSheet visible=\{datesOpen\} title="Travel dates" startLabel="Check-in date" endLabel="Check-out date"/);
  assert.match(panel, /startDate=\{form\.checkIn\} endDate=\{form\.checkOut\}[^\n]+endMustBeAfterStart/);
});

test("Hotel Done commits atomically and cancellation only closes the sheet", () => {
  assert.match(panel, /onDone=\{\(checkIn, checkOut\) => \{ update\(\{ \.\.\.form, checkIn, checkOut \}\); setErrors\(value => \(\{ \.\.\.value, checkIn: undefined, checkOut: undefined \}\)\); setDatesOpen\(false\); \}\}/);
  assert.match(panel, /onCancel=\{\(\) => setDatesOpen\(false\)\}/);
  assert.doesNotMatch(panel, /setCalendar\("checkOut"\)/);
});

test("Hotel date validation opens the same range picker", () => {
  assert.match(panel, /else if \(nextErrors\.checkIn \|\| nextErrors\.checkOut\) setDatesOpen\(true\)/);
});
