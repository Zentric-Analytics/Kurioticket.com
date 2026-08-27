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

test("shared picker preserves default sizing and offers compact content with accessible controls", () => {
  assert.match(picker, /density\?: "default" \| "compact"/);
  assert.match(picker, /density = "default"/);
  assert.match(picker, /compact \? "min-h-\[72px\] px-3" : "min-h-\[82px\] px-\[14px\]"/);
  assert.match(picker, /compact \? "h-9 w-9" : "h-10 w-10"/);
  assert.match(picker, /compact \? "h-5 w-5" : "h-\[22px\] w-\[22px\]"/);
  assert.match(picker, /compact \? "text-\[13px\]" : "text-\[14px\]"/);
  assert.match(picker, /compact \? "text-\[11px\] leading-\[15px\]" : "text-\[12px\] leading-\[16px\]"/);
  assert.match(picker, /inline-flex h-11 w-11 items-center/);
  assert.match(picker, /compact \? "h-\[74px\]" : "h-\[86px\]"/);
  assert.match(picker, /compact \? "h-5 w-5" : "h-\[23px\] w-\[23px\]"/);
  assert.match(picker, /compact \? "gap-2 p-2.5" : "gap-2.5 p-3"/);
  assert.match(picker, /compact \? "h-\[18px\] w-\[18px\]" : "h-5 w-5"/);
});

test("traveler icons and enabled counters use restrained Kurioticket blue", () => {
  assert.match(picker, /bg-\[#075EE8\]\/\[0\.06\] text-\[#075EE8\]/);
  assert.match(picker, /canDecrease \? "border-\[#075EE8\] text-\[#075EE8\]" : "border-slate-200 text-slate-300"/);
  assert.match(picker, /canIncrease \? "border-\[#075EE8\] text-\[#075EE8\]" : "border-slate-200 text-slate-300"/);
  assert.doesNotMatch(picker, /bg-slate-100 text-slate-950/);
});

test("cabin segments own overlapping borders while the clipped parent has no competing outline", () => {
  assert.match(picker, /grid grid-cols-3 overflow-hidden rounded-\[10px\] bg-white/);
  assert.doesNotMatch(picker, /grid grid-cols-3[^\n"]*border border-slate-200/);
  assert.match(picker, /gap-1\.5 border border-slate-200 bg-white px-1/);
  assert.match(picker, /index > 0 && "-ms-px"/);
  assert.doesNotMatch(picker, /border-s border-slate-200/);
  assert.doesNotMatch(picker, /ring-1 ring-inset ring-\[#075EE8\]/);
  assert.doesNotMatch(picker, /border-\[1\.5px\]/);
});

test("Economy, Business, and First each use the selected segment border contract", () => {
  for (const cabin of ["economy", "business", "first"]) {
    assert.match(picker, new RegExp(`\\["${cabin}"`));
  }
  assert.match(picker, /const selected = cabinClass === value/);
  assert.match(picker, /selected && "z-10 border-\[#075EE8\] bg-\[#eff6ff\] text-\[#075EE8\]"/);
  assert.match(picker, /aria-checked=\{selected\}/);
});

test("shared mobile flight surfaces require the exact English picker title", () => {
  const english = readFileSync("src/lib/i18n/en.ts", "utf8");
  assert.match(english, /"mobileTravelerCabin\.title": "Travelers & Cabin"/);
  for (const source of [homepage, standalone]) {
    assert.match(source, /mobileTravelerCabin\.title"\) \|\| "Travelers & Cabin"/);
    assert.doesNotMatch(source, /Travelers & cabin/);
  }
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
