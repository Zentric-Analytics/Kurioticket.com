import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "src/components/search/StandaloneFlightSearchForm.tsx",
  "utf8",
);
const identity = source.slice(
  source.lastIndexOf("<div", source.indexOf('data-testid="main-flight-landing-identity"')),
  source.indexOf("</div>", source.indexOf('data-testid="main-flight-landing-identity"')),
);
const selector = source.slice(
  source.indexOf('data-testid={'),
  source.indexOf("</div>", source.indexOf('data-testid={')),
);

test("standalone Flights mobile landing form has a scoped title and safe trip options", () => {
  assert.match(
    source,
    /useMainFlightLandingMobilePresentation \? \([\s\S]*?sm:hidden[\s\S]*?<Plane[\s\S]*?t\("flights"\) \|\| "Flights"/,
  );
  assert.match(source, /"Round-trip"[\s\S]*?"One-way"[\s\S]*?"Multi-city"/);
  assert.match(source, /aria-disabled=\{value === "multi-city"\}/);
  assert.match(source, /disabled=\{value === "multi-city"\}/);
  assert.match(source, /if \(value === "multi-city"\) return;/);
  assert.match(source, /grid h-11 grid-cols-3 gap-0 py-0 sm:h-auto/);
});

test("main-flight landing identity mirrors the approved responsive homepage scale", () => {
  assert.match(identity, /gap-\[5px\]/);
  assert.match(
    identity,
    /h-\[18px\] w-\[18px\][^"\n]*min-\[360px\]:h-5[^"\n]*min-\[375px\]:h-\[22px\]/,
  );
  assert.match(
    identity,
    /text-\[13px\][^"\n]*font-medium[^"\n]*text-\[#075EE8\][^"\n]*min-\[360px\]:text-\[14px\][^"\n]*min-\[375px\]:text-\[16px\]/,
  );
  assert.doesNotMatch(identity, /h-6 w-6|text-\[23px\]|font-bold/);
});

test("main-flight landing trip selector uses radio-only mobile selection styling", () => {
  assert.match(selector, /text-\[12px\][^"\n]*font-medium[^"\n]*text-slate-950/);
  assert.match(selector, /max-\[359px\]:text-\[11px\]/);
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

test("supported mobile trip options update canonical state while Multi-city cannot", () => {
  assert.match(source, /const nextTripType = value as TripType;\s*setTripType\(nextTripType\)/);
  assert.match(source, /if \(nextTripType === "one-way"\) setReturnDate\(""\)/);
  assert.match(source, /if \(value === "multi-city"\) return;/);
  assert.doesNotMatch(source, /setTripType\("multi-city"\)/);
});

test("standalone Flights desktop and default presentations keep their existing selector", () => {
  assert.match(source, /sm:inline-flex sm:gap-1/);
  assert.match(
    source,
    /\.\.\.\(useMainFlightLandingMobilePresentation[\s\S]*?\[\["multi-city", "Multi-city"\] as const\][\s\S]*?: \[\]\)/,
  );
  assert.match(source, /type TripType = "round-trip" \| "one-way";/);
  assert.match(
    source,
    /if \(tripType === "round-trip"\) params\.set\("returnDate", returnDate\);/,
  );
});
