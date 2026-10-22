import assert from "node:assert/strict";
import test from "node:test";
import { isFlightQuickControlTap } from "./flightQuickControlActivation";

const start = { pageX: 100, pageY: 200, timestamp: 1_000 };

test("Android sticky-safe activation accepts taps and normal small movement", () => {
  assert.equal(isFlightQuickControlTap(start, { pageX: 100, pageY: 200, timestamp: 1_100 }), true);
  assert.equal(isFlightQuickControlTap(start, { pageX: 108, pageY: 194, timestamp: 1_200 }), true);
});

test("Android sticky-safe activation rejects horizontal rail swipes and long touches", () => {
  assert.equal(isFlightQuickControlTap(start, { pageX: 120, pageY: 200, timestamp: 1_100 }), false);
  assert.equal(isFlightQuickControlTap(start, { pageX: 100, pageY: 200, timestamp: 1_501 }), false);
});
