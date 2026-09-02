import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);

function desktopEditorSource() {
  const label = source.indexOf("data-desktop-trip-selector");
  const start = source.lastIndexOf("<div", label);
  const end = source.indexOf("<form", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

function fareStripSource() {
  const start = source.indexOf("data-desktop-nearby-fare-rail");
  const end = source.indexOf('className="hidden w-full items-center', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

test("desktop results editor uses one clean accessible trip-type radio row", () => {
  const editor = desktopEditorSource();
  const roundTrip = editor.indexOf('label: "Round-trip"');
  const oneWay = editor.indexOf('label: "One-way"');
  const multiCity = editor.indexOf('label: "Multi-city"');

  assert.ok(roundTrip >= 0 && roundTrip < oneWay && oneWay < multiCity);
  assert.match(editor, /role="radiogroup"/);
  assert.match(editor, /role="radio"/);
  assert.match(editor, /aria-checked={selected}/);
  assert.doesNotMatch(editor, /role="listbox"|role="option"|aria-haspopup/);
  assert.doesNotMatch(editor, /label: t\("oneWay"\)/);
  assert.doesNotMatch(editor, /label: t\("roundTrip"\)/);
  assert.match(editor, /data-desktop-trip-selector/);
  assert.match(editor, /items-center gap-8/);
  assert.match(editor, /rounded-full border-2/);
});

test("desktop populated airport inputs remain editable without clear controls", () => {
  assert.match(source, /id="results-origin"[\s\S]*?onChange=\{/);
  assert.match(source, /id="results-destination"[\s\S]*?onChange=\{/);
  assert.doesNotMatch(source, /aria-label={t\("clearOrigin"\)}/);
  assert.doesNotMatch(source, /aria-label={t\("clearDestination"\)}/);
  assert.doesNotMatch(source, /function clearOriginField/);
  assert.doesNotMatch(source, /function clearDestinationField/);
});

test("desktop results fields lead values with neutral semantic icons", () => {
  assert.ok(
    (source.match(
      /<MapPin[\s\S]*?aria-hidden="true"[\s\S]*?className="h-4 w-4 shrink-0 text-slate-500"/g,
    )?.length ?? 0) >= 2,
  );
  assert.match(
    source,
    /<Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600"/,
  );
  assert.match(
    source,
    /<UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600"/,
  );
  assert.match(source, /locale\?\.startsWith\("en"\)/);
  assert.match(source, /adultSingular\.charAt\(0\)\.toUpperCase\(\)/);
});

test("origin and destination share one bounded production-ready suggestion card", () => {
  const start = source.indexOf("function SuggestionList");
  const end = source.indexOf("type FilterOption", start);
  const suggestions = source.slice(start, end);

  assert.match(suggestions, /suggestions\.slice\(0, 5\)/);
  assert.match(suggestions, /role="listbox"/);
  assert.match(suggestions, /role="option"/);
  assert.match(suggestions, /overflow-hidden/);
  assert.match(suggestions, /min-h-\[58px\]/);
  assert.match(suggestions, /border-b border-slate-200\/75/);
  assert.doesNotMatch(suggestions, /overflow-auto|max-h-\[/);
  assert.equal(source.match(/<SuggestionList/g)?.length, 6);
});

test("desktop traveler picker uses clean traveler names and preserves counters", () => {
  const popoverStart = source.indexOf('id="flight-traveler-cabin-popover"');
  const counterStart = source.indexOf("function CounterRow", popoverStart);
  const popover = source.slice(popoverStart, counterStart);

  assert.match(popover, /label={t\("adults"\)}/);
  assert.match(popover, /label={t\("children"\)}/);
  assert.match(popover, /label={t\("infantPlural"\)}/);
  assert.doesNotMatch(popover, /label={t\("infantsOnLap"\)}/);
  assert.match(popover, /max={adultCount}/);
});

test("fare strip is one bounded seven-date grid with adjacent week controls", () => {
  const strip = fareStripSource();
  assert.equal(source.match(/const nearbyFareVisibleCount = 7;/g)?.length, 1);
  assert.match(strip, /data-desktop-nearby-fare-rail/);
  assert.match(strip, /grid-cols-\[48px_repeat\(7,minmax\(0,1fr\)\)_48px\]/);
  assert.match(strip, /aria-label="Previous nearby fare date"/);
  assert.match(strip, /aria-label="Next nearby fare date"/);
  assert.match(strip, /navigateNearbyFareWindow\("previous"\)/);
  assert.match(strip, /navigateNearbyFareWindow\("next"\)/);
  assert.match(strip, /displayPrice \?\? "Unavailable"/);
  const desktopRail = strip.slice(
    strip.indexOf("data-desktop-nearby-fare-rail"),
  );
  assert.doesNotMatch(desktopRail, /overflow-x-auto/);
  assert.match(desktopRail, /rounded-xl border border-slate-200 bg-white/);
  assert.match(desktopRail, /selected && "border-\[#075EE8\] bg-blue-50\/80/);
  assert.equal(desktopRail.match(/h-10 w-10 place-self-center/g)?.length, 2);
});

test("fare windows are bounded and hidden for multi-city", () => {
  assert.match(source, /nearbyFareRangeSize - nearbyFareVisibleCount/);
  assert.match(source, /nearbyFareDaysBeforeAnchor - Math\.floor\(nearbyFareVisibleCount \/ 2\)/);
  assert.match(source, /setNearbyFareVisibleStart\(nearbyFareCenteredVisibleStart\)/);
  assert.match(source, /body\?\.tripType !== "multi-city"/);
});
