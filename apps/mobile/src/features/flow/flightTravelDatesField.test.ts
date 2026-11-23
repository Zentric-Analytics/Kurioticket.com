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
});

test("closed Travel dates summarizes only complete date selections", () => {
  assert.match(panel, /const hasCompleteFlightDates = form\.tripType === "round-trip" \? Boolean\(form\.departureDate && form\.returnDate\) : Boolean\(form\.departureDate\);/);
  assert.match(panel, /form\.departureDate && form\.returnDate \? `\$\{displayDate\(form\.departureDate\)\} — \$\{displayDate\(form\.returnDate\)\}` : "Travel dates"/);
  assert.match(panel, /: form\.departureDate \? displayDate\(form\.departureDate\) : "Travel dates";/);
  assert.doesNotMatch(panel, /"Select (?:departure|return) date"/);
});

test("Travel dates placeholder state and unrestricted wrapping are scoped to its field", () => {
  const fieldStart = panel.indexOf('<CompactSearchField label="Travel dates"');
  const fieldEnd = panel.indexOf("/>", fieldStart) + 2;
  const field = panel.slice(fieldStart, fieldEnd);
  assert.ok(fieldStart >= 0);
  assert.match(field, /value=\{flightDatesValue\}/);
  assert.match(field, /valueNumberOfLines=\{0\}/);
  assert.doesNotMatch(field, /valueNumberOfLines=\{[1-9]\d*\}/);
  assert.match(field, /muted=\{!hasCompleteFlightDates\}/);
});

test("date validation errors remain directly after the unified launcher", () => {
  const field = panel.indexOf('<CompactSearchField label="Travel dates"');
  const departure = panel.indexOf("errors.departureDate", field);
  const returned = panel.indexOf("errors.returnDate", departure);
  const travelers = panel.indexOf('<CompactSearchField label="Travelers & Cabin Class"', returned);
  assert.ok(field < departure && departure < returned && returned < travelers);
});
