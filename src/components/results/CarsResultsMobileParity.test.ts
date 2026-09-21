import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsSource = readFileSync(
  "src/components/results/CarsResultsClient.tsx",
  "utf8",
);
const alertSource = readFileSync(
  "src/components/results/CarPriceAlertControl.tsx",
  "utf8",
);

test("mobile Cars Results owns the native canvas without changing the desktop canvas", () => {
  assert.match(resultsSource, /bg-\[#F5F7FB\] pb-8 sm:bg-\[#f6f8fb\]/);
  assert.match(resultsSource, /bg-\[#F5F7FB\] pb-0 pt-0 sm:hidden/);
  assert.match(resultsSource, /rounded-xl border border-slate-200\/80 bg-white/);
});

test("mobile shortcuts place Sort after Filter and keep the concise Price label", () => {
  const rail = resultsSource.slice(
    resultsSource.indexOf("data-cars-results-quick-filters"),
    resultsSource.indexOf("data-cars-results-summary-row"),
  );
  assert.ok(rail.indexOf("filtersButtonRef") < rail.indexOf('quickFilterGroupId === "sort"'));
  assert.ok(rail.indexOf('quickFilterGroupId === "sort"') < rail.indexOf("quickFilterGroups.map"));
  assert.match(rail, /h-9[^\"]*rounded-\[9px\][^\"]*border-\[#D8E1EC\][^\"]*bg-white/);
  assert.match(resultsSource, /mobile \? group\.title \?\? "Price"/);
  assert.doesNotMatch(rail, /Price \(per day\)/);
});

test("mobile result summary hides the desktop Sort by control", () => {
  const summary = resultsSource.slice(
    resultsSource.indexOf("data-cars-results-summary-row"),
    resultsSource.indexOf("appliedCarFilters.length"),
  );
  assert.match(summary, /hidden[^\"]*sm:flex/);
  assert.match(summary, /carsResults\.sortBy/);
});

test("mobile car price alert uses the native alert palette and bare bell", () => {
  assert.match(alertSource, /border-\[#C8DFF7\] bg-\[#EDF6FF\]/);
  assert.match(alertSource, /text-\[#1769AA\]/);
  assert.match(alertSource, /sm:rounded-full sm:bg-blue-50/);
});
