import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const desktopStart = source.lastIndexOf("\n  return (");
const desktopBranch = source.slice(desktopStart);

test("desktop homepage uses a clean tab rail and separate search fields", () => {
  assert.match(source, /compactHero[\s\S]*?border-b border-slate-200 bg-transparent/);
  assert.match(source, /flightRouteGroupClassName[\s\S]*?rounded-xl border border-slate-200 bg-white/);
  assert.match(source, /sm:grid-cols-\[minmax\(0,1fr\)_42px_minmax\(0,1fr\)\]/);
  assert.match(source, /before:start-1\/2 before:w-px before:bg-slate-200/);
  assert.match(source, /lg:rounded-xl lg:border lg:border-slate-200/);
  assert.match(desktopBranch, /Flights[\s\S]*?Hotels[\s\S]*?Cars/);
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
  assert.match(source, /placement=\{compactHero \? "auto" : "below"\}/);
  assert.match(source, /window\.innerHeight/);
  assert.match(source, /spaceBelow >= minimumUsefulHeight/);
  assert.match(source, /bottom: window\.innerHeight - anchorRect\.top \+ offset/);
  assert.match(source, /maxHeight: Math\.max/);
  assert.match(source, /sticky bottom-0/);
});

test("desktop airport comboboxes anchor their own stable suggestion lists", () => {
  assert.match(desktopBranch, /id="homepage-flight-origin"[\s\S]*?role="combobox"/);
  assert.match(desktopBranch, /aria-controls="homepage-flight-origin-suggestions"/);
  assert.match(desktopBranch, /id="homepage-flight-destination"[\s\S]*?role="combobox"/);
  assert.match(desktopBranch, /aria-controls="homepage-flight-destination-suggestions"/);
  assert.match(source, /id=\{`\$\{inputId\}-suggestions`\}/);
});
