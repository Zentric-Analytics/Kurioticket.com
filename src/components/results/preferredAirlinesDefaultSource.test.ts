import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "src/components/results/FlightResultsClient.tsx",
  "utf8",
);

test("signed-out users do not request travel preferences", () => {
  assert.match(source, /sessionStatus !== "authenticated"[\s\S]*return;/);
  assert.match(source, /fetch\("\/api\/account\/travel-preferences"/);
});

test("travel preferences request is guarded against duplicates", () => {
  assert.match(source, /travelPreferencesRequestedRef\.current\) return;/);
  assert.match(source, /travelPreferencesRequestedRef\.current = true;/);
});

test("URL and existing airline filters override preferred airlines", () => {
  assert.match(
    source,
    /hasAirlineFilterSearchParam\(new URLSearchParams\(queryString\)\)\) return;/,
  );
  assert.match(source, /selectedAirlines\.length > 0\) return;/);
});

test("preferred airline default is attempted only once so users can clear it", () => {
  assert.match(source, /preferredAirlineDefaultAppliedRef\.current/);
  assert.match(source, /preferredAirlineDefaultAppliedRef\.current = true;/);
});

test("travel preference failures keep existing flight results behavior", () => {
  assert.match(
    source,
    /catch \{\s*\/\/ Flight results keep today's behavior if travel preferences are unavailable\./,
  );
});
