import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const results = read("src/features/search/ApprovedCarResultsScreen.tsx");
const details = read("src/features/search/ApprovedCarDetailScreen.tsx");
const saved = read("src/features/saved/SavedScreen.tsx");
const openDeal = results.slice(results.indexOf("const openDeal"), results.indexOf("const image="));
const returnToResults = details.slice(details.indexOf("const returnToCarResults"), details.indexOf("const light="));
const savedCarRoute = saved.slice(saved.indexOf('if (item.type === "car")'), saved.indexOf("const destinationId"));

test("Cars Results pushes Details with Results-stack provenance", () => {
  assert.match(openDeal, /router\.push\(\{/);
  assert.match(openDeal, /pathname:"\/car-details"/);
  assert.match(openDeal, /result:JSON\.stringify\(result\)/);
  assert.match(openDeal, /resultId:result\.id/);
  assert.match(openDeal, /carResultsStack:"1"/);
  assert.doesNotMatch(openDeal, /router\.replace/);
});

test("Cars Details reads provenance and dismisses to actual existing Results", () => {
  assert.match(details, /useNavigation/);
  assert.match(details, /const navigation=useNavigation\(\)/);
  assert.match(details, /one\(params\.carResultsStack\)==="1"/);
  assert.doesNotMatch(details, /const carResultsStack\s*=\s*true/);
  assert.match(returnToResults, /if\(carResultsStack\)/);
  assert.match(returnToResults, /carResultsDismissCount\(navigation\.getState\(\)\)/);
  assert.match(returnToResults, /router\.dismiss\(dismissCount\);return;/);
  assert.doesNotMatch(returnToResults, /router\.(?:back|dismissTo|setParams|navigate|push)\(/);
});

test("Cars Details retains the canonical Results replacement fallback", () => {
  assert.match(returnToResults, /router\.replace\(\{pathname:"\/car-results",params:search\}\)/);
  for (const field of ["pickupLocation", "dropoffLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge"]) assert.match(details, new RegExp(`\\b${field}(?::|,)`));
});

test("Saved Cars open Details without Results-stack provenance", () => {
  assert.match(savedCarRoute, /router\.push\(\{ pathname: "\/car-details"/);
  assert.doesNotMatch(savedCarRoute, /carResultsStack/);
});
