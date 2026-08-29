import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const read = (name: string) => fs.readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

for (const [vertical, file, skeleton] of [
  ["Cars", "CarsResultsClient.tsx", "CarCardSkeleton"],
  ["Hotels", "HotelResultsClient.tsx", "HotelCardSkeleton"],
  ["Flights", "FlightResultsClient.tsx", "FlightCardSkeleton"],
] as const) {
  test(`${vertical} pagination preserves geometry and uses card skeletons`, () => {
    const source = read(file);
    assert.match(source, /paginationPendingPage/);
    assert.match(source, /getBoundingClientRect\(\)\.height/);
    assert.match(source, /minHeight: paginationMinHeight/);
    assert.match(source, /aria-busy=/);
    assert.match(source, new RegExp(skeleton));
    assert.match(source, /scrollToResultsAndWait/);
  });
}

test("Flight pagination defers URL commit and prevents Next scrolling", () => {
  const source = read("FlightResultsClient.tsx");
  assert.match(source, /await scrollToResultsAndWait[\s\S]*router\.push[\s\S]*scroll: false/);
  assert.match(source, /paginationPendingPage !== validResultsPage/);
});
