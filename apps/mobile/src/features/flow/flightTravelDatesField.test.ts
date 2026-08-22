import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");

test("Flights keeps one unified Travel dates launcher and routes round trips to one range sheet", () => {
  assert.equal(panel.match(/<CompactSearchField label="Travel dates"/g)?.length, 1);
  assert.match(panel, /setPicker\(form\.tripType === "round-trip" \? "travelDates" : "departureDate"\)/);
  assert.match(panel, /<DateRangeSheet visible=\{picker === "travelDates"\} title="Travel dates" startLabel="Departure date" endLabel="Return date"/);
  assert.doesNotMatch(panel, /"returnDate" \|/);
});

test("round-trip dates remain drafts until an atomic Done callback", () => {
  assert.match(panel, /startDate=\{form\.departureDate\} endDate=\{form\.returnDate\}/);
  assert.match(panel, /endMustBeAfterStart onDone=\{\(departureDate, returnDate\) => \{ setForm\(\{ \.\.\.form, departureDate, returnDate \}\); clear\("departureDate", "returnDate"\); setPicker\(undefined\); \}\} onCancel=\{\(\) => setPicker\(undefined\)\}/);
});

test("validation opens the same range picker while one-way retains its single date modal", () => {
  assert.match(panel, /first === "departureDate" \|\| first === "returnDate"\) setPicker\(form\.tripType === "round-trip" \? "travelDates" : "departureDate"\)/);
  assert.match(panel, /<LocalCalendarModal visible=\{picker === "departureDate"\} title="Choose departure date"/);
  assert.match(panel, /const flightDatesValue = form\.tripType === "round-trip" \? `\$\{departureValue\} — \$\{returnValue\}` : departureValue;/);
});

test("date validation errors remain directly after the unified launcher", () => {
  const field = panel.indexOf('<CompactSearchField label="Travel dates"');
  const departure = panel.indexOf("errors.departureDate", field);
  const returned = panel.indexOf("errors.returnDate", departure);
  const travelers = panel.indexOf('<CompactSearchField label="Travelers & Cabin Class"', returned);
  assert.ok(field < departure && departure < returned && returned < travelers);
});
