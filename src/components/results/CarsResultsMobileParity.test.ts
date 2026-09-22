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
const presentationSource = readFileSync(
  "src/lib/cars/carFilterPresentation.ts",
  "utf8",
);
const mobileSummarySection = resultsSource.slice(
  resultsSource.indexOf('aria-label={t("carsResults.carRentalSearch")}') - 200,
  resultsSource.indexOf("<MobileDatePickerDialog"),
);
const mobileSummaryControls = resultsSource.slice(
  resultsSource.indexOf("const renderMobileControlsRow"),
  resultsSource.indexOf("const renderCarsSearchForm"),
);

test("mobile Cars Results owns the native canvas without changing the desktop canvas", () => {
  assert.match(resultsSource, /bg-\[#F5F7FB\] pb-8 sm:bg-\[#f6f8fb\]/);
});

test("mobile Cars Results keeps its summary band white above the native canvas", () => {
  assert.match(mobileSummarySection, /bg-white pb-0 pt-0 sm:hidden/);
  assert.doesNotMatch(mobileSummarySection, /bg-\[#F5F7FB\]/);
  assert.match(mobileSummarySection, /relative translate-y-1\/2/);
  assert.match(mobileSummaryControls, /rounded-xl border border-slate-200\/80 bg-white/);
});

test("mobile shortcuts are compact, scrollable touch targets in canonical order", () => {
  const rail = resultsSource.slice(
    resultsSource.indexOf("data-cars-results-quick-filters"),
    resultsSource.indexOf("data-cars-results-summary-row"),
  );
  assert.ok(rail.indexOf("filtersButtonRef") < rail.indexOf('quickFilterGroupId === "sort"'));
  assert.ok(rail.indexOf('quickFilterGroupId === "sort"') < rail.indexOf("quickFilterGroups.map"));
  assert.match(rail, /flex-nowrap[^\"]*gap-1\.5[^\"]*overflow-x-auto[^\"]*overscroll-x-contain/);
  assert.match(rail, /\[scrollbar-width:none\][^\"]*\[&::-webkit-scrollbar\]:hidden/);
  assert.match(rail, /-me-4[^\"]*w-\[calc\(100%\+1rem\)\][^\"]*pe-4/);
  assert.match(rail, /min-h-11 min-w-11 shrink-0/);
  assert.match(rail, /h-9[^\"]*rounded-\[9px\][^\"]*border-\[#D8E1EC\][^\"]*bg-white px-2/);
  assert.doesNotMatch(rail, /px-2\.5/);
  assert.doesNotMatch(rail, /style=\{\{\s*width|basis-/);
  assert.match(rail, /locale\.startsWith\("en"\) \? "Filter" : t\("filters"\)/);
  assert.doesNotMatch(rail, /Swipe for more/i);
  assert.match(resultsSource, /mobile \? group\.title \?\? "Price"/);
  assert.doesNotMatch(rail, /Price \(per day\)/);
});

test("mobile shortcuts retain every shared quick-filter group", () => {
  assert.match(resultsSource, /const quickFilterGroups = carQuickFilterGroupIds\.flatMap/);
  assert.match(
    presentationSource,
    /carQuickFilterGroupIds = \["pricePerDay", "vehicleType", "transmission", "seats", "cancellation", "pickupLocationType"\] as const/,
  );
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
