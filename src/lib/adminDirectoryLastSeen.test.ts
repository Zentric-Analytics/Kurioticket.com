import assert from "node:assert/strict";
import test from "node:test";
import { combineRegisteredLastSeen } from "./adminDirectoryLastSeen";

test("newest recorded observation wins across sessions, searches, handoffs and analytics", () => {
  const result = combineRegisteredLastSeen(
    [{ userId: "account-1", lastSeenAt: new Date("2026-11-20T08:00:00Z") }],
    [{ userId: "account-1", lastSeenAt: new Date("2026-11-20T10:00:00Z") },
      { userId: "account-2", lastSeenAt: new Date("2026-11-20T09:00:00Z") }],
    [{ userId: "account-1", lastSeenAt: new Date("2026-11-20T09:30:00Z") }],
    [{ userId: "account-2", lastSeenAt: new Date("2026-11-20T11:00:00Z") }],
  );
  assert.equal(result.get("account-1")?.toISOString(), "2026-11-20T10:00:00.000Z");
  assert.equal(result.get("account-2")?.toISOString(), "2026-11-20T11:00:00.000Z");
  assert.equal(result.size, 2);
});

test("unknown or missing observations never imply a recorded last seen", () => {
  const result = combineRegisteredLastSeen(
    [{ userId: null, lastSeenAt: new Date("2026-11-20T10:00:00Z") }],
    [{ userId: "account-1", lastSeenAt: null }],
    [{ userId: "account-2", lastSeenAt: new Date(Number.NaN) }],
  );
  assert.equal(result.size, 0);
});
