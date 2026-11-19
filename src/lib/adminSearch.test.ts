import assert from "node:assert/strict";
import test from "node:test";
import { adminSearchHistoryWhere, matchesAdminProvider, normalizeAdminSearch } from "./adminSearch";

test("admin search normalizes empty, repeated, and oversized query parameters", () => {
  assert.equal(normalizeAdminSearch(undefined), "");
  assert.equal(normalizeAdminSearch(["  Lagos  ", "ignored"]), "Lagos");
  assert.equal(normalizeAdminSearch("x".repeat(200)).length, 120);
  assert.deepEqual(adminSearchHistoryWhere(""), {});
});

test("log search supports route text, exact result links, product aliases and valid statuses", () => {
  const where = adminSearchHistoryWhere("flights");
  assert.ok(where.OR?.some((filter) => filter.type === "FLIGHT"));
  assert.ok(adminSearchHistoryWhere("partial").OR?.some((filter) => filter.status === "PARTIAL"));
  assert.ok(adminSearchHistoryWhere("log-id").OR?.some((filter) => filter.id === "log-id"));
  assert.ok(adminSearchHistoryWhere("Lagos").OR?.some((filter) => JSON.stringify(filter).includes('"contains":"Lagos"')));
  assert.ok(adminSearchHistoryWhere("Duffel").OR?.some((filter) => JSON.stringify(filter).includes('"path":["provider"]')));
});

test("provider matching is case insensitive across name, product and environment", () => {
  const provider = { product: "Flights", providerName: "Duffel", environment: "Test mode" };
  for (const query of ["DUFFEL", "flight", "test", ""]) assert.equal(matchesAdminProvider(provider, query), true);
  assert.equal(matchesAdminProvider(provider, "hotel"), false);
});
