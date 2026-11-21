import assert from "node:assert/strict";
import test from "node:test";
import { recordedDeviceSessionStatus, recordedDeviceSignOutReason } from "./adminDeviceSessionStatus";

const now = new Date("2026-11-21T12:00:00.000Z");

test("revocation takes precedence over expiry and is labeled Signed out", () => {
  assert.equal(recordedDeviceSessionStatus({
    revokedAt: new Date("2026-11-20T15:00:00.000Z"),
    expiresAt: new Date("2026-11-21T09:00:00.000Z"),
  }, now), "Signed out");
  assert.equal(recordedDeviceSessionStatus({
    revokedAt: new Date("2026-11-21T10:00:00.000Z"),
    expiresAt: new Date("2026-11-22T09:00:00.000Z"),
  }, now), "Signed out");
});

test("natural expiry and non-expired records keep separate truthful statuses", () => {
  assert.equal(recordedDeviceSessionStatus({
    revokedAt: null, expiresAt: new Date("2026-11-21T11:59:59.000Z"),
  }, now), "Expired");
  assert.equal(recordedDeviceSessionStatus({ revokedAt: null, expiresAt: now }, now), "Expired");
  assert.equal(recordedDeviceSessionStatus({
    revokedAt: null, expiresAt: new Date("2026-11-21T12:00:01.000Z"),
  }, now), "Not expired");
});

test("revocation reason labels never expose raw internal codes", () => {
  assert.equal(recordedDeviceSignOutReason("web_logout"), "Signed out from web");
  assert.equal(recordedDeviceSignOutReason("password_reset"), "Password reset");
  assert.equal(recordedDeviceSignOutReason("sign_out_everywhere"), "Signed out everywhere");
  assert.equal(recordedDeviceSignOutReason("account_suspended"), "Account suspended");
  assert.equal(recordedDeviceSignOutReason("unrecognized_private_code"), "Other security action");
  assert.equal(recordedDeviceSignOutReason(null), null);
});
