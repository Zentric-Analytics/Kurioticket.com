import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const journey = readFileSync(new URL("./journey/error.tsx", import.meta.url), "utf8");
const handoff = readFileSync(new URL("./handoff/error.tsx", import.meta.url), "utf8");
test("guided route errors use the App Router reset contract without rendering raw errors", () => {
  assert.match(journey, /\{ error, reset \}/); assert.doesNotMatch(journey, /unstable_retry/); assert.match(journey, /onClick=\{\(\) => reset\(\)\}/);
  assert.equal((journey.match(/<h1\b/g) ?? []).length, 1); assert.match(journey, /href="\/deals"/); assert.doesNotMatch(journey, /error\.(?:message|stack|digest)/);
  assert.match(handoff, /export \{ default \}/);
});
