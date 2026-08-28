import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);

test("standalone Cars owns one accessible immediate Back-to-top control", () => {
  assert.equal(source.match(/aria-label="Back to top"/g)?.length, 1);
  assert.match(source, /!guidedPlanning && showBackToTop && !filtersOpen/);
  assert.match(source, /window\.scrollY >= 600/);
  assert.match(
    source,
    /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/,
  );
  assert.match(source, /h-11 w-11/);
  assert.match(source, /end-4 z-40/);
  assert.match(source, /env\(safe-area-inset-bottom\)/);
  assert.doesNotMatch(
    source,
    /aria-label="Back to top"[\s\S]{0,220}motionBehavior\(\)/,
  );
});
