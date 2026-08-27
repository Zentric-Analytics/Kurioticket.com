import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);
const pickerStart = source.indexOf("function renderMobileSearchPickers() {");
const pickerEnd = source.indexOf(
  'function renderCompactSearchForm(placement: "mobile" | "desktop")',
  pickerStart,
);
const mobilePickers = source.slice(pickerStart, pickerEnd);

test("mobile results uses the shared homepage date picker contract", () => {
  assert.ok(pickerStart >= 0);
  assert.ok(pickerEnd > pickerStart);
  assert.match(mobilePickers, /<MobileDatePickerDialog/);
  assert.match(mobilePickers, /startDate=\{draftMobileDepartureDate\}/);
  assert.match(mobilePickers, /endDate=\{draftMobileReturnDate\}/);
  assert.match(
    mobilePickers,
    /rangeRequired=\{tripTypeInput === "round-trip"\}/,
  );
  assert.match(
    mobilePickers,
    /isDateDisabled=\{isPastLocalDate\}/,
  );
  assert.match(mobilePickers, /setDepartureDateInput\(startDate\)/);
  assert.match(mobilePickers, /setReturnDateInput\(/);
  assert.match(mobilePickers, /onClose=\{closeMobileDatePicker\}/);
  assert.doesNotMatch(mobilePickers, /<DatePickerPopover/);
});

test("mobile results uses the shared homepage traveler picker and shell", () => {
  assert.match(mobilePickers, /<FlightMobilePickerShell/);
  assert.match(mobilePickers, /pickerMarker="traveler-cabin"/);
  assert.match(mobilePickers, /<MobileTravelerCabinPicker/);
  assert.match(mobilePickers, /adults=\{draftAdultCount\}/);
  assert.match(mobilePickers, /children=\{draftChildCount\}/);
  assert.match(mobilePickers, /infants=\{draftInfantCount\}/);
  assert.match(mobilePickers, /cabinClass=\{draftCabinClassInput\}/);
  assert.match(mobilePickers, /commitMobileTravelerPopover\(\)/);
  assert.match(mobilePickers, /onClose=\{closeMobileTravelerPopover\}/);
  assert.doesNotMatch(mobilePickers, /<TravelerCabinPopover/);
  assert.doesNotMatch(mobilePickers, /handleCompactSearchSubmit/);
});

test("legacy popovers remain available to desktop results editors", () => {
  assert.match(source, /function DatePickerPopover\(/);
  assert.match(source, /function TravelerCabinPopover\(/);
  assert.match(source.slice(0, pickerStart), /<DatePickerPopover/);
  assert.match(source.slice(0, pickerStart), /<TravelerCabinPopover/);
});
