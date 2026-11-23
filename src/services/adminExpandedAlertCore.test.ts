import assert from "node:assert/strict";
import test from "node:test";
import { deriveExpandedAdminAlerts, type ExpandedAlertSnapshot } from "./adminExpandedAlertCore";

const now = new Date("2026-11-04T14:00:00.000Z");
const at = "2026-11-04T13:59:00.000Z";
function snapshot(): ExpandedAlertSnapshot {
  return {
    environment: "staging",
    searches: ["FLIGHT", "HOTEL", "CAR"].map(product => ({ product: product as "FLIGHT" | "HOTEL" | "CAR", enabled: true,
      previous: { total: 20, failed: 0, latestFailureAt: null }, current: { total: 20, failed: 0, latestFailureAt: null } })),
    support: { OPEN: { count: 0, latestAt: null }, WAITING_ON_TEAM: { count: 0, latestAt: null } },
    users: { count: 0, latestAt: null },
  };
}
function failSearch(s: ExpandedAlertSnapshot, total = 20, failed = 5) {
  s.searches![0].previous = { total, failed, latestFailureAt: "2026-11-04T13:40:00.000Z" };
  s.searches![0].current = { total, failed, latestFailureAt: at };
}

test("healthy recorded signals produce no operational alerts", () => {
  const result = deriveExpandedAdminAlerts(snapshot(), true, now);
  assert.equal(result.candidates.length, 0);
  assert.ok(Object.values(result.states).every(value => value === false));
});
test("one aggregate search warning requires sustained volume and failure rate in both windows", () => {
  const s = snapshot(); failSearch(s);
  const result = deriveExpandedAdminAlerts(s, true, now);
  assert.equal(result.candidates.length, 1);
  const alert = result.candidates[0];
  assert.equal(alert.source, "SEARCH"); assert.equal(alert.severity, "WARNING");
  assert.equal(alert.key, "expanded.staging.search.FLIGHT");
  const url = new URL(alert.actionHref, "https://example.test");
  assert.equal(url.pathname, "/admin/searches/activity");
  assert.equal(url.searchParams.get("status"), "FAILED");
  assert.equal(url.searchParams.get("product"), "FLIGHT");
  assert.equal(url.searchParams.get("environment"), "staging");
  assert.ok(result.states[alert.key]);
});
test("low volume, isolated failures and success with no offers do not generate incidents", () => {
  for (const [total, failed] of [[19, 19], [20, 4], [100, 5], [20, 0]]) {
    const s = snapshot(); failSearch(s, total, failed);
    assert.equal(deriveExpandedAdminAlerts(s, true, now).candidates.length, 0);
  }
  const s = snapshot(); failSearch(s); s.searches![0].previous.failed = 0; s.searches![0].previous.latestFailureAt = null;
  assert.equal(deriveExpandedAdminAlerts(s, true, now).candidates.length, 0);
});
test("intentionally disabled search products do not alert", () => {
  const s = snapshot(); failSearch(s, 20, 20); s.searches![0].enabled = false;
  assert.equal(deriveExpandedAdminAlerts(s, true, now).candidates.length, 0);
});
test("severe sustained failures are critical but current-window escalation alone is not", () => {
  const s = snapshot(); failSearch(s, 20, 15);
  assert.equal(deriveExpandedAdminAlerts(s, true, now).candidates[0].severity, "CRITICAL");
  s.searches![0].previous.failed = 5;
  assert.equal(deriveExpandedAdminAlerts(s, true, now).candidates[0].severity, "WARNING");
});
test("urgent tickets group by actionable status and link to a matching filtered inbox", () => {
  const s = snapshot(); s.support!.WAITING_ON_TEAM = { count: 3, latestAt: at };
  const alerts = deriveExpandedAdminAlerts(s, true, now).candidates;
  assert.equal(alerts.length, 1); assert.equal(alerts[0].source, "SUPPORT");
  assert.equal(alerts[0].actionHref, "/admin/support?priority=URGENT&status=WAITING_ON_TEAM");
  assert.match(alerts[0].message, /3/); assert.doesNotMatch(alerts[0].message, /SLA|overdue/i);
});
test("explicitly disabled administrator MFA produces a security review, not an attack claim", () => {
  const s = snapshot(); s.users = { count: 2, latestAt: at };
  const alerts = deriveExpandedAdminAlerts(s, true, now).candidates;
  assert.equal(alerts.length, 1); assert.equal(alerts[0].source, "USERS");
  assert.equal(alerts[0].actionHref, "/admin/users?role=ADMIN&status=ACTIVE");
  assert.match(alerts[0].title, /two-factor/i);
  assert.doesNotMatch(JSON.stringify(alerts), /compromised|attack|password|tokenHash|email@/i);
});
test("missing source telemetry is not zero and does not hide other verified issues", () => {
  const s = snapshot(); s.searches = null; s.support!.OPEN = { count: 1, latestAt: at };
  const result = deriveExpandedAdminAlerts(s, true, now);
  assert.equal(result.candidates.length, 2);
  assert.ok(result.candidates.some(alert => alert.key === "expanded.staging.search.telemetry"));
  assert.equal(result.states["expanded.staging.search.FLIGHT"], undefined, "unknown telemetry is not a recovery");
  assert.equal(result.states["expanded.staging.support.OPEN"], true);
});
test("invalid counts or timestamps fail closed to source-unavailable warnings", () => {
  for (const count of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    const s = snapshot(); s.users = { count, latestAt: at };
    assert.equal(deriveExpandedAdminAlerts(s, true, now).candidates[0].key, "expanded.staging.users.telemetry");
  }
  const s = snapshot(); failSearch(s, 20, 21);
  assert.equal(deriveExpandedAdminAlerts(s, true, now).candidates[0].key, "expanded.staging.search.telemetry");
  const future = snapshot(); future.users = { count: 1, latestAt: "2027-01-01T00:00:00Z" };
  assert.equal(deriveExpandedAdminAlerts(future, true, now).candidates[0].key, "expanded.staging.users.telemetry");
});
test("database outage suppresses dependent incident noise and does not mark recovery", () => {
  const s = snapshot(); failSearch(s); s.support = null; s.users = null;
  assert.deepEqual(deriveExpandedAdminAlerts(s, false, now), { candidates: [], states: {} });
});
test("condition keys stay stable as counts change, and recovery has an explicit false state", () => {
  const s = snapshot(); failSearch(s);
  const a = deriveExpandedAdminAlerts(s, true, now);
  failSearch(s, 40, 15);
  const b = deriveExpandedAdminAlerts(s, true, now);
  assert.equal(a.candidates[0].key, b.candidates[0].key);
  assert.equal(a.candidates[0].signalToken, b.candidates[0].signalToken);
  const recovered = deriveExpandedAdminAlerts(snapshot(), true, now);
  assert.equal(recovered.states[a.candidates[0].key], false);
});
test("keys and search investigation scope separate staging from production", () => {
  const s = snapshot(); failSearch(s); s.environment = "production";
  const alert = deriveExpandedAdminAlerts(s, true, now).candidates[0];
  assert.equal(alert.key, "expanded.production.search.FLIGHT");
  assert.match(alert.actionHref, /environment=production/);
});
