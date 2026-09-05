import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { carFilterGroups } from "../../../../../src/lib/cars/carFilterPresentation";
import { carFilterCopy } from "./carFilterCopy";

const sheet = readFileSync("src/features/search/CarFilterSheet.tsx", "utf8");
const screen = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
const presentation = readFileSync("../../src/lib/cars/carFilterPresentation.ts", "utf8");
const web = readFileSync("../../src/components/results/CarsResultsClient.tsx", "utf8");

test("Web and Native consume one canonical Car filter presentation", () => {
  assert.match(web, /import \{ carFilterGroups, carQuickFilterGroupIds/);
  assert.match(sheet, /carFilterGroups/);
  for (const id of ["totalPrice", "vehicleType", "transmission", "seats", "bags", "fuelPolicy", "mileagePolicy", "cancellation", "pickupLocationType"]) assert.ok(presentation.includes(`id: "${id}"`), id);
  assert.match(presentation, /id: "luxuryCars", labelKey: "carsTripStyle\.luxury\.title"/);
  assert.match(presentation, /id: "vans", labelKey: "carsTripStyle\.van\.title"/);
});

test("Native derives available options and result counts from canonical results", () => {
  assert.match(sheet, /doesCarMatchFilterOption\(car, option\.id\)/);
  assert.match(sheet, /filterCarResults\(results, filters\)\.length/);
  assert.match(sheet, /filter\(\(option\) => option\.count > 0\)/);
});

test("main Car filters are full screen and quick filters are real scoped sheets", () => {
  assert.match(sheet, /fullScreen=\{full\}/);
  assert.doesNotMatch(sheet, /fullScreenFooterExtraBottomPadding/);
  assert.match(screen, /setFilterSheet\("all"\)/);
  assert.match(screen, /setFilterSheet\(group\.id\)/);
  assert.doesNotMatch(screen, /cycle\(|Lower total|Rental company/);
});

test("Car filter edits are local, immediate, clearable and do not search again", () => {
  assert.match(sheet, /onChange\(\{ \.\.\.filters, \[group\]: next \}\)/);
  assert.match(sheet, /const clear = \(\) => onChange\(\{\}\)/);
  assert.match(sheet, /label=\{`\$\{copy\.show\}/);
  assert.doesNotMatch(sheet, /travelApi\.|searchCars|router\./);
});

test("filtered-empty remains distinct from canonical empty", () => {
  assert.match(screen, /status==="empty"\?<Empty title="No rental cars found"/);
  assert.match(screen, /<Empty title="No cars match these filters"/);
  assert.match(screen, /retry=\{clearFilters\}/);
});

test("English, Spanish and Arabic filter copy and RTL context remain supported", () => {
  const copy = readFileSync("src/features/search/carFilterCopy.ts", "utf8");
  assert.match(copy, /const english/);
  assert.match(copy, /es:/);
  assert.match(copy, /ar:/);
  assert.match(sheet, /useMobileLocalization\(\)/);
});

test("Spanish and Arabic localize every canonical Car option", () => {
  const englishCopy = carFilterCopy("en-us");
  for (const locale of ["es-es", "ar"] as const) {
    const copy = carFilterCopy(locale);
    for (const option of carFilterGroups.flatMap((group) => group.options)) {
      assert.ok(copy.options[option.id]?.trim(), `${locale}: ${option.id}`);
    }
    assert.notEqual(copy.options.freeCancellation, englishCopy.options.freeCancellation, locale);
  }
});
