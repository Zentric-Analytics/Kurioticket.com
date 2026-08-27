import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editor = readFileSync("src/components/search/MultiCityFlightEditor.tsx", "utf8");
const primitives = readFileSync("src/components/search/FlightSearchFieldPrimitives.tsx", "utf8");
const singleDateCalendar = readFileSync("src/components/search/FlightSingleDateCalendar.tsx", "utf8");

test("multi-city removes browser-native airport and date controls", () => {
  assert.doesNotMatch(editor, /<datalist|list=\{listId\}/);
  assert.doesNotMatch(editor, /type="date"/);
  assert.match(editor, /<FlightAirportFieldControl/);
  assert.match(editor, /<FlightSingleDateCalendar/);
  assert.match(editor, /<MobileAirportPicker/);
  assert.match(editor, /<MobileDatePickerDialog/);
});

test("normal and multi-city flight searches share the production field primitives", () => {
  assert.match(editor, /FlightSearchFieldPrimitives/);
  assert.match(primitives, /flightSearchFieldShellClassName/);
  assert.match(primitives, /data-standalone-flight-desktop-popover/);
  assert.match(primitives, /createPortal/);
});

test("multi-city airport fields opt into the clean mobile value row with 20px MapPins", () => {
  assert.match(editor, /useMainFlightLandingMobilePresentation/);
  assert.match(editor, /mobileLeadingIconClassName="h-5 w-5 shrink-0 text-slate-500 sm:hidden"/);
  assert.match(editor, /mobileValueRowClassName="grid grid-cols-\[22px_minmax\(0,1fr\)\] items-center gap-2\.5 sm:contents"/);

  const cleanMobileBranch = primitives.slice(
    primitives.indexOf("{useMainFlightLandingMobilePresentation ? ("),
    primitives.indexOf(") : (", primitives.indexOf("{useMainFlightLandingMobilePresentation ? (")),
  );
  assert.match(cleanMobileBranch, /<MapPin/);
  assert.match(cleanMobileBranch, /mobileLeadingIconClassName/);
  assert.doesNotMatch(cleanMobileBranch, /<ChevronDown/);
});

test("multi-city date fields use the aligned 20px mobile icon value row and shared picker", () => {
  assert.match(editor, /grid-cols-\[22px_minmax\(0,1fr\)\] items-center gap-2\.5 sm:flex sm:gap-2/);
  assert.match(editor, /<Calendar className="h-5 w-5 shrink-0 text-slate-500 sm:h-4 sm:w-4"/);
  assert.match(editor, /<MobileDatePickerDialog/);
});

test("multi-city enforces chronological dates and clears invalid downstream legs", () => {
  assert.match(editor, /legs\[index - 1\]\.departureDate \|\| minimumDate/);
  assert.match(editor, /next\[cursor\]\.departureDate < patch\.departureDate/);
  assert.match(editor, /departureDate: ""/);
  assert.match(singleDateCalendar, /disabled=\{disabled\}/);
});

test("multi-city add and remove retain journey boundaries", () => {
  assert.match(editor, /previous\?\.destination \?\? ""/);
  assert.match(editor, /legs\.length >= MULTI_CITY_MAX_LEGS/);
  assert.match(editor, /legs\.length <= MULTI_CITY_MIN_LEGS/);
  assert.match(editor, /disabled=\{legs\.length <= MULTI_CITY_MIN_LEGS\}/);
});

test("multi-city keeps one active picker and accessible portalled controls", () => {
  assert.match(editor, /type ActivePicker = \{ legIndex: number; field: PickerField/);
  assert.match(editor, /aria-haspopup="dialog"/);
  assert.match(editor, /event\.key === "Escape"/);
  assert.match(editor, /window\.requestAnimationFrame\(\(\) => launcherRef\.current\?\.focus/);
});

test("each leg has an accessible route-boundary swap and canonical displayed date", () => {
  assert.match(editor, /data-multi-city-route-pair/);
  assert.match(editor, /data-multi-city-swap-control/);
  assert.match(editor, /Swap origin and destination for \$\{flightLabel\(index\)\}/);
  assert.match(editor, /<ArrowRightLeft className="h-5 w-5" aria-hidden="true"/);
  assert.match(editor, /formatTravelDateDisplay\(value, locale\)/);
});
