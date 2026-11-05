import assert from "node:assert/strict";
import test from "node:test";
import {
  adminNotificationSourceLabel,
  readAdminNotificationSnapshot,
  readAdminNotificationSummary,
} from "@/lib/adminNotificationData";

function fixture(count = 8) {
  return {
    activeCount: count, unreadCount: count, criticalCount: 0, warningCount: count,
    alerts: Array.from({ length: count }, (_, index) => ({
      id: "alert-" + index, key: "qa." + index, signalToken: "signal-" + index,
      title: "QA notification " + index, message: "Synthetic operational alert.",
      source: "SUPPORT", severity: "WARNING", acknowledged: false,
      signalAt: "2026-11-05T12:00:00.000Z", actionHref: "/admin/support",
      privateExtra: "must not be forwarded",
    })),
  };
}

test("the panel retains the complete list, including more than 99 alerts", () => {
  const result = readAdminNotificationSnapshot(fixture(105));
  assert.equal(result.alerts.length, 105);
  assert.equal(result.alerts[104].id, "alert-104");
  assert.equal(result.unreadCount, 105);
  assert.equal("privateExtra" in result.alerts[0], false);
});

test("only valid, consistent counts can replace a last known badge", () => {
  assert.deepEqual(readAdminNotificationSummary(fixture(0)), {
    activeCount: 0, unreadCount: 0, criticalCount: 0, warningCount: 0,
  });
  for (const invalid of [null, [], {}, { unreadCount: 0 }, { ...fixture(), unreadCount: -1 },
    { ...fixture(), unreadCount: 9 }, { ...fixture(), activeCount: 1.5 },
    { ...fixture(), criticalCount: 2 }, { ...fixture(), warningCount: NaN }]) {
    assert.throws(() => readAdminNotificationSummary(invalid));
  }
});

test("partial, invalid or inconsistent lists never masquerade as healthy", () => {
  const partial = fixture();
  partial.alerts.pop();
  assert.throws(() => readAdminNotificationSnapshot(partial));
  const acknowledged = fixture();
  acknowledged.alerts[0].acknowledged = true;
  assert.throws(() => readAdminNotificationSnapshot(acknowledged));
  acknowledged.unreadCount--;
  assert.equal(readAdminNotificationSnapshot(acknowledged).alerts[0].acknowledged, true);
  const badSeverity = fixture();
  badSeverity.alerts[0].severity = "UNKNOWN";
  assert.throws(() => readAdminNotificationSnapshot(badSeverity));
});

test("source links stay inside admin diagnostics and timestamps are never invented", () => {
  const raw = fixture(4);
  raw.alerts[0].actionHref = "https://example.com";
  raw.alerts[1].actionHref = "/admin/notifications";
  raw.alerts[2].actionHref = "//example.com/admin/support";
  raw.alerts[3].actionHref = "/admin/support?priority=URGENT";
  raw.alerts[0].signalAt = "invalid";
  const result = readAdminNotificationSnapshot(raw);
  assert.deepEqual(result.alerts.map(alert => alert.actionHref), [null, null, null, "/admin/support?priority=URGENT"]);
  assert.equal(result.alerts[0].signalAt, null);
  assert.equal(result.alerts[1].signalAt, "2026-11-05T12:00:00.000Z");
  assert.equal(adminNotificationSourceLabel("HOMEPAGE_FARES"), "Homepage fares");
  assert.equal(adminNotificationSourceLabel("NEW_SOURCE"), "new source");
});
