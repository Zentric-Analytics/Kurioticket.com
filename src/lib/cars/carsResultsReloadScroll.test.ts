import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const policy = fs.readFileSync(
  new URL("./carsResultsReloadScroll.ts", import.meta.url),
  "utf8",
);
const carsPage = fs.readFileSync(
  new URL("../../app/cars/results/page.tsx", import.meta.url),
  "utf8",
);

test("Cars Results owns an early, reload-only scroll reset", () => {
  assert.match(policy, /navigation\.type !== \"reload\"/);
  assert.match(policy, /history\.scrollRestoration = \"manual\"/);
  assert.match(policy, /window\.scrollTo\(0, 0\)/);
  assert.match(policy, /DOMContentLoaded/);
  assert.match(policy, /window\.addEventListener\(\"load\"/);
  assert.match(policy, /window\.addEventListener\(\"pageshow\"/);
  assert.match(carsPage, /data-cars-results-reload-scroll-policy/);
});

test("Cars Results releases restoration ownership before history navigation", () => {
  assert.match(policy, /const previousScrollRestoration = history\.scrollRestoration/);
  assert.match(policy, /history\.scrollRestoration = previousScrollRestoration/);
  assert.match(policy, /window\.addEventListener\(\"pagehide\", release, \{ once: true \}\)/);
});
