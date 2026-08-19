import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const autocompleteSource = readFileSync(
  "src/components/search/useHotelDestinationAutocomplete.ts",
  "utf8",
);
const desktopStart = source.lastIndexOf("\n  return (");
const desktopBranch = source.slice(desktopStart);

test("desktop homepage uses a clean tab rail and separate search fields", () => {
  assert.match(source, /compactHero[\s\S]*?border-b border-slate-200 bg-transparent/);
  assert.match(source, /flightRouteGroupClassName[\s\S]*?rounded-xl border border-slate-200 bg-white/);
  assert.match(source, /sm:grid-cols-\[minmax\(0,1fr\)_34px_minmax\(0,1fr\)\]/);
  assert.match(source, /before:start-1\/2 before:w-px before:bg-slate-200/);
  assert.match(source, /lg:rounded-xl lg:border lg:border-slate-200/);
  assert.match(desktopBranch, /Flights[\s\S]*?Hotels[\s\S]*?Cars/);
});

test("desktop Cars keeps a different return location beside pickup and gives every summary a leading icon", () => {
  assert.match(source, /compactHero[\s\S]*?carsValues\.returnToDifferentLocation[\s\S]*?lg:grid-cols-\[minmax\(0,1\.2fr\)_minmax\(0,1\.2fr\)/);
  assert.match(desktopBranch, /\{compactHero \? carsReturnLocationField : null\}/);
  assert.match(desktopBranch, /\{!compactHero \? carsReturnLocationField : null\}/);
  assert.match(source, /carsReturnLocationField[\s\S]*?<MapPin aria-hidden="true"/);
  assert.match(desktopBranch, /homepage-cars-pickup-desktop[\s\S]*?h-8 w-full ps-6/);
  assert.match(desktopBranch, /homepage-cars-time-range[\s\S]*?leadingIcon=\{<Clock/);
  assert.match(desktopBranch, /homepage-cars-driver-age[\s\S]*?leadingIcon=\{<UserRound/);
});

test("desktop Hotel destination and guest values include neutral leading icons", () => {
  assert.match(desktopBranch, /hotelSearchDestinationLabel[\s\S]*?<MapPin[\s\S]*?className=\{cn\(hotelFieldValueClassName, "ps-6"\)\}/);
  assert.match(desktopBranch, /hotelSearchGuestsLabel[\s\S]*?<UserRound[\s\S]*?text-slate-500/);
});

test("desktop homepage Hotel destination uses the shared API autocomplete", () => {
  assert.match(source, /useHotelDestinationAutocomplete\(\{[\s\S]*?query: destination/);
  assert.match(autocompleteSource, /\/api\/hotels\/destinations\?\$\{params\.toString\(\)\}/);
  assert.match(autocompleteSource, /}, 180\)/);
  assert.match(source, /id="homepage-hotel-destination"[\s\S]*?autoComplete="off"[\s\S]*?role="combobox"[\s\S]*?aria-autocomplete="list"/);
  assert.match(source, /width=\{420\}[\s\S]*?desiredHeight=\{320\}[\s\S]*?placement="auto"/);
});

test("desktop homepage Hotel renders and selects structured canonical destinations", () => {
  assert.match(source, /suggestion\.kind === "airport-area"[\s\S]*?Plane[\s\S]*?Building2[\s\S]*?MapPin/);
  assert.match(source, /getLocalizedHotelDestinationCityName\([\s\S]*?getLocalizedHotelDestinationDetail\(/);
  assert.match(source, /hotelDestinationKindTranslationKeys\[suggestion\.kind\]/);
  assert.match(source, /setDestination\(commitHotelDestinationSuggestion\(suggestion\)\)/);
  assert.match(source, /onMouseDown=\{\(event\) => event\.preventDefault\(\)\}/);
});

test("desktop homepage Hotel keeps empty focus closed and mutually excludes pickers", () => {
  assert.match(source, /if \(destination\.trim\(\)\) setHotelDestinationSuggestionsOpen\(true\)/);
  assert.match(source, /setHotelDatesOpen\(\(prev\) => !prev\);[\s\S]*?setHotelDestinationSuggestionsOpen\(false\)/);
  assert.match(source, /setHotelGuestsRoomsOpen\(\(prev\) => !prev\);[\s\S]*?setHotelDestinationSuggestionsOpen\(false\)/);
  assert.match(autocompleteSource, /open &&[\s\S]*?trimmedQuery\.length >= 1/);
});

test("desktop flight controls expose the full truthful trip-type set", () => {
  assert.match(desktopBranch, /\["round-trip", "one-way", "multi-city"\]/);
  assert.match(desktopBranch, /role="radiogroup"/);
  assert.match(desktopBranch, /role="radio"/);
  assert.match(desktopBranch, /aria-disabled=\{unavailable\}/);
  assert.match(desktopBranch, /disabled=\{unavailable\}/);
});

test("desktop flight fields include semantic icons and omit compact clear controls", () => {
  assert.match(desktopBranch, /<MapPin aria-hidden="true"[\s\S]*?homepage-flight-origin/);
  assert.match(desktopBranch, /<MapPin aria-hidden="true"[\s\S]*?homepage-flight-destination/);
  assert.match(desktopBranch, /<UserRound aria-hidden="true"/);
  assert.match(desktopBranch, /\{!compactHero && from\.trim\(\) \? \(/);
  assert.match(desktopBranch, /\{!compactHero && to\.trim\(\) \? \(/);
});

test("desktop airport, calendar, and traveler panels share viewport-safe placement", () => {
  assert.match(source, /const renderDesktopAirportSuggestions[\s\S]*?<DesktopTopLayerPopover/);
  assert.match(source, /placement="auto"/);
  assert.match(source, /resolveDesktopPopoverGeometry/);
  assert.match(source, /desiredHeight=\{420\}/);
  assert.match(source, /bottom: window\.innerHeight - anchorRect\.top \+ offset/);
  assert.match(source, /maxHeight: geometry\.maxHeight/);
  assert.match(source, /sticky bottom-0/);
});

test("desktop airport inputs expose accessible structured combobox results", () => {
  assert.match(desktopBranch, /id="homepage-flight-origin"[\s\S]*?autoComplete="off"[\s\S]*?role="combobox"[\s\S]*?aria-autocomplete="list"/);
  assert.match(desktopBranch, /id="homepage-flight-destination"[\s\S]*?autoComplete="off"[\s\S]*?role="combobox"[\s\S]*?aria-autocomplete="list"/);
  assert.match(source, /id=\{`\$\{inputId\}-suggestion-\$\{index\}`\}[\s\S]*?role="option"/);
  assert.match(source, /<Plane className="h-4 w-4"/);
  assert.match(source, /getLocalizedCityName\(option\.city, locale\)/);
  assert.match(source, /option\.airport[\s\S]*?option\.country[\s\S]*?option\.code/);
});

test("desktop homepage location forms disable browser-native history suggestions", () => {
  assert.match(desktopBranch, /onSubmit=\{\s*onFlightSubmit\s*\}[\s\S]*?autoComplete="off"/);
  assert.match(desktopBranch, /onSubmit=\{\s*onHotelSubmit\s*\}[\s\S]*?autoComplete="off"/);
  assert.match(desktopBranch, /<form onSubmit=\{onCarsSubmit\} autoComplete="off"/);
});

test("desktop fields expose one clean focus boundary instead of nested input rings", () => {
  const flightValueClasses = source.slice(
    source.indexOf("const flightFieldValueClassName"),
    source.indexOf("const flightFieldButtonClassName"),
  );
  const hotelValueClasses = source.slice(
    source.indexOf("const hotelFieldValueClassName"),
    source.indexOf("const flightRouteGroupClassName"),
  );

  assert.doesNotMatch(flightValueClasses, /focus-ring/);
  assert.doesNotMatch(hotelValueClasses, /focus-ring/);
  assert.match(flightValueClasses, /focus-visible:ring-0/);
  assert.match(hotelValueClasses, /focus-visible:ring-0/);
});
