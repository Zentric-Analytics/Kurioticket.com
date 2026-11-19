import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const utility = fs.readFileSync(new URL("./paginationTransition.ts", import.meta.url), "utf8");

test("results pagination transition respects motion and waits for scroll settle", () => {
  assert.match(utility, /prefers-reduced-motion: reduce/);
  assert.match(utility, /behavior === "instant" \? "auto" : "smooth"/);
  assert.match(utility, /addEventListener\("scrollend"/);
  assert.match(utility, /maximumWaitMs = 1600/);
  assert.match(utility, /removeEventListener\("scroll"/);
  assert.match(utility, /clearTimeout\(maximumTimer\)/);
});

test("results pagination transition supports an immediate page-top strategy", () => {
  assert.match(utility, /behavior\?: "motion-aware" \| "instant"/);
  assert.match(utility, /reducedMotion \|\| behavior === "instant"/);
});

test("results pagination transition uses only a short minimum busy window", () => {
  assert.match(utility, /PAGINATION_MIN_BUSY_MS = 140/);
  assert.match(utility, /PAGINATION_REVEAL_MS = 150/);
});
