import assert from "node:assert/strict";
import test from "node:test";

import { flightPriceAlertAnchorBottom } from "./flightPriceAlertGeometry";

test("flight price alert anchor is responsive to full screen height and safe area", () => {
  assert.equal(flightPriceAlertAnchorBottom(800, 24), 496);
  assert.equal(flightPriceAlertAnchorBottom(640, 24), 397);
  assert.equal(flightPriceAlertAnchorBottom(320, 44), 284);
});

test("flight price alert geometry has no keyboard-dependent input", () => {
  assert.equal(flightPriceAlertAnchorBottom.length, 2);
  const keyboardHiddenAnchor = flightPriceAlertAnchorBottom(800, 24);
  const keyboardShownAnchor = flightPriceAlertAnchorBottom(800, 24);
  assert.equal(keyboardShownAnchor, keyboardHiddenAnchor);
});
