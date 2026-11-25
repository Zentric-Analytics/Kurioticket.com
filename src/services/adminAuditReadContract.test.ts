import assert from "node:assert/strict";
import test from "node:test";
import { adminCustomDateRange } from "@/lib/adminReportingRanges";
import {
  encodeAdminAuditCursor,
  parseAdminAuditQuery,
} from "./adminAuditReadContract";

const now = new Date("2026-10-22T14:00:00Z");

test("audit queries default to seven days and reject unsafe ranges", () => {
  const parsed = parseAdminAuditQuery(new URLSearchParams(), now);
  assert.equal(parsed.status, "ok");
  if (parsed.status === "ok") {
    assert.equal(parsed.data.scope.to, now.toISOString());
    assert.equal(parsed.data.scope.from, "2026-10-15T14:00:00.000Z");
  }
  assert.equal(
    parseAdminAuditQuery(new URLSearchParams("from=2026-01-01T00:00:00Z"), now).status,
    "invalid",
  );
});

test("audit cursors are bound to filters", () => {
  const first = parseAdminAuditQuery(new URLSearchParams("action=USER"), now);
  assert.equal(first.status, "ok");
  if (first.status !== "ok") return;
  const cursor = encodeAdminAuditCursor(first.data.scope, "2026-10-20T12:00:00.000Z", "audit_123");
  assert.equal(parseAdminAuditQuery(new URLSearchParams(`action=USER&cursor=${cursor}`), now).status, "ok");
  assert.equal(parseAdminAuditQuery(new URLSearchParams(`action=OTHER&cursor=${cursor}`), now).status, "invalid");
});

test("a validated 90-date Audit Logs window includes the fall-back hour without widening API time limits", () => {
  const now = new Date("2026-11-06T15:00:00Z");
  const scope = adminCustomDateRange("2026-08-07", "2026-11-04", now, "America/New_York");
  assert.ok(scope);
  assert.equal(scope.from.toISOString(), "2026-08-07T04:00:00.000Z");
  assert.equal(scope.to.toISOString(), "2026-11-05T05:00:00.000Z");
  const params = new URLSearchParams({ from: scope.from.toISOString(), to: scope.to.toISOString() });
  assert.equal(parseAdminAuditQuery(params, now).status, "invalid");
  assert.equal(parseAdminAuditQuery(params, now, scope).status, "ok");
  params.set("to", "2026-11-05T05:00:00.001Z");
  assert.equal(parseAdminAuditQuery(params, now, scope).status, "invalid");
});

test("audit queries reject repeated and unknown parameters", () => {
  assert.equal(parseAdminAuditQuery(new URLSearchParams("action=A&action=B"), now).status, "invalid");
  assert.equal(parseAdminAuditQuery(new URLSearchParams("metadata=secret"), now).status, "invalid");
});

test("audit pagination preserves the original default time window", () => {
  const firstNow = new Date("2026-10-22T14:00:00Z");
  const first = parseAdminAuditQuery(new URLSearchParams(), firstNow);
  assert.equal(first.status, "ok");
  if (first.status !== "ok") return;

  const cursor = encodeAdminAuditCursor(
    first.data.scope,
    "2026-10-22T13:00:00.000Z",
    "audit_456",
  );

  const later = parseAdminAuditQuery(
    new URLSearchParams(`cursor=${cursor}`),
    new Date("2026-10-22T14:10:00Z"),
  );
  assert.equal(later.status, "ok");
  if (later.status === "ok") {
    assert.deepEqual(later.data.scope, first.data.scope);
  }
});

test("Audit Logs all-time cursor includes the entire retained window without loosening ordinary range guards", () => {
  const first = parseAdminAuditQuery(new URLSearchParams({
    from: "1970-01-01T00:00:00.000Z", to: now.toISOString(),
    action: "USER",
  }), now);
  assert.equal(first.status, "ok");
  if (first.status !== "ok") return;
  assert.equal(first.data.scope.from, "1970-01-01T00:00:00.000Z");
  assert.equal(first.data.limit, 50);
  const cursor = encodeAdminAuditCursor(first.data.scope, "2026-10-20T12:00:00.000Z", "audit_789");
  assert.equal(parseAdminAuditQuery(new URLSearchParams({ cursor, action: "USER" }), now).status, "ok");
  assert.equal(parseAdminAuditQuery(new URLSearchParams({ cursor, action: "PROVIDER" }), now).status, "invalid");
  assert.equal(parseAdminAuditQuery(new URLSearchParams({
    from: "2026-01-01T00:00:00.000Z", to: now.toISOString(),
  }), now).status, "invalid");
  assert.equal(parseAdminAuditQuery(new URLSearchParams({
    from: "1970-01-01T00:00:00.000Z", to: new Date(now.getTime() + 1).toISOString(),
  }), now).status, "invalid");
  assert.equal(parseAdminAuditQuery(new URLSearchParams({
    from: "1970-01-01T00:00:00.000Z", to: now.toISOString(), limit: "101",
  }), now).status, "invalid");
});

test("unified audit email is validated and scoped to pagination without changing legacy field filters", () => {
  const unified = parseAdminAuditQuery(new URLSearchParams("searchEmail=contact%40example.invalid"), now);
  assert.equal(unified.status, "ok");
  if (unified.status !== "ok") return;
  assert.equal(unified.data.scope.searchEmail, "contact@example.invalid");
  assert.equal(unified.data.scope.adminEmail, null);
  assert.equal(unified.data.scope.targetEmail, null);

  const cursor = encodeAdminAuditCursor(unified.data.scope, "2026-10-20T12:00:00.000Z", "audit_789");
  assert.equal(parseAdminAuditQuery(new URLSearchParams({ cursor, searchEmail: "contact@example.invalid" }), now).status, "ok");
  assert.equal(parseAdminAuditQuery(new URLSearchParams({ cursor, searchEmail: "another@example.invalid" }), now).status, "invalid");
  assert.equal(parseAdminAuditQuery(new URLSearchParams("searchEmail=a&searchEmail=b"), now).status, "invalid");
  assert.equal(parseAdminAuditQuery(new URLSearchParams({ searchEmail: "x".repeat(321) }), now).status, "invalid");

  const legacy = parseAdminAuditQuery(new URLSearchParams({
    adminEmail: "operator@example.invalid", targetEmail: "traveler@example.invalid",
  }), now);
  assert.equal(legacy.status, "ok");
  if (legacy.status === "ok") {
    assert.equal(legacy.data.scope.adminEmail, "operator@example.invalid");
    assert.equal(legacy.data.scope.targetEmail, "traveler@example.invalid");
    assert.equal(legacy.data.scope.searchEmail, null);
  }
});
