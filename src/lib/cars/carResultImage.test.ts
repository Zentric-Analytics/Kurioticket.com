import assert from "node:assert/strict";
import test from "node:test";

import {
  isCuratedCarResultImage,
  resolveCarResultImageSource,
} from "./carResultImage";

test("canonical Kurioticket Cars assets are classified as curated", () => {
  assert.equal(
    isCuratedCarResultImage("/images/cars/results/mercedes-benz-e-class.webp"),
    true,
  );
  assert.equal(
    isCuratedCarResultImage(
      "https://api.kurioticket.test/images/cars/results/mercedes-benz-e-class.webp?v=1",
    ),
    true,
  );
});

test("arbitrary supplier imagery is not classified as curated", () => {
  assert.equal(
    isCuratedCarResultImage("https://img.supplier.test/vehicles/e-class.jpg"),
    false,
  );
  assert.equal(isCuratedCarResultImage(undefined), false);
});

test("local curated Cars assets receive the current cache version", () => {
  assert.equal(
    resolveCarResultImageSource("/images/cars/results/toyota-yaris.webp"),
    "/images/cars/results/toyota-yaris.webp?v=isolated-20260912",
  );
  assert.equal(
    resolveCarResultImageSource("https://img.supplier.test/vehicles/yaris.jpg"),
    "https://img.supplier.test/vehicles/yaris.jpg",
  );
});
