import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
const travelDatesStart = panel.indexOf('<Field label="Travel dates"');
const travelDatesField = travelDatesStart < 0 ? "" : panel.slice(travelDatesStart, panel.indexOf("/>", travelDatesStart) + 2);

test("Flights renders one unified Travel dates launcher with one calendar icon", () => {
  assert.equal(panel.match(/<Field label="Travel dates"/g)?.length, 1);
  assert.doesNotMatch(panel, /<Field label="(?:Depart|Return)"/);
  assert.match(travelDatesField, /value=\{flightDatesValue\}/);
  assert.match(travelDatesField, /icon="calendar"/);
  assert.match(travelDatesField, /onPress=\{\(\) => setPicker\("departureDate"\)\}/);
  assert.equal(panel.match(/icon="calendar"/g)?.length, 1);
});

test("the unified summary covers empty, partial, and complete round trips and departure-only one way trips", () => {
  assert.match(panel, /const departureValue = form\.departureDate \? displayDate\(form\.departureDate\) : "Select departure date";/);
  assert.match(panel, /const returnValue = form\.returnDate \? displayDate\(form\.returnDate\) : "Select return date";/);
  assert.match(panel, /const flightDatesValue = form\.tripType === "round-trip" \? `\$\{departureValue\} — \$\{returnValue\}` : departureValue;/);
});

test("round trips advance from departure to return while one way closes after departure", () => {
  assert.match(panel, /if \(picker === "departureDate"\)[\s\S]*?adjustFlightDeparture\(form, iso, initializeHomepageDates\)[\s\S]*?setPicker\(form\.tripType === "round-trip" \? "returnDate" : undefined\); return;/);
  assert.match(panel, /if \(picker === "returnDate"\) \{ setForm\(\{ \.\.\.form, returnDate: iso \}\); clear\("departureDate", "returnDate"\); setPicker\(undefined\); \}/);
});

test("validation can still open the return stage and keeps its strict minimum", () => {
  assert.match(panel, /\["from","to","departureDate","returnDate","travelers","cabin"\]\.includes\(first\)/);
  assert.match(panel, /title=\{picker === "returnDate" \? "Choose return date" : "Choose departure date"\}/);
  assert.match(panel, /minimum=\{picker === "returnDate" && form\.departureDate \? addCalendarDays\(form\.departureDate, 1\) : localIsoDate\(new Date\(\)\)\}/);
});

test("both date errors remain directly after the unified launcher", () => {
  const fieldIndex = panel.indexOf('<Field label="Travel dates"');
  const departureError = panel.indexOf("errors.departureDate", fieldIndex);
  const returnError = panel.indexOf("errors.returnDate", departureError);
  const travelers = panel.indexOf('<Field label="Travelers"', returnError);
  assert.ok(fieldIndex >= 0 && fieldIndex < departureError && departureError < returnError && returnError < travelers);
  assert.match(panel.slice(returnError - 40, returnError + 100), /form\.tripType === "round-trip" && errors\.returnDate/);
});
