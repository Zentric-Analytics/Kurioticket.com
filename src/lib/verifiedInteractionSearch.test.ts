import assert from "node:assert/strict";
import test from "node:test";
import { matchesInteractionSearch } from "./verifiedInteractionSearch";

const now = new Date("2026-11-20T12:15:00.000Z");
type SearchRecord = NonNullable<Parameters<typeof matchesInteractionSearch>[0]>;
type Actor = Parameters<typeof matchesInteractionSearch>[1];
const actor: Actor = { visitorId: "visitor-a", userId: "account-a" };
const search: SearchRecord = {
  visitorId: "visitor-a", userId: "account-a", type: "FLIGHT",
  query: { environment: "staging" }, createdAt: new Date("2026-11-20T12:10:00.000Z"),
};
const valid = (record: SearchRecord | null, identity: Actor = actor, product = "FLIGHT", environment: "staging" | "production" = "staging") =>
  matchesInteractionSearch(record, identity, product, environment, now);

test("exact, recent, same-environment search for the same consenting visitor is eligible", () => {
  assert.equal(valid(search), true);
  assert.equal(valid({ ...search, userId: null }), true);
});

test("no identity, different visitor, and different registered account cannot correlate", () => {
  assert.equal(valid(null), false);
  assert.equal(valid({ ...search, visitorId: "visitor-b" }), false);
  assert.equal(valid({ ...search, userId: "account-b" }), false);
  assert.equal(valid(search, { visitorId: null, userId: null }), false);
  assert.equal(valid(search, { visitorId: "visitor-a", userId: null }), false);
});

test("other products or deployment environments never attach actions to a search", () => {
  assert.equal(valid(search, actor, "HOTEL"), false);
  assert.equal(valid({ ...search, query: { environment: "production" } }), false);
  assert.equal(valid(search, actor, "FLIGHT", "production"), false);
  assert.equal(valid({ ...search, query: null }), false);
  assert.equal(valid({ ...search, query: [] }), false);
});

test("stale and future search references cannot attach unrelated actions", () => {
  assert.equal(valid({ ...search, createdAt: new Date("2026-11-20T11:44:00.000Z") }), false);
  assert.equal(valid({ ...search, createdAt: new Date("2026-11-20T12:16:00.000Z") }), false);
  assert.equal(valid({ ...search, createdAt: new Date("2026-11-20T11:45:00.000Z") }), true);
});
