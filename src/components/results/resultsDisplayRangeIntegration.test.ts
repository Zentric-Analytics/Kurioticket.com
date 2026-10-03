import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

for (const [product, file, pageSize] of [
  ["Flights", "./FlightResultsClient.tsx", "FLIGHT_RESULTS_PAGE_SIZE"],
  ["Hotels", "./HotelResultsClient.tsx", "HOTEL_RESULTS_PAGE_SIZE"],
] as const) {
  test(`${product} displays the shared current-page result range`, () => {
    const source = read(file);

    assert.match(source, /getResultsDisplayRange\(\{/);
    assert.match(source, new RegExp(`pageSize: ${pageSize}`));
    assert.match(source, /resultsDisplayRange\.start\}\s*&ndash;\s*\{resultsDisplayRange\.end/);
    if (product === "Hotels") {
      assert.match(source, /Showing results \$\{resultsDisplayRange\.start\} through \$\{resultsDisplayRange\.end\}`/);
      assert.doesNotMatch(source, /Showing \{resultsDisplayRange\.start\}&ndash;\{resultsDisplayRange\.end\} of/);
    } else {
      assert.match(source, /Showing results \$\{resultsDisplayRange\.start\} through \$\{resultsDisplayRange\.end\} of/);
    }
    assert.match(source, product === "Hotels"
      ? /\{resultsDisplayRange && totalHotelResultPages > 1 \? \(/
      : /\{resultsDisplayRange \? \(/);
  });
}


test("Cars shows the total result count without a current-page range", () => {
  const source = read("./CarsResultsClient.tsx");
  assert.match(source, /\.format\(visibleResults\.length\)/);
  assert.doesNotMatch(source, /getResultsDisplayRange|resultsDisplayRange|CAR_RESULTS_PAGE_SIZE/);
  assert.doesNotMatch(source, /Showing results .* through .* of/);
});
