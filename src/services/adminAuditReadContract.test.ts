import assert from "node:assert/strict";
import test from "node:test";
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
