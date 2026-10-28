import assert from "node:assert/strict";
import test from "node:test";
import {
  encodeAdminOperationalCursor,
  parseAdminDeletionQuery,
  parseAdminHandoffQuery,
  parseAdminSearchQuery,
  parseAdminSupportQuery,
} from "./adminOperationalReadContract";

test("search cursor is bound to its original filters", () => {
  const first = parseAdminSearchQuery(new URLSearchParams("product=FLIGHT&identity=guest&provider=Duffel"), "staging");
  assert.equal(first.status, "ok");
  if (first.status !== "ok") return;
  const cursor = encodeAdminOperationalCursor("searches", first.data.scope, { at: "2026-10-22T10:00:00.000Z", id: "search_123" });
  const same = parseAdminSearchQuery(new URLSearchParams(`product=FLIGHT&identity=guest&provider=Duffel&cursor=${cursor}`), "staging");
  assert.equal(same.status, "ok");
  const changed = parseAdminSearchQuery(new URLSearchParams(`product=HOTEL&identity=guest&provider=Duffel&cursor=${cursor}`), "staging");
  assert.equal(changed.status, "invalid");
});

test("operational query validation rejects repeated, unknown and contradictory filters", () => {
  assert.equal(parseAdminSupportQuery(new URLSearchParams("status=OPEN&status=CLOSED")).status, "invalid");
  assert.equal(parseAdminDeletionQuery(new URLSearchParams("wat=1")).status, "invalid");
  assert.equal(parseAdminSearchQuery(new URLSearchParams("identity=guest&userId=user_123"), "staging").status, "invalid");
  assert.equal(parseAdminHandoffQuery(new URLSearchParams("identity=unattributed&visitorId=visitor_123"), "staging").status, "invalid");
});

test("environment defaults and explicit date bounds are normalized", () => {
  const search = parseAdminSearchQuery(new URLSearchParams("from=2026-10-01T00:00:00%2B01:00&to=2026-10-02T00:00:00Z"), "staging");
  assert.equal(search.status, "ok");
  if (search.status === "ok") {
    assert.equal(search.data.scope.environment, "staging");
    assert.equal(search.data.scope.from, "2026-09-30T23:00:00.000Z");
  }
  assert.equal(parseAdminHandoffQuery(new URLSearchParams("environment=production"), "staging").status, "ok");
  assert.equal(parseAdminSupportQuery(new URLSearchParams("from=2026-10-03T00:00:00Z&to=2026-10-02T00:00:00Z")).status, "invalid");
});
