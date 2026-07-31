import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Flights reads destination params and passes the prefill into flight search", () => {
  const source = readFileSync("src/features/flow/ProductScreens.tsx", "utf8");
  assert.match(source, /useLocalSearchParams<\{ destination\?: string \| string\[\] \}>/);
  assert.match(source, /<FlightSearchPanel initialDestination=\{destination\} \/>/);
});

test("unknown destinations do not retain an unrelated default airport", () => {
  const source = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  assert.match(source, /setTo\(match\)/);
  assert.match(source, /We couldn't match/);
  assert.match(source, /if \(!to\).*Choose a destination airport/);
});
