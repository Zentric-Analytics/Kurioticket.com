import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
test("source-contract: Cars compact toolbar is transparent and five-column", () => {
  assert.match(source, /pointer-events-none fixed inset-x-0 top-3 z-\[1000\] hidden px-4/);
  assert.match(source, /h-\[58px\].*max-w-\[980px\].*grid-cols-\[minmax\(260px,1\.7fr\)/s);
  for (const section of ["locations", "dates", "times", "driverAge"]) assert.match(source, new RegExp(`\\["${section}"`));
  assert.match(source, /searchFormRef\.current\?\.requestSubmit\(\)/);
  assert.match(source, /locationPairSummary/);
  assert.match(source, /rentalDateSummary/);
  assert.match(source, /timeSummary/);
  assert.match(source, /driverAgeSummary/);
});
