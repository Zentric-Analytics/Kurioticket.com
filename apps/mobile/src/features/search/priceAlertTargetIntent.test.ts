import assert from "node:assert/strict";
import test from "node:test";
import { PriceAlertTargetIntent } from "./priceAlertTargetIntent";

test("a close invalidates an unfinished target-sheet open", () => {
  const intent = new PriceAlertTargetIntent();
  const openA = intent.beginOpen();

  assert.equal(intent.isCurrent(openA), true);
  intent.close();

  assert.equal(intent.isCurrent(openA), false);
});

test("a later intentional open remains valid after a close", () => {
  const intent = new PriceAlertTargetIntent();
  const openA = intent.beginOpen();
  intent.close();
  const openC = intent.beginOpen();

  assert.equal(intent.isCurrent(openA), false);
  assert.equal(intent.isCurrent(openC), true);
});
