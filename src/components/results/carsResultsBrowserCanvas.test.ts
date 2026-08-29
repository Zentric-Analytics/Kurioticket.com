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

test("Cars Edit Search alone requests a white browser canvas", () => {
  assert.match(
    carsSource,
    /<MobileResultsEditSheet\s+[\s\S]{0,300}browserCanvasColor="#ffffff"/,
  );
  assert.doesNotMatch(hotelSource, /browserCanvasColor=/);
});
