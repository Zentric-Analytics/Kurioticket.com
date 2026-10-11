import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
test("all flight presentations use the full sorted inventory without page controls", () => {
  assert.equal((source.match(/sortedResults\.map\(\(flight, index\)/g) ?? []).length, 3);
  assert.doesNotMatch(source, /paginateFlightResults|FlightResultsPagination|resultsDisplayRange|standaloneResultsPage/);
  assert.match(source, /data-mobile-continuous-flight-results/);
});
test("continuous mobile results retain bottom spacing and accessible filter status", () => {
  assert.match(source, /data-mobile-continuous-flight-results[\s\S]*?aria-busy=\{filterApplying\}[\s\S]*?className="pt-3 pb-6"/);
  assert.match(source, /role="status" aria-live="polite"/);
  assert.doesNotMatch(source, /containIntrinsicSize|contentVisibility/);
});
