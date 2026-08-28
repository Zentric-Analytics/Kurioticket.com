import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { staticCarCatalogue } from "./staticCarCatalogue";

const approvedPrefix = "/images/cars/results/";

test("all 30 static Cars fixtures own distinct working local photographs", () => {
  assert.equal(staticCarCatalogue.length, 30);

  const imageUrls = staticCarCatalogue.map((car) => {
    assert.equal(typeof car.imageUrl, "string", car.modelName);
    assert.ok(car.imageUrl, car.modelName);
    assert.ok(car.imageUrl.startsWith(approvedPrefix), car.imageUrl);
    const localPath = path.join(process.cwd(), "public", car.imageUrl.slice(1));
    assert.ok(existsSync(localPath), `${car.modelName}: ${localPath}`);
    const imageBytes = readFileSync(localPath);
    assert.ok(imageBytes.length > 0, `${car.modelName}: empty image file`);
    assert.equal(imageBytes.subarray(0, 4).toString("ascii"), "RIFF", car.modelName);
    assert.equal(imageBytes.subarray(8, 12).toString("ascii"), "WEBP", car.modelName);
    return car.imageUrl;
  });

  assert.equal(new Set(imageUrls).size, staticCarCatalogue.length);
});

test("the runtime image-unavailable fallback remains intact for future failures", () => {
  const imageComponent = readFileSync(
    path.join(process.cwd(), "src/components/results/CarResultImage.tsx"),
    "utf8",
  );
  assert.match(imageComponent, /onError=\{\(\) => setFailedUrl\(resolvedImageUrl\)\}/);
  assert.match(imageComponent, /Vehicle image unavailable/);
  assert.match(imageComponent, /failedUrl !== resolvedImageUrl/);
});
