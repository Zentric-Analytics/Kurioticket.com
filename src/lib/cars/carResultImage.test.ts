import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";

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
    "/images/cars/results/toyota-yaris.webp?v=transparent-cutouts-20260912",
  );
  assert.equal(
    resolveCarResultImageSource(
      "https://api.kurioticket.test/images/cars/results/mercedes-benz-e-class.webp?locale=en",
    ),
    "https://api.kurioticket.test/images/cars/results/mercedes-benz-e-class.webp?locale=en&v=transparent-cutouts-20260912",
  );
  assert.equal(
    resolveCarResultImageSource("https://img.supplier.test/vehicles/yaris.jpg"),
    "https://img.supplier.test/vehicles/yaris.jpg",
  );
});

test("every curated catalogue vehicle is a decodable transparent cutout", async () => {
  const catalogue = await readFile(
    resolve("src/services/travel/staticCarCatalogue.ts"),
    "utf8",
  );
  const assetUrls = [
    ...catalogue.matchAll(/imageUrl: "(\/images\/cars\/results\/[^"]+)"/g),
  ].map((match) => match[1]);

  assert.equal(assetUrls.length, 30);
  assert.equal(new Set(assetUrls).size, assetUrls.length);
  assert.ok(
    assetUrls.includes("/images/cars/results/mercedes-benz-e-class.webp"),
    "E-Class must remain mapped to its canonical asset",
  );

  await Promise.all(
    assetUrls.map(async (assetUrl) => {
      const assetPath = resolve("public", assetUrl.slice(1));
      await access(assetPath);
      const image = sharp(assetPath);
      const metadata = await image.metadata();
      assert.equal(metadata.hasAlpha, true, `${assetUrl} must include alpha`);
      assert.equal(metadata.width, 1400, `${assetUrl} must retain its canvas width`);
      assert.equal(metadata.height, 900, `${assetUrl} must retain its canvas height`);

      const corners = await image
        .clone()
        .ensureAlpha()
        .extract({ left: 0, top: 0, width: metadata.width!, height: metadata.height! })
        .raw()
        .toBuffer();
      const channels = metadata.channels;
      const alphaAt = (x: number, y: number) =>
        corners[(y * metadata.width! + x) * channels + channels - 1];
      for (const [x, y] of [
        [0, 0],
        [metadata.width! - 1, 0],
        [0, metadata.height! - 1],
        [metadata.width! - 1, metadata.height! - 1],
      ]) {
        assert.equal(alphaAt(x, y), 0, `${assetUrl} must have transparent corners`);
      }
    }),
  );
});
