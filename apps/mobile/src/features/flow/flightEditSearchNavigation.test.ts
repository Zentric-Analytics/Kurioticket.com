import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("approved flight Edit search pushes current canonical params without going back", () => {
  const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
  const flightStart = source.indexOf('if (product === "flight")');
  const flightEnd = source.indexOf("    }\n", source.indexOf("      return;", flightStart)) + 6;
  const flightBranch = source.slice(flightStart, flightEnd);
  assert.match(flightBranch, /router\.push\(\{ pathname: "\/edit-flight-search", params: flightEditSearchParams\(params\) \}\)/);
  assert.doesNotMatch(flightBranch, /pathname: "\/flights"/);
  assert.doesNotMatch(flightBranch, /router\.(?:back|replace)/);
});

test("dedicated edit screen hydrates the shared form, cancels, and replaces stale edit history on submit", () => {
  const screen = readFileSync("src/features/flow/EditFlightSearchScreen.tsx", "utf8");
  const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  assert.match(screen, /useLocalSearchParams<Record<string, string \| string\[\]>>\(\)/);
  assert.match(screen, /<FlightSearchPanel params=\{params\} submitNavigation="replace" \/>/);
  assert.match(screen, /onPress=\{\(\) => router\.back\(\)\}/);
  assert.doesNotMatch(screen, /FlightsScreen|ResponsiveHero|Routes/);
  assert.match(panel, /router\[submitNavigation\]\(\{ pathname: "\/flight-results", params: flightSearchParams\(form\) \}\)/);
});
