import assert from "node:assert/strict";
import test from "node:test";
import { summarizeAccountStatusRows, summarizeAuditEvents } from "./adminOverviewMetrics";

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
