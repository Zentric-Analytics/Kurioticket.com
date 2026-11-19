import assert from "node:assert/strict";
import test from "node:test";
import { summarizeAttentionRequired, summarizePlatformIncidents } from "./adminAttentionRequired";

test("provider health failures are separate from not-ready setup", () => {
  const result = summarizeAttentionRequired({
    providers: [
      { operationalState: "FAILING" },
      { operationalState: "DEGRADED" },
      { operationalState: "NOT_READY" },
      { operationalState: "NOT_READY" },
      { operationalState: "HEALTHY" },
      { operationalState: "NO_RECENT_ACTIVITY" },
    ],
    support: { open: 2, waitingOnTeam: 3, waitingOnUser: 7 },
    deletions: { pending: 8, readyForReview: 4 },
  });
  assert.deepEqual(result, {
    providerHealthIssues: 2,
    providerSetupIssues: 2,
    supportNeedsAction: 5,
    supportWaitingOnUser: 7,
    deletionReviews: 4,
    deletionPending: 8,
  });
});

test("zero actionable issues does not imply setup or waiting work is absent", () => {
  const result = summarizeAttentionRequired({
    providers: [{ operationalState: "NOT_READY" }],
    support: { open: 0, waitingOnTeam: 0, waitingOnUser: 1 },
    deletions: { pending: 3, readyForReview: 0 },
  });
  assert.equal(result.providerHealthIssues, 0);
  assert.equal(result.providerSetupIssues, 1);
  assert.equal(result.supportNeedsAction, 0);
  assert.equal(result.deletionReviews, 0);
});

test("platform incidents cover sources without duplicating provider health and urgent support", () => {
  const snapshot = summarizePlatformIncidents([
    { key: "system.database.unavailable", source: "SYSTEM", severity: "CRITICAL" },
    { key: "expanded.staging.search.FLIGHT", source: "SEARCH", severity: "WARNING" },
    { key: "email.delivery.degraded", source: "EMAIL", severity: "WARNING" },
    { key: "cms.integrity.unhealthy", source: "CMS", severity: "WARNING" },
    { key: "homepage-fares.readiness", source: "HOMEPAGE_FARES", severity: "CRITICAL" },
    { key: "confirmed-trips.deliveries.rejected", source: "CONFIRMED_TRIPS", severity: "WARNING" },
    { key: "flight-status.stale", source: "FLIGHT_STATUS", severity: "WARNING" },
    { key: "expanded.staging.users.admin-mfa-disabled", source: "USERS", severity: "WARNING" },
    { key: "provider.duffel.operational", source: "PROVIDER", severity: "CRITICAL" },
    { key: "expanded.staging.support.OPEN", source: "SUPPORT", severity: "WARNING" },
    // Monitoring gaps still need action, despite sharing a queue's source.
    { key: "providers.telemetry.unavailable", source: "PROVIDER", severity: "WARNING" },
    { key: "expanded.staging.support.telemetry", source: "SUPPORT", severity: "WARNING" },
  ]);
  assert.deepEqual(snapshot, { total: 10, critical: 2, warning: 8 });
});

test("acknowledged but active incidents count independent of unread status", () => {
  const alerts: Array<{ key: string; source: string; severity: "CRITICAL" | "WARNING"; acknowledged: boolean }> = [
    { key: "expanded.staging.search.FLIGHT", source: "SEARCH", severity: "CRITICAL", acknowledged: true },
    { key: "email.delivery.degraded", source: "EMAIL", severity: "WARNING", acknowledged: false },
  ];
  assert.deepEqual(summarizePlatformIncidents(alerts), { total: 2, critical: 1, warning: 1 });
});
