import assert from "node:assert/strict";
import test from "node:test";
import { carDetailHeaderProtectionGeometry, shouldProtectCarDetailHeader } from "./carDetailHeaderProtection";

test("Cars protects the floating-control region before hero foreground reaches it", () => {
  assert.deepEqual(carDetailHeaderProtectionGeometry(47, 329), {
    protectedHeight: 117,
    activationThreshold: 196,
    deactivationThreshold: 184,
  });
});

test("Cars header protection thresholds never become negative", () => {
  assert.deepEqual(carDetailHeaderProtectionGeometry(47, 80), {
    protectedHeight: 117,
    activationThreshold: 0,
    deactivationThreshold: 0,
  });
});

test("Cars header protection uses hysteresis around the transition", () => {
  const geometry = carDetailHeaderProtectionGeometry(47, 329);
  assert.equal(shouldProtectCarDetailHeader(195, false, geometry.activationThreshold, geometry.deactivationThreshold), false);
  assert.equal(shouldProtectCarDetailHeader(196, false, geometry.activationThreshold, geometry.deactivationThreshold), true);
  assert.equal(shouldProtectCarDetailHeader(195, true, geometry.activationThreshold, geometry.deactivationThreshold), true);
  assert.equal(shouldProtectCarDetailHeader(184, true, geometry.activationThreshold, geometry.deactivationThreshold), true);
  assert.equal(shouldProtectCarDetailHeader(183, true, geometry.activationThreshold, geometry.deactivationThreshold), false);
});
