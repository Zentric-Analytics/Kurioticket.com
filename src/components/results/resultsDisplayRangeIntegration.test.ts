import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

for (const [product, file, pageSize] of [
  ["Flights", "./FlightResultsClient.tsx", "FLIGHT_RESULTS_PAGE_SIZE"],
  ["Hotels", "./HotelResultsClient.tsx", "HOTEL_RESULTS_PAGE_SIZE"],
  ["Cars", "./CarsResultsClient.tsx", "CAR_RESULTS_PAGE_SIZE"],
] as const) {
  test(`${product} displays the shared current-page result range`, () => {
    const source = read(file);

    assert.match(source, /getResultsDisplayRange\(\{/);
    assert.match(source, new RegExp(`pageSize: ${pageSize}`));
    assert.match(source, /resultsDisplayRange\.start}&ndash;\{resultsDisplayRange\.end/);
    if (product === "Hotels") {
      assert.match(source, /Showing results \$\{resultsDisplayRange\.start\} through \$\{resultsDisplayRange\.end\}`/);
      assert.doesNotMatch(source, /Showing \{resultsDisplayRange\.start\}&ndash;\{resultsDisplayRange\.end\} of/);
    } else {
      assert.match(source, /Showing results \$\{resultsDisplayRange\.start\} through \$\{resultsDisplayRange\.end\} of/);
    }
    assert.match(source, /\{resultsDisplayRange \? \(/);
  });
}
