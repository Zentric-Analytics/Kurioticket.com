import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const carsSource = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const hotelSource = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

test("Cars keeps the browser canvas backdrop-colored and owns its white lower continuation", () => {
  assert.doesNotMatch(carsSource, /browserCanvasColor=/);
  assert.match(
    carsSource,
    /<MobileResultsEditSheet\s+[\s\S]{0,300}bottomSurfaceContinuation/,
  );
  assert.doesNotMatch(hotelSource, /bottomSurfaceContinuation/);
  assert.doesNotMatch(hotelSource, /browserCanvasColor=/);
});
