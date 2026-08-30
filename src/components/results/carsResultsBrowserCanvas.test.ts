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

test("Cars and Hotel keep the backdrop canvas while owning product-colored lower continuations", () => {
  assert.doesNotMatch(carsSource, /browserCanvasColor=/);
  assert.match(
    carsSource,
    /<MobileResultsEditSheet\s+[\s\S]{0,300}bottomSurfaceContinuation/,
  );
  assert.match(
    hotelSource,
    /<MobileResultsEditSheet\s+[\s\S]{0,300}bottomSurfaceContinuation[\s\S]{0,120}bottomSurfaceContinuationClassName="bg-slate-50"/,
  );
  assert.doesNotMatch(hotelSource, /browserCanvasColor=/);
});
