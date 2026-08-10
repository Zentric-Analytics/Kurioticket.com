import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("approved flight Edit search pushes current canonical params without going back", () => {
  const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
  const flightBranch = source.slice(source.indexOf('if (product === "flight")'), source.indexOf('router.canGoBack()', source.indexOf('if (product === "flight")')));
  assert.match(flightBranch, /router\.push\(\{ pathname: "\/flights", params: flightEditSearchParams\(params\) \}\)/);
  assert.doesNotMatch(flightBranch, /router\.(?:back|replace)/);
});
