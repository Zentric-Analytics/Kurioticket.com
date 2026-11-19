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

test("platform incidents cover all existing sources except already counted queues", () => {
  const snapshot = summarizePlatformIncidents([
    { source: "SYSTEM", severity: "CRITICAL" },
    { source: "SEARCH", severity: "WARNING" },
    { source: "EMAIL", severity: "WARNING" },
    { source: "CMS", severity: "WARNING" },
    { source: "HOMEPAGE_FARES", severity: "CRITICAL" },
    { source: "CONFIRMED_TRIPS", severity: "WARNING" },
    { source: "FLIGHT_STATUS", severity: "WARNING" },
    { source: "USERS", severity: "WARNING" },
    { source: "PROVIDER", severity: "CRITICAL" },
    { source: "SUPPORT", severity: "WARNING" },
  ]);
  assert.deepEqual(snapshot, { total: 8, critical: 2, warning: 6 });
});

test("platform incidents count active acknowledged records, not just unread", () => {
  const result = summarizePlatformIncidents([
    { source: "SEARCH", severity: "CRITICAL", acknowledged: true },
    { source: "SEARCH", severity: "WARNING", acknowledged: false },
  ]);
  assert.deepEqual(result, { total: 2, critical: 1, warning: 1 });
});
