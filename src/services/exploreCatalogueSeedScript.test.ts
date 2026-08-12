import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Explore seed uses bulk idempotent writes instead of an interactive transaction", () => {
  const source = readFileSync("scripts/seed-explore-catalogue.ts", "utf8");

  assert.doesNotMatch(source, /\$transaction\s*\(/);
  assert.match(source, /exploreRegion\.createMany\s*\(/);
  assert.match(source, /exploreDestination\.createMany\s*\(/);
  assert.equal((source.match(/skipDuplicates:\s*true/g) ?? []).length, 2);
  assert.ok(
    source.indexOf("exploreRegion.createMany") < source.indexOf("exploreDestination.createMany"),
    "regions must be inserted before destinations so foreign keys are satisfied",
  );
});
