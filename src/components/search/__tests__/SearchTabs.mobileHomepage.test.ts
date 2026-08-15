import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const homepage = readFileSync("src/app/page.tsx", "utf8");
const mobileBranch = source.slice(
  source.indexOf("if (mobileHomepage)"),
  source.indexOf("return (", source.indexOf("if (mobileHomepage)")) === -1
    ? source.length
    : source.indexOf("\n  return (", source.indexOf("if (mobileHomepage)")),
);
const desktopBranch = source.slice(source.indexOf("\n  return (", source.indexOf("if (mobileHomepage)")));

test("homepage gives only its below-sm SearchTabs instance the mobile presentation", () => {
  assert.match(homepage, /className="page-shell[^\n]*sm:hidden"[\s\S]*?<SearchTabs[\s\S]*?mobileHomepage/);
  assert.match(homepage, /className="page-shell[^\n]*hidden sm:block[^\n]*"[\s\S]*?<SearchTabs[\s\S]*?compactHero[\s\S]*?locale=\{locale\}/);
  assert.doesNotMatch(
    homepage.match(/hidden sm:block[\s\S]*?<SearchTabs[\s\S]*?\/>/)?.[0] ?? "",
    /mobileHomepage/,
  );
});

test("mobile homepage is flights-only while desktop product tabs remain", () => {
  assert.match(mobileBranch, /data-testid="mobile-homepage-flight-search"/);
  assert.doesNotMatch(mobileBranch, /<BedDouble|<CarFront|<Plane/);
  assert.match(desktopBranch, /<Plane[\s\S]*?\{t\.flights\}/);
  assert.match(desktopBranch, /<BedDouble[\s\S]*?\{t\.hotels\}/);
  assert.match(desktopBranch, /<CarFront[\s\S]*?\{t\.cars\}/);
});

test("mobile homepage matches the approved flight-form hierarchy", () => {
  const markers = [
    "mobile-homepage-trip-selector",
    "mobile-homepage-route-fields",
    "mobile-homepage-date-fields",
    "mobile-homepage-travelers-field",
    "mobile-homepage-search-submit",
  ];
  let previous = -1;
  for (const marker of markers) {
    const index = mobileBranch.indexOf(marker);
    assert.ok(index > previous, `${marker} should retain its approved order`);
    previous = index;
  }
  assert.match(mobileBranch, /\["round-trip", "one-way"\]/);
  assert.doesNotMatch(mobileBranch, /rounded-full border[^\n]*selected/);
  assert.match(mobileBranch, /mobile-homepage-\$\{kind\}-field/);
  assert.match(mobileBranch, /mobile-homepage-swap/);
  assert.match(mobileBranch, /onClick=\{onSwapAirports\}/);
  assert.match(mobileBranch, /mobile-homepage-\$\{label === "Depart" \? "depart" : "return"\}-field/);
  assert.match(mobileBranch, /Travelers &amp; Cabin/);
  assert.match(mobileBranch, /t\.searchFlights \|\| "Search flights"/);
});

test("mobile controls retain the existing picker and submission behavior", () => {
  assert.match(mobileBranch, /onSubmit=\{onFlightSubmit\}/);
  assert.match(mobileBranch, /renderMobileAirportPicker/);
  assert.match(mobileBranch, /renderFlightDateCalendar\(\)/);
  assert.match(mobileBranch, /renderTravelersCabinPicker\(\)/);
  assert.match(source, /if \(mode === "one-way"\) \{\s*setReturnDate\(""\)/);
  assert.match(source, /new URLSearchParams\(\{[\s\S]*?tripType:[\s\S]*?origin:[\s\S]*?destination:/);
  assert.match(source, /tripType ===[\s\S]*?"round-trip"[\s\S]*?params\.set\([\s\S]*?"returnDate"/);
});
