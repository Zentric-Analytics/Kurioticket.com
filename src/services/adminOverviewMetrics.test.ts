import assert from "node:assert/strict";
import test from "node:test";
import { summarizeAccountStatusRows, summarizeAuditEvents, summarizeWorkflowStatusRows } from "./adminOverviewMetrics";

test("account lifecycle groups count each role and status without dropping deleted tombstones", () => {
  assert.deepEqual(summarizeAccountStatusRows([
    { status: "ACTIVE", role: "USER", _count: { _all: 11 } },
    { status: "ACTIVE", role: "ADMIN", _count: { _all: 4 } },
    { status: "ACTIVE", role: "SUPPORT", _count: { _all: 1 } },
    { status: "SUSPENDED", role: "USER", _count: { _all: 2 } },
    { status: "PENDING_DELETION", role: "USER", _count: { _all: 3 } },
    { status: "DELETED", role: "USER", _count: { _all: 1 } },
  ]), {
    total: 22, active: 16, activeCustomers: 11, activeAdmins: 4,
    activeSupport: 1, suspended: 2, pendingDeletion: 3, deleted: 1,
  });
});

test("zero counts come only from successful queries with empty groups", () => {
  assert.deepEqual(summarizeAccountStatusRows([]), {
    total: 0, active: 0, activeCustomers: 0, activeAdmins: 0,
    activeSupport: 0, suspended: 0, pendingDeletion: 0, deleted: 0,
  });
});

test("invalid or unknown lifecycle counts fail closed", () => {
  assert.throws(() => summarizeAccountStatusRows([{ status: "ACTIVE", role: "UNKNOWN", _count: { _all: 1 } }]));
  assert.throws(() => summarizeAccountStatusRows([{ status: "UNKNOWN", role: "USER", _count: { _all: 1 } }]));
  assert.throws(() => summarizeAccountStatusRows([{ status: "ACTIVE", role: "USER", _count: { _all: -1 } }]));
  assert.throws(() => summarizeAccountStatusRows([{ status: "ACTIVE", role: "USER", _count: { _all: NaN } }]));
});

test("human and automated audit counts reconcile", () => {
  assert.deepEqual(summarizeAuditEvents(28, 23), { total: 28, human: 23, automated: 5 });
  assert.deepEqual(summarizeAuditEvents(0, 0), { total: 0, human: 0, automated: 0 });
  assert.throws(() => summarizeAuditEvents(1, 2));
  assert.throws(() => summarizeAuditEvents(5, -1));
});

test("support and deletion status rows reconcile with current workflow counts", () => {
  const support = summarizeWorkflowStatusRows([
    { status: "OPEN", _count: { _all: 4 } },
    { status: "CLOSED", _count: { _all: 1 } },
    { status: "RESOLVED", _count: { _all: 1 } },
  ], ["OPEN", "WAITING_ON_USER", "WAITING_ON_TEAM", "RESOLVED", "CLOSED"] as const);
  assert.deepEqual(support, {
    OPEN: 4, WAITING_ON_USER: 0, WAITING_ON_TEAM: 0, RESOLVED: 1, CLOSED: 1,
  });
  const deletion = summarizeWorkflowStatusRows([
    { status: "CANCELLED", _count: { _all: 2 } },
  ], ["PENDING", "READY_FOR_REVIEW", "CANCELLED", "COMPLETED"] as const);
  assert.deepEqual(deletion, { PENDING: 0, READY_FOR_REVIEW: 0, CANCELLED: 2, COMPLETED: 0 });
  assert.deepEqual(summarizeWorkflowStatusRows([], ["OPEN", "CLOSED"] as const), { OPEN: 0, CLOSED: 0 });
});

test("workflow counts fail closed instead of silently discarding unknown or invalid rows", () => {
  const statuses = ["OPEN", "WAITING_ON_USER"] as const;
  for (const invalid of [
    [{ status: "UNKNOWN", _count: { _all: 5 } }],
    [{ status: "OPEN", _count: { _all: -1 } }],
    [{ status: "OPEN", _count: { _all: 1.25 } }],
    [{ status: "OPEN", _count: { _all: Number.NaN } }],
    [{ status: "OPEN", _count: { _all: Number.MAX_SAFE_INTEGER } },
      { status: "OPEN", _count: { _all: 1 } }],
  ]) {
    assert.throws(() => summarizeWorkflowStatusRows(invalid, statuses));
  }
  assert.throws(() => summarizeWorkflowStatusRows([], ["OPEN", "OPEN"] as const));
});
