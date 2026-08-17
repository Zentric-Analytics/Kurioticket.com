import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/lib/search/desktopPageScrollLock.ts"),
  "utf8",
);
const hotelSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/results/HotelResultsClient.tsx"),
  "utf8",
);
const carsSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/results/CarsResultsClient.tsx"),
  "utf8",
);

test("desktop scroll locking preserves the viewport coordinate", () => {
  assert.match(source, /scrollbarGutter = "stable"/);
  assert.match(source, /overflow = "hidden"/);
  assert.doesNotMatch(source, /position = "fixed"/);
  assert.doesNotMatch(source, /window\.scrollTo/);
  assert.doesNotMatch(source, /scrollY/);
});

test("Hotel and Cars sticky search dialogs use the stable desktop lock", () => {
  for (const clientSource of [hotelSource, carsSource]) {
    assert.match(clientSource, /lockDesktopPageScroll\(\)/);
  }
});
