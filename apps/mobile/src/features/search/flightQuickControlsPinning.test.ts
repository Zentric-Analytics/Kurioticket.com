import assert from "node:assert/strict";
import test from "node:test";
import { flightQuickControlsPinStateChanged, shouldPinFlightQuickControls } from "./flightQuickControlsPinning";

test("pinning uses the measured anchor boundary", () => {
  assert.equal(shouldPinFlightQuickControls(79, 80), false);
  assert.equal(shouldPinFlightQuickControls(80, 80), true);
  assert.equal(shouldPinFlightQuickControls(81, 80), true);
  assert.equal(shouldPinFlightQuickControls(0, 0), true);
});

test("render state changes only when crossing the pin boundary", () => {
  assert.equal(flightQuickControlsPinStateChanged(false, false), false);
  assert.equal(flightQuickControlsPinStateChanged(false, true), true);
  assert.equal(flightQuickControlsPinStateChanged(true, true), false);
  assert.equal(flightQuickControlsPinStateChanged(true, false), true);
});
