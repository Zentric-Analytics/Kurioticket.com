import assert from "node:assert/strict";
import test from "node:test";
import { carDetailHeaderProtectionGeometry } from "./carDetailHeaderProtection";

test("Cars protects only the safe-area and floating-control region", () => {
  assert.deepEqual(carDetailHeaderProtectionGeometry(47, 329), {
    protectedHeight: 117,
    threshold: 212,
  });
});

test("Cars header protection never activates at a negative scroll threshold", () => {
  assert.equal(carDetailHeaderProtectionGeometry(47, 80).threshold, 0);
});
