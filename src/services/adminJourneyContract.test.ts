import assert from "node:assert/strict";
import test from "node:test";
import { encodeAdminJourneyCursor, parseAdminJourneyQuery, type AdminJourneyScope } from "./adminJourneyContract";

const now = new Date("2026-10-22T12:00:00.000Z");
const scope: AdminJourneyScope = { from: "2026-10-15T12:00:00.000Z", to: now.toISOString(), environment: "staging", identity: "all" };
const cursor = (changes = {}) => encodeAdminJourneyCursor({ version: 1, kind: "list", at: "2026-10-20T10:00:00.000Z", id: "journey-002", scope, ...changes });

test("admin journey defaults are a seven-day UTC window in the current environment", () => {
  const result = parseAdminJourneyQuery({}, "list", now, "staging");
  assert.deepEqual(result, { status: "ok", data: { scope, limit: 25, cursor: null } });
  const production = parseAdminJourneyQuery({}, "detail", now, "production", "journey-001");
  assert.equal(production.status, "ok");
  if (production.status === "ok") {
    assert.equal(production.data.scope.environment, "production");
    assert.equal(production.data.limit, 50);
  }
});

test("valid admin journey filters normalize explicit timezone offsets to UTC", () => {
  const result = parseAdminJourneyQuery(new URLSearchParams({
    from: "2026-10-21T14:00:00+02:00", to: "2026-10-22T14:00:00+02:00", environment: "production",
    identity: "registered", userId: "account-001", visitorId: "visitor-001", product: "FLIGHT", provider: "Example Air",
    stage: "OFFER_SELECTED", limit: "100",
  }), "list", now, "staging");
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.equal(result.data.scope.from, "2026-10-21T12:00:00.000Z");
    assert.equal(result.data.scope.to, now.toISOString());
    assert.equal(result.data.scope.userId, "account-001");
    assert.equal(result.data.scope.provider, "Example Air");
    assert.equal(result.data.limit, 100);
  }
});

test("admin filters reject unknown, repeated, malformed and unbounded input", () => {
  const invalid = [
    { rawQuery: "secret" }, { environment: "all" }, { identity: "anonymous" }, { product: "TRAIN" }, { stage: "BOOKED" },
    { visitorId: "x" }, { userId: "../../account" }, { provider: "" }, { provider: " padded " }, { provider: "a\nb" }, { provider: "x".repeat(101) },
    { limit: "0" }, { limit: "101" }, { limit: "-1" }, { limit: "1.5" }, { limit: "1e2" }, { limit: "01" }, { limit: 50 }, { product: ["FLIGHT", "HOTEL"] },
    { from: "2026-10-01" }, { from: "invalid" }, { from: "2026-07-01T00:00:00Z" }, { to: "2026-10-23T00:00:00Z" },
    { from: now.toISOString(), to: now.toISOString() }, { from: "2026-10-22T11:00:00Z", to: "2026-10-22T10:00:00Z" },
    { cursor: "!not-base64" }, { cursor: "eA" }, { cursor: "x".repeat(2049) },
  ];
  for (const input of invalid) assert.equal(parseAdminJourneyQuery(input, "list", now, "staging").status, "invalid", JSON.stringify(input));
  assert.equal(parseAdminJourneyQuery(new URLSearchParams("product=FLIGHT&product=HOTEL"), "list", now, "staging").status, "invalid");
});

test("pagination retains the original window and filters when the clock advances", () => {
  const filteredScope = { ...scope, identity: "registered" as const, userId: "account-001", provider: "Example Air", product: "FLIGHT" as const };
  const value = cursor({ scope: filteredScope });
  const result = parseAdminJourneyQuery({ cursor: value, limit: "10" }, "list", new Date("2026-10-23T12:00:00Z"), "production");
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.deepEqual(result.data.scope, filteredScope);
    assert.equal(result.data.limit, 10);
    assert.equal(result.data.cursor?.id, "journey-002");
  }
});

test("a cursor cannot silently change a date, environment or cohort filter", () => {
  const value = cursor({ scope: { ...scope, provider: "Example Air" } });
  for (const input of [
    { environment: "production" }, { provider: "Other Air" }, { identity: "guest" }, { product: "HOTEL" },
    { from: "2026-10-16T12:00:00Z" }, { to: "2026-10-21T12:00:00Z" }, { userId: "account-002" },
  ]) assert.equal(parseAdminJourneyQuery({ cursor: value, ...input }, "list", now, "staging").status, "invalid");
});

test("cursor positions must remain inside a bounded time window and the same detail route", () => {
  const detailCursor = cursor({ kind: "detail", journeyId: "journey-001" });
  assert.equal(parseAdminJourneyQuery({ cursor: detailCursor }, "detail", now, "staging", "journey-001").status, "ok");
  assert.equal(parseAdminJourneyQuery({ cursor: detailCursor }, "detail", now, "staging", "journey-002").status, "invalid");
  assert.equal(parseAdminJourneyQuery({ cursor: detailCursor }, "list", now, "staging").status, "invalid");
  assert.equal(parseAdminJourneyQuery({ cursor: cursor() }, "detail", now, "staging", "journey-001").status, "invalid");
  for (const value of [cursor({ at: scope.to }), cursor({ at: "2026-10-01T00:00:00Z" }), cursor({ scope: { ...scope, from: "2020-01-01T00:00:00Z" } })]) {
    assert.equal(parseAdminJourneyQuery({ cursor: value }, "list", now, "staging").status, "invalid");
  }
});

test("guest/account contradictions and unsupported summary/detail inputs are rejected", () => {
  assert.equal(parseAdminJourneyQuery({ identity: "guest", userId: "account-001" }, "list", now, "staging").status, "invalid");
  assert.equal(parseAdminJourneyQuery({}, "detail", now, "staging", "../../private").status, "invalid");
  assert.equal(parseAdminJourneyQuery({ limit: "10" }, "summary", now, "staging").status, "invalid");
  assert.equal(parseAdminJourneyQuery({ cursor: cursor() }, "summary", now, "staging").status, "invalid");
});
