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

test("Cars uses a stable white browser canvas and masked header blend while Results sheets own lower continuations", () => {
  assert.match(carsSource, /browserCanvasColor="#ffffff"/);
  assert.match(carsSource, /blendHeaderBackdrop/);
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
