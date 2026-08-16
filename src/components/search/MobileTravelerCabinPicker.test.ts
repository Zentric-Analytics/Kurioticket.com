import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const picker = readFileSync("src/components/search/MobileTravelerCabinPicker.tsx", "utf8");
const shell = readFileSync("src/components/search/FlightMobilePickerShell.tsx", "utf8");
const homepage = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const standalone = readFileSync("src/components/search/StandaloneFlightSearchForm.tsx", "utf8");

test("shared picker preserves approved traveler order, descriptions, and icon system", () => {
  assert.ok(picker.indexOf('key: "adults"') < picker.indexOf('key: "children"'));
  assert.ok(picker.indexOf('key: "children"') < picker.indexOf('key: "infants"'));
  assert.match(picker, /UserRound/);
  assert.match(picker, /ChildOutlineIcon/);
  assert.match(picker, /Baby/);
  assert.match(picker, /adultDescription/);
  assert.match(picker, /childDescription/);
  assert.match(picker, /infantDescription/);
});

test("traveler limits retain adult minimum, total cap, and infant relationship", () => {
  assert.match(picker, /maximumTravelers = 9/);
  assert.match(picker, /minimum: 1/);
  assert.match(picker, /total < maximumTravelers/);
  assert.match(picker, /infants < adults/);
  assert.match(picker, /Math\.min\(adults, infants \+ direction\)/);
});

test("cabin selector is one three-column radiogroup without Premium Economy", () => {
  assert.match(picker, /role="radiogroup"/);
  assert.match(picker, /role="radio"/);
  assert.match(picker, /aria-checked=\{selected\}/);
  assert.match(picker, /grid-cols-3/);
  assert.match(picker, /\["economy"/);
  assert.match(picker, /\["business"/);
  assert.match(picker, /\["first"/);
  assert.doesNotMatch(picker, /premium[ -]economy/i);
  assert.match(picker, /Armchair/);
  assert.match(picker, /bg-\[#eff6ff\]/);
});

test("tip and accessible counters follow the approved contract", () => {
  assert.match(picker, /Lightbulb/);
  assert.match(picker, /strings\.baggageTip/);
  assert.match(picker, /strings\.decrease\(row\.label\)/);
  assert.match(picker, /strings\.increase\(row\.label\)/);
  assert.match(picker, /aria-live="polite"/);
});

test("shell supports both navigation and close-only centered headers", () => {
  assert.match(shell, /headerVariant\?: "navigation" \| "close"/);
  assert.match(shell, /headerVariant === "close"/);
  assert.match(shell, /<X className="h-6 w-6"/);
  assert.match(shell, /<ArrowLeft/);
  assert.match(shell, /\{t\.cancel\}/);
  assert.match(shell, /grid-cols-\[1fr_auto_1fr\]/);
});

test("homepage and standalone mobile pickers share draft-only presentation and Done commit", () => {
  for (const source of [homepage, standalone]) {
    assert.match(source, /<MobileTravelerCabinPicker/);
    assert.match(source, /headerVariant="close"/);
    assert.match(source, /pickerMarker="traveler-cabin"/);
    assert.match(source, /applyTravelersDraft\(false\)/);
    assert.match(source, /onClose=\{(?:cancelTravelersDraft|closeTravelersMobilePicker)\}/);
  }
});
