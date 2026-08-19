import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "src/components/search/StandaloneFlightSearchForm.tsx",
  "utf8",
);
const identity = source.slice(
  source.lastIndexOf(
    "<div",
    source.indexOf('data-testid="main-flight-landing-identity"'),
  ),
  source.indexOf(
    "</div>",
    source.indexOf('data-testid="main-flight-landing-identity"'),
  ),
);
const selector = source.slice(
  source.indexOf('<div\n          role="radiogroup"'),
  source.indexOf("</div>", source.indexOf('<div\n          role="radiogroup"')),
);

test("standalone Flights calendar shows today with a ring and no decorative dot", () => {
  assert.match(
    source,
    /isToday &&[\s\S]*?ring-1 ring-inset ring-\[#004BB8\]\/20/,
  );
  assert.doesNotMatch(source, /isToday && !isDeparture && !isReturn \? \(/);
  assert.doesNotMatch(
    source,
    /bottom-1\.5 h-1 w-1 rounded-full bg-\[#004BB8\]/,
  );
});

test("standalone Flights mobile landing form has exact English labels and safe trip options", () => {
  assert.match(
    source,
    /useMainFlightLandingMobilePresentation \? \([\s\S]*?sm:hidden[\s\S]*?<Plane[\s\S]*?t\("flights"\) \|\| "Flights"/,
  );
  assert.match(
    source,
    /"Round-trip"[\s\S]*?"One way-trip"[\s\S]*?"Multi-city trip"/,
  );
  assert.match(source, /aria-disabled=\{value === "multi-city"\}/);
  assert.match(source, /disabled=\{value === "multi-city"\}/);
  assert.match(source, /if \(value === "multi-city"\) return;/);
  assert.match(source, /grid h-11 grid-cols-3 gap-0 py-0 sm:h-auto/);
});

test("main-flight landing identity mirrors the approved Hotel product badge", () => {
  assert.match(
    identity,
    /inline-flex items-center gap-2 rounded-lg bg-\[#004BB8\]\/8 px-3 py-2 shadow-sm ring-1 ring-\[#004BB8\]\/10 sm:hidden/,
  );
  assert.match(identity, /h-5 w-5[^"\n]*text-\[#004BB8\]/);
  assert.match(identity, /strokeWidth=\{2\.1\}/);
  assert.match(identity, /text-\[16px\][^"\n]*font-semibold[^"\n]*text-navy/);
  assert.doesNotMatch(
    identity,
    /h-6 w-6|text-\[23px\]|font-bold|<h2[^>]*text-\[#075EE8\]/,
  );
});

test("main-flight landing trip selector uses radio-only mobile selection styling", () => {
  assert.match(
    selector,
    /text-\[11px\][^"\n]*font-medium[^"\n]*text-slate-950/,
  );
  assert.match(selector, /max-\[359px\]:gap-0\.5/);
  assert.match(selector, /flex h-4 w-4/);
  assert.match(selector, /h-\[5px\] w-\[5px\] rounded-full bg-\[#004BB8\]/);
  assert.match(selector, /bg-transparent/);
  assert.match(
    selector,
    /useMainFlightLandingMobilePresentation\s*\? "sm:bg-\[#004BB8\]\/8 sm:text-\[#004BB8\] sm:ring-1 sm:ring-\[#004BB8\]\/10 sm:shadow-none"/,
  );
  assert.doesNotMatch(
    selector,
    /useMainFlightLandingMobilePresentation\s*\? "bg-\[#004BB8\]\/8/,
  );
  assert.doesNotMatch(
    selector,
    /useMainFlightLandingMobilePresentation\s*\? "[^"]* ring-\[#004BB8\]\/10/,
  );
});

test("main-flight landing trip selector stays horizontal and readable at narrow widths", () => {
  assert.match(selector, /grid h-11 grid-cols-3 gap-0 py-0/);
  assert.match(selector, /min-w-0[^"\n]*whitespace-nowrap/);
  assert.doesNotMatch(selector, /grid-cols-[12]|flex-col|overflow-x-auto/);
  assert.doesNotMatch(
    selector,
    /truncate|text-ellipsis|line-clamp|absolute|translate-/,
  );
});

test("supported mobile trip options update canonical state while Multi-city cannot", () => {
  assert.match(
    source,
    /const nextTripType = value as TripType;\s*setTripType\(nextTripType\)/,
  );
  assert.match(source, /if \(nextTripType === "one-way"\) setReturnDate\(""\)/);
  assert.match(source, /if \(value === "multi-city"\) return;/);
  assert.doesNotMatch(source, /setTripType\("multi-city"\)/);
});

test("standalone Flights uses the complete selector without changing supported search semantics", () => {
  assert.match(source, /sm:inline-flex sm:gap-1/);
  assert.match(
    source,
    /\.\.\.defaultTripTypeOptions,[\s\S]*?\["multi-city", "Multi-city"\] as const/,
  );
  assert.match(source, /type TripType = "round-trip" \| "one-way";/);
  assert.match(
    source,
    /if \(tripType === "round-trip"\) params\.set\("returnDate", returnDate\);/,
  );
});
