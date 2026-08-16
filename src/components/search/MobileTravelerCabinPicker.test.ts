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

test("shared picker protects the moderate mobile size contract", () => {
  assert.match(picker, /min-h-\[88px\]/);
  assert.match(picker, /h-11 w-11 shrink-0/);
  assert.match(picker, /icon: <UserRound className="h-6 w-6"/);
  assert.match(picker, /icon: <ChildOutlineIcon className="h-6 w-6"/);
  assert.match(picker, /icon: <Baby className="h-6 w-6"/);
  assert.match(picker, /text-\[15px\] font-bold/);
  assert.match(picker, /text-\[12px\][^\n]*leading-\[16px\]/);
  assert.match(picker, /inline-flex h-11 w-11 items-center/);
  assert.match(picker, /inline-flex h-10 w-10 items-center/);
  assert.match(picker, /<Minus className="h-4 w-4"/);
  assert.match(picker, /<Plus className="h-4 w-4"/);
  assert.match(picker, /min-w-7 text-center text-\[16px\]/);
  assert.match(picker, /grid h-\[96px\] grid-cols-3/);
  assert.match(picker, /<Armchair className="h-\[26px\] w-\[26px\]"/);
  assert.match(picker, /end-2 top-2 flex h-6 w-6/);
  assert.match(picker, /flex h-10 w-10 shrink-0/);
  assert.match(picker, /<Lightbulb className="h-5 w-5"/);
  assert.match(picker, /bg-\[#eff6ff\] p-3/);

  assert.doesNotMatch(picker, /min-h-\[106px\]/);
  assert.doesNotMatch(picker, /h-14 w-14/);
  assert.doesNotMatch(picker, /h-8 w-8/);
  assert.doesNotMatch(picker, /h-\[118px\]/);
  assert.doesNotMatch(picker, /h-12 w-12/);
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
