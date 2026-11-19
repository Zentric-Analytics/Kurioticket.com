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

test("Cars and Hotels edit sheets isolate the background and preserve their current white browser canvas", () => {
  assert.match(carsSource, /browserCanvasColor="#ffffff"/);
  assert.match(carsSource, /isolatedBackdrop/);
  assert.match(
    carsSource,
    /<MobileResultsEditSheet\s+[^>]*appearance="carsResultsEdit"[^>]*freezeBodyPosition/,
  );
  assert.match(carsSource, /<MobileResultsEditSheet\s+[^>]*closing=\{mobileSearchClosing\}[^>]*onCloseAnimationComplete=\{cancelMobileSearchDrawer\}/);
  assert.match(
    hotelSource,
    /<MobileResultsEditSheet\s+[^>]*browserCanvasColor="#ffffff"[^>]*smoothMotion[^>]*isolatedBackdrop[^>]*className=\{mobileStyles.editSheet\}/,
  );
});
