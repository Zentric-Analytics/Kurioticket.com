import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const results = read("src/features/search/ApprovedCarResultsScreen.tsx");
const details = read("src/features/search/ApprovedCarDetailScreen.tsx");
const saved = read("src/features/saved/SavedScreen.tsx");
const openDeal = results.slice(results.indexOf("const openDeal"), results.indexOf("const clearFilters="));
const returnToResults = details.slice(details.indexOf("const returnToCarResults"), details.indexOf("const light="));
const savedCarRoute = saved.slice(saved.indexOf('if (item.type === "car")'), saved.indexOf("const destinationId"));

test("Cars Results pushes Details with Results-stack provenance and the resolved image cache key", () => {
  assert.match(openDeal, /router\.push\s*\(\s*\{/);
  assert.match(openDeal, /pathname\s*:\s*"\/car-details"/);
  assert.match(openDeal, /result\s*:\s*JSON\.stringify\s*\(\s*\{\s*\.\.\.result\s*,\s*imageUrl\s*:\s*resolveNativeCarImageUri\s*\(\s*result\.imageUrl\s*\)\s*\?\?\s*result\.imageUrl\s*\}\s*\)/);
  assert.match(openDeal, /resultId\s*:\s*result\.id/);
  assert.match(openDeal, /carResultsStack\s*:\s*"1"/);
  assert.doesNotMatch(openDeal, /router\.replace\s*\(/);
});

test("Cars Details reads provenance and dismisses to actual existing Results", () => {
  assert.match(details, /useNavigation/);
  assert.match(details, /const\s+navigation\s*=\s*useNavigation\s*\(\s*\)/);
  assert.match(details, /one\s*\(\s*params\.carResultsStack\s*\)\s*===\s*"1"/);
  assert.doesNotMatch(details, /const\s+carResultsStack\s*=\s*true/);
  assert.match(returnToResults, /if\s*\(\s*carResultsStack\s*\)/);
  assert.match(returnToResults, /carResultsDismissCount\s*\(\s*navigation\.getState\s*\(\s*\)\s*\)/);
  assert.match(returnToResults, /router\.dismiss\s*\(\s*dismissCount\s*\)\s*;\s*return\s*;/);
  assert.doesNotMatch(returnToResults, /router\.(?:back|dismissTo|setParams|navigate|push)\s*\(/);
});

test("Cars Details retains the canonical Results replacement fallback", () => {
  assert.match(returnToResults, /router\.replace\s*\(\s*\{\s*pathname\s*:\s*"\/car-results"\s*,\s*params\s*:\s*search\s*\}\s*\)/);
  for (const field of ["pickupLocation", "dropoffLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge"]) assert.match(details, new RegExp(`\\b${field}(?::|,)`));
});

test("Saved Cars open Details without Results-stack provenance", () => {
  assert.match(savedCarRoute, /router\.push\s*\(\s*\{\s*pathname\s*:\s*"\/car-details"/);
  assert.doesNotMatch(savedCarRoute, /carResultsStack/);
});
