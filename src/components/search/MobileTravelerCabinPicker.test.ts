import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const picker = readFileSync("src/components/search/MobileTravelerCabinPicker.tsx", "utf8");
const shell = readFileSync("src/components/search/FlightMobilePickerShell.tsx", "utf8");
const homepage = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const standalone = readFileSync("src/components/search/StandaloneFlightSearchForm.tsx", "utf8");
const drawer = readFileSync("src/components/search/FlightEditSearchDrawer.tsx", "utf8");
const details = readFileSync("src/components/results/flightDetails/StandaloneFlightDetails.tsx", "utf8");

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

test("shared picker uses one canonical moderate density with accessible controls", () => {
  assert.doesNotMatch(picker, /density\?:|const compact/);
  assert.match(picker, /min-h-\[70px\]/);
  assert.match(picker, /h-9 w-9 shrink-0/);
  assert.match(picker, /h-\[19px\] w-\[19px\]/);
  assert.match(picker, /text-\[13px\] font-bold/);
  assert.match(picker, /text-\[11px\] font-medium leading-\[15px\]/);
  assert.match(picker, /inline-flex h-11 w-11 items-center/);
  assert.match(picker, /inline-flex h-9 w-9 items-center/);
  assert.match(picker, /text-\[14px\] font-bold tabular-nums/);
  assert.match(picker, /grid h-\[72px\] grid-cols-3/);
  assert.match(picker, /Armchair className="h-\[19px\] w-\[19px\]"/);
  assert.match(picker, /mt-3 flex items-center gap-2.*p-2\.5/);
  assert.match(picker, /h-\[34px\] w-\[34px\] shrink-0/);
  assert.match(picker, /Lightbulb className="h-\[18px\] w-\[18px\]"/);
  assert.match(picker, /text-\[12px\] font-medium/);
});

test("traveler icons and enabled counters use restrained Kurioticket blue", () => {
  assert.match(picker, /bg-\[#075EE8\]\/\[0\.06\] text-\[#075EE8\]/);
  assert.match(picker, /canDecrease \? "border-\[#075EE8\] text-\[#075EE8\]" : "border-slate-200 text-slate-300"/);
  assert.match(picker, /canIncrease \? "border-\[#075EE8\] text-\[#075EE8\]" : "border-slate-200 text-slate-300"/);
  assert.doesNotMatch(picker, /bg-slate-100 text-slate-950/);
});

test("cabin segments own overlapping borders while the clipped parent has no competing outline", () => {
  assert.match(picker, /grid h-\[72px\] grid-cols-3 overflow-hidden rounded-\[10px\] bg-white/);
  assert.doesNotMatch(picker, /grid h-\[72px\] grid-cols-3[^\n"]*border border-slate-200/);
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
    assert.doesNotMatch(source, /<MobileTravelerCabinPicker[^>]*density=/);
    assert.match(source, /contentClassName="bg-\[#fcfdfe\] px-4 py-4"/);
    assert.match(source, /headerVariant="close"/);
    assert.match(source, /pickerMarker="traveler-cabin"/);
    assert.match(source, /applyTravelersDraft\(false\)/);
    assert.match(source, /onClose=\{(?:cancelTravelersDraft|closeTravelersMobilePicker)\}/);
  }
  assert.match(drawer, /<MobileTravelerCabinPicker/);
  assert.doesNotMatch(drawer, /travelerPickerDensity|<MobileTravelerCabinPicker[^>]*density=/);
  assert.match(details, /<FlightEditSearchDrawer/);
  assert.doesNotMatch(details, /travelerPickerDensity|density=/);
});
