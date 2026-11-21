import assert from "node:assert/strict";
import test from "node:test";
import { hasVerifiedPlatformCounts, type OnlinePresenceSnapshot } from "./onlinePresence";

const base: OnlinePresenceSnapshot = {
  status: "ok", total: 7, registeredAccounts: 3, guestSessions: 4,
  observedAt: "2026-11-21T08:00:00.000Z", windowSeconds: 90,
  platforms: { ios: 4, android: 2, mobile_web: 3, desktop_web: 1, website: 3, unclassified: 0 },
};

test("Platform counts may exceed the total when one account uses multiple devices", () => {
  assert.equal(hasVerifiedPlatformCounts(base), true);
  assert.equal(base.status === "ok" ? base.platforms?.website : undefined, 3);
  const platforms = base.status === "ok" ? base.platforms! : undefined;
  assert.ok(platforms);
  assert.equal(platforms.ios + platforms.android + platforms.mobile_web
    + platforms.desktop_web + platforms.unclassified, 10);
});

test("Missing data, invalid totals and fabricated zeroes do not qualify as verified", () => {
  assert.equal(hasVerifiedPlatformCounts({ ...base, platforms: undefined }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, total: 0 }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, guestSessions: -1 }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, platforms: { ...base.platforms!, ios: 9 } }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, platforms: { ...base.platforms!, ios: Number.NaN } }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, platforms: { ...base.platforms!, android: 0, mobile_web: 0, desktop_web: 0 } }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, platforms: { ...base.platforms!, website: -1 } }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, platforms: { ...base.platforms!, website: 0 } }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, platforms: { ...base.platforms!, website: 5 } }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, platforms: { ...base.platforms!, website: Number.NaN } }), false);
  assert.equal(hasVerifiedPlatformCounts({ ...base, platforms: { ...base.platforms!, website: undefined as never } }), false);
  assert.equal(hasVerifiedPlatformCounts({ status: "unavailable", windowSeconds: 90, observedAt: base.observedAt }), false);
  assert.equal(hasVerifiedPlatformCounts({ status: "not_configured", windowSeconds: 90, observedAt: base.observedAt }), false);
});

test("A complete zero snapshot is valid only when every platform is verified zero", () => {
  assert.equal(hasVerifiedPlatformCounts({
    status: "ok", total: 0, registeredAccounts: 0, guestSessions: 0,
    observedAt: base.observedAt, windowSeconds: 90,
    platforms: { ios: 0, android: 0, mobile_web: 0, desktop_web: 0, website: 0, unclassified: 0 },
  }), true);
});

test("Website online uses the distinct web union, not desktop and mobile sums", () => {
  const concurrent: OnlinePresenceSnapshot = {
    status: "ok", total: 3, registeredAccounts: 2, guestSessions: 1,
    observedAt: base.observedAt, windowSeconds: 90,
    platforms: { desktop_web: 2, mobile_web: 2, website: 3, ios: 0, android: 0, unclassified: 0 },
  };
  assert.equal(hasVerifiedPlatformCounts(concurrent), true);
  assert.equal(concurrent.status === "ok" ? concurrent.platforms?.website : undefined, 3);
  assert.notEqual(concurrent.status === "ok" ? concurrent.platforms?.website : undefined, 4);
});

test("Strict breakdowns require total coverage even when all individual values appear valid", () => {
  const invalid: OnlinePresenceSnapshot = {
    status: "ok", total: 5, registeredAccounts: 4, guestSessions: 1,
    observedAt: base.observedAt, windowSeconds: 90,
    platforms: { desktop_web: 2, mobile_web: 2, website: 2, ios: 1, android: 0, unclassified: 0 },
  };
  assert.equal(hasVerifiedPlatformCounts(invalid), false);
});
