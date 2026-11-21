import assert from "node:assert/strict";
import test from "node:test";
import { hasVerifiedPlatformCounts, type OnlinePresenceSnapshot } from "./onlinePresence";

const base: OnlinePresenceSnapshot = {
  status: "ok", total: 7, registeredAccounts: 3, guestSessions: 4,
  observedAt: "2026-11-21T08:00:00.000Z", windowSeconds: 90,
  platforms: { ios: 4, android: 2, mobile_web: 3, desktop_web: 1, unclassified: 0 },
};

test("Platform counts may exceed the total when one account uses multiple devices", () => {
  assert.equal(hasVerifiedPlatformCounts(base), true);
  assert.equal(Object.values(base.status === "ok" ? base.platforms! : {}).reduce((a, b) => a + b, 0), 10);
});

test("Missing data, invalid totals and fabricated zeroes do not qualify as verified", () => {
  assert.equal(hasVerifiedPlatformCounts({ ...base, platforms: undefined }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, total: 0 }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, guestSessions: -1 }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, platforms: { ...base.platforms!, ios: 9 } }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, platforms: { ...base.platforms!, ios: Number.NaN } }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, platforms: { ...base.platforms!, android: 0, mobile_web: 0, desktop_web: 0 } }), false);
  assert.equal(hasVerifiedPlatformCounts({ status: "unavailable", windowSeconds: 90, observedAt: base.observedAt }), false);
  assert.equal(hasVerifiedPlatformCounts({ status: "not_configured", windowSeconds: 90, observedAt: base.observedAt }), false);
});

test("A complete zero snapshot is valid only when every platform is verified zero", () => {
  assert.equal(hasVerifiedPlatformCounts({
    status: "ok", total: 0, registeredAccounts: 0, guestSessions: 0,
    observedAt: base.observedAt, windowSeconds: 90,
    platforms: { ios: 0, android: 0, mobile_web: 0, desktop_web: 0, unclassified: 0 },
  }), true);
});
