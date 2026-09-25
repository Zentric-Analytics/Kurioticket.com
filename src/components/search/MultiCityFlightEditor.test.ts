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
  assert.match(editor, /: "h-5 w-5 shrink-0 text-slate-500 sm:hidden"/);
  assert.match(editor, /: "grid grid-cols-\[22px_minmax\(0,1fr\)\] items-center gap-2\.5 sm:contents"/);

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
  assert.match(editor, /"h-5 w-5 shrink-0 text-slate-500 sm:h-4 sm:w-4"/);
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
  assert.match(
    editor,
    /absolute left-1\/2 top-1\/2 z-10[^"]*-translate-x-1\/2 -translate-y-1\/2/,
  );
  assert.doesNotMatch(editor, /inset-inline-start-1\/2|rtl:translate-x-1\/2/);
  assert.match(editor, /formatTravelDateDisplay\(value, locale\)/);
});

test("results presentation uses grouped Results route, date, and swap geometry", () => {
  assert.match(editor, /presentation\?: "standalone" \| "homepage" \| "results"/);
  assert.match(editor, /data-multi-city-presentation=\{presentation\}/);
  assert.match(editor, /data-multi-city-results-route-card/);
  assert.match(editor, /gap-0 overflow-hidden rounded-\[13px\] border border-\[#E7ECF5\] bg-white/);
  assert.match(editor, /data-multi-city-results-route-divider/);
  assert.match(editor, /absolute inset-x-0 top-1\/2 h-px -translate-y-1\/2 bg-\[#E7ECF5\]/);
  assert.match(editor, /min-h-\[66px\][^\n]*px-3 py-\[9px\]/);
  assert.match(editor, /data-multi-city-results-date-card/);
  assert.match(editor, /h-9 w-9[^\n]*rounded-full border border-\[#E7ECF5\][^\n]*shadow-\[0_2px_4px_rgba\(24,48,91,0\.12\)\]/);
  assert.match(editor, /h-\[17px\] w-\[17px\]/);
});

test("results presentation removes the duplicate title while retaining an accessible name and leg count", () => {
  assert.match(editor, /aria-label=\{resultsPresentation \? t\("multiCity"\) : undefined\}/);
  assert.match(editor, /aria-labelledby=\{resultsPresentation \? undefined : "multi-city-flights-heading"\}/);
  assert.match(editor, /\{!resultsPresentation \? \([\s\S]*?t\("flightMultiCity\.title"\)/);
  assert.match(editor, /\{legs\.length\} of \{MULTI_CITY_MAX_LEGS\}/);
});

test("results airport values are code-only while placeholders and rich picker context remain", () => {
  assert.match(editor, /value=\{resultsPresentation && draftQuery === null \? code : query\}/);
  assert.match(editor, /placeholder=\{t\("cityOrAirport"\)\}/);
  assert.match(editor, /mobilePlaceholder=\{t\("cityOrAirport"\)\}/);
  assert.match(editor, /<MobileAirportPicker[\s\S]*?value=\{query\}/);
  assert.match(editor, /getLocalizedCityName\(option\.city, locale\)/);
  assert.match(editor, /\{option\.airport\}/);
  assert.match(editor, /\{option\.code\}/);
});

test("results dates use canonical travel wording without changing standalone wording", () => {
  assert.match(editor, /t\(resultsPresentation \? "travelDates" : "flightMultiCity\.departureDate"\)/);
  assert.match(editor, /aria-label=\{`\$\{fieldLabel\}/);
  assert.match(editor, /title=\{fieldLabel\}/);
  assert.match(editor, /selectDates: fieldLabel/);
});

test("homepage and standalone retain their existing presentation path", () => {
  assert.match(editor, /presentation = "standalone"/);
  assert.match(editor, /const resultsPresentation = presentation === "results"/);
  assert.match(editor, /resultsPresentation &&/);
  assert.match(editor, /sm:min-h-\[58px\] sm:rounded-none sm:border-0/);
  assert.match(editor, /\{resultsPresentation \? \([\s\S]*?data-multi-city-results-route-divider[\s\S]*?\) : null\}/);
});
