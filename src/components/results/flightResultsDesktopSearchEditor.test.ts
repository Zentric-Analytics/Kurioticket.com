import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);

function desktopEditorSource() {
  const label = source.indexOf('aria-label={t("tripType")}\n              className="hidden translate-y-2');
  const start = source.lastIndexOf('role="radiogroup"', label);
  const end = source.indexOf("<form", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

function fareStripSource() {
  const start = source.indexOf('aria-label="Nearby departure fares"');
  const end = source.indexOf("Track this route", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

test("desktop results editor exposes exact ordered trip labels with radio-only selection", () => {
  const editor = desktopEditorSource();
  const roundTrip = editor.indexOf('label: "Round-trip"');
  const oneWay = editor.indexOf('label: "One-way"');
  const multiCity = editor.indexOf('label: "Multi-city"');

  assert.ok(roundTrip >= 0 && roundTrip < oneWay && oneWay < multiCity);
  assert.match(editor, /role="radiogroup"/);
  assert.match(editor, /role="radio"/);
  assert.match(editor, /aria-checked={selected}/);
  assert.match(editor, /border-\[#075EE8\]/);
  assert.match(editor, /bg-\[#075EE8\]/);
  assert.match(editor, /border-slate-300/);
  const optionButton = editor.slice(
    editor.indexOf("<button"),
    editor.indexOf('aria-hidden="true"'),
  );
  assert.doesNotMatch(optionButton, /bg-\[#075EE8\]|bg-blue/);
  assert.doesNotMatch(editor, /label: t\("oneWay"\)/);
  assert.doesNotMatch(editor, /label: t\("roundTrip"\)/);
});

test("desktop populated airport inputs remain editable without clear controls", () => {
  assert.match(source, /id="results-origin"[\s\S]*?onChange=\{/);
  assert.match(source, /id="results-destination"[\s\S]*?onChange=\{/);
  assert.doesNotMatch(source, /aria-label={t\("clearOrigin"\)}/);
  assert.doesNotMatch(source, /aria-label={t\("clearDestination"\)}/);
  assert.doesNotMatch(source, /function clearOriginField/);
  assert.doesNotMatch(source, /function clearDestinationField/);
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

  assert.match(popover, /label={t\("adultPlural"\)}/);
  assert.match(popover, /label={t\("childPlural"\)}/);
  assert.match(popover, /label={t\("infantPlural"\)}/);
  assert.doesNotMatch(popover, /label={t\("infantsOnLap"\)}/);
  assert.match(popover, /max={adultCount}/);
});

test("fare strip is one bounded seven-date grid with adjacent week controls", () => {
  const strip = fareStripSource();
  assert.equal(source.match(/const nearbyFareRangeSize = 7;/g)?.length, 1);
  assert.match(strip, /grid-cols-\[36px_repeat\(7,minmax\(72px,1fr\)\)_36px\]/);
  assert.match(strip, /aria-label="Previous week"/);
  assert.match(strip, /aria-label="Next week"/);
  assert.match(strip, /navigateNearbyFareWeek\("previous"\)/);
  assert.match(strip, /navigateNearbyFareWeek\("next"\)/);
  assert.match(strip, /displayPrice \?\? "Unavailable"/);
  assert.doesNotMatch(strip, /overflow-x-auto/);
});

test("fare windows advance by seven days and are hidden for multi-city", () => {
  assert.match(source, /direction === "previous" \? -7 : 7/);
  assert.match(source, /body\?\.tripType !== "multi-city"/);
});
