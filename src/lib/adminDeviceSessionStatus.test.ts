import assert from "node:assert/strict";
import test from "node:test";
import { recordedDeviceSessionStatus, recordedDeviceSignOutReason } from "./adminDeviceSessionStatus";

const now = new Date("2026-11-21T12:00:00.000Z");
const session = { revokedAt: null, expiresAt: new Date("2026-11-21T14:00:00.000Z") };

test("only verified, recent per-session presence can display Active", () => {
  assert.equal(recordedDeviceSessionStatus(session, now, "online"), "Active");
  assert.equal(recordedDeviceSessionStatus(session, now, "offline"), "Inactive");
  assert.equal(recordedDeviceSessionStatus(session, now, "unavailable"), "Unknown");
});

test("revocation and expiry override presence, even when a heartbeat lingers", () => {
  assert.equal(recordedDeviceSessionStatus({
    revokedAt: new Date("2026-11-20T15:00:00.000Z"),
    expiresAt: new Date("2026-11-21T09:00:00.000Z"),
  }, now, "online"), "Signed out");
  assert.equal(recordedDeviceSessionStatus({
    revokedAt: new Date("2026-11-21T10:00:00.000Z"),
    expiresAt: new Date("2026-11-22T09:00:00.000Z"),
  }, now, "unavailable"), "Signed out");
  assert.equal(recordedDeviceSessionStatus({
    revokedAt: null, expiresAt: new Date("2026-11-21T11:59:59.000Z"),
  }, now, "online"), "Expired");
  assert.equal(recordedDeviceSessionStatus({ revokedAt: null, expiresAt: now }, now, "offline"), "Expired");
  assert.equal(recordedDeviceSessionStatus({
    revokedAt: null, expiresAt: new Date("NaN"),
  }, now, "online"), "Unknown");
});

test("revocation reasons remain safe and readable", () => {
  assert.equal(recordedDeviceSignOutReason("web_logout"), "Signed out from web");
  assert.equal(recordedDeviceSignOutReason("password_reset"), "Password reset");
  assert.equal(recordedDeviceSignOutReason("sign_out_everywhere"), "Signed out everywhere");
  assert.equal(recordedDeviceSignOutReason("account_suspended"), "Account suspended");
  assert.equal(recordedDeviceSignOutReason("unrecognized_private_code"), "Other security action");
  assert.equal(recordedDeviceSignOutReason(null), null);
});
