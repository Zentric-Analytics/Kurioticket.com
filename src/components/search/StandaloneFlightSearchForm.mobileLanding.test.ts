import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "src/components/search/StandaloneFlightSearchForm.tsx",
  "utf8",
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
  assert.match(source, /grid grid-cols-3 gap-1/);
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
