import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminOnlineUsersSnapshot, type RawPresenceRow } from "./adminOnlineUsersSnapshot";

const now = new Date("2026-11-21T20:00:00.000Z");
function observation(
  sourceId: string, platform: string, atSecondsAgo: number,
  account: { id: string; role: string; name: string; email?: string } | null = null,
  linkedSession = Boolean(account),
): RawPresenceRow {
  return {
    sourceId, platform, accountSessionId: linkedSession ? "session-" + sourceId : null,
    userId: account?.id ?? null, name: account?.name ?? null, email: account?.email ?? null,
    role: account?.role ?? null, lastSeenAt: new Date(now.getTime() - atSecondsAgo * 1000),
  };
}

test("registered accounts count once across web, iOS, Android and admin devices", () => {
  const alice = { id: "u-alice", name: "Alice Example", role: "ADMIN", email: "alice@example.invalid" };
  const bob = { id: "u-bob", name: "Bob Example", role: "USER" };
  const snapshot = buildAdminOnlineUsersSnapshot([
    observation("alice-desktop", "desktop_web", 4, alice),
    observation("alice-ios", "ios", 5, alice),
    observation("alice-mobile", "mobile_web", 6, alice),
    observation("bob-android", "android", 12, bob),
    observation("guest-one", "desktop_web", 3),
    observation("guest-two", "mobile_web", 14),
  ], now);
  assert.equal(snapshot.total, 4);
  assert.equal(snapshot.registeredAccounts, 2);
  assert.equal(snapshot.guestSessions, 2);
  assert.deepEqual(snapshot.platforms, {
    desktop_web: 2, mobile_web: 2, ios: 1, android: 1, website: 3, unclassified: 0,
  });
  const account = snapshot.rows.find(r => r.id === "u-alice");
  assert.deepEqual(account?.platforms, ["desktop_web","ios","mobile_web"]);
  assert.equal(snapshot.rows.filter(row => row.id === "u-alice").length, 1);
});

test("expired heartbeat and unverifiable account sessions are never shown as online", () => {
  const user = { id: "u-real", name: "Real person", role: "USER" };
  const snapshot = buildAdminOnlineUsersSnapshot([
    observation("valid", "desktop_web", 89, user),
    observation("outdated", "ios", 91, user),
    observation("invalid-account", "ios", 1, null, true),
    observation("future", "android", -3),
    observation("exact-edge", "mobile_web", 90),
    observation("valid-guest", "android", 2),
  ], now);
  assert.equal(snapshot.total, 2);
  assert.equal(snapshot.registeredAccounts, 1);
  assert.equal(snapshot.guestSessions, 1);
  assert.equal(snapshot.platforms.ios, 0);
  assert.equal(snapshot.platforms.android, 1);
  assert.ok(snapshot.rows.every(row => row.name !== "invalid-account"));
});

test("anonymous source credentials cannot be exposed or mistaken for recorded visitors", () => {
  const snapshot = buildAdminOnlineUsersSnapshot([
    observation("private-hashed-session-1", "ios", 10),
    observation("private-hashed-session-1", "ios", 8),
    observation("private-hashed-session-2", "desktop_web", 9),
  ], now);
  assert.equal(snapshot.total, 2);
  assert.equal(snapshot.guestSessions, 2);
  assert.ok(snapshot.rows.every(row => row.kind === "guest" && row.name === "Guest session"
    && row.email === null && row.role === null && !row.id.includes("private-hashed-session")));
  assert.equal(JSON.stringify(snapshot).includes("private-hashed-session"), false);
});

test("per-platform totals preserve website union without double counting the same account", () => {
  const account = { id: "u-same", role: "SUPPORT", name: "Support Example" };
  const snapshot = buildAdminOnlineUsersSnapshot([
    observation("a", "desktop_web", 1, account),
    observation("b", "mobile_web", 2, account),
    observation("c", "desktop_web", 5, account),
    observation("unknown", "unidentified_platform", 4),
  ], now);
  assert.equal(snapshot.total, 2);
  assert.equal(snapshot.platforms.desktop_web, 1);
  assert.equal(snapshot.platforms.mobile_web, 1);
  assert.equal(snapshot.platforms.website, 1);
  assert.equal(snapshot.platforms.unclassified, 1);
  assert.equal(snapshot.rows[0].role, "SUPPORT");
});
