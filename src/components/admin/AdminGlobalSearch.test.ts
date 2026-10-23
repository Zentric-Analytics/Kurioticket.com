import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/admin/AdminGlobalSearch.tsx", "utf8");

test("global admin search is full-page and keeps recent searches locally", () => {
  assert.match(source, /min-h-\[calc\(100vh-7rem\)\]/);
  assert.match(source, /kurioticket-admin-recent-searches-v1/);
  assert.match(source, /Clear recent searches/);
  assert.match(source, /window\.localStorage\.setItem/);
  assert.match(source, /window\.localStorage\.removeItem/);
});

test("global admin search reuses safe operational admin APIs", () => {
  for (const endpoint of [
    "/api/admin/support",
    "/api/admin/account-deletions",
    "/api/admin/searches",
    "/api/admin/provider-handoffs",
  ]) {
    assert.equal(source.includes(endpoint), true, endpoint);
  }
  assert.match(source, /getAdminNavForRole/);
  assert.match(source, /Search users and guests for/);
  assert.doesNotMatch(source, /raw query/i);
});

test("global admin search groups live records and debounces requests", () => {
  assert.match(source, /window\.setTimeout/);
  assert.match(source, /250/);
  for (const group of ["Users", "Support", "Account deletions", "Searches", "Provider handoffs"]) {
    assert.equal(source.includes(group), true, group);
  }
  assert.match(source, /Searching operational records/);
  assert.match(source, /No matching admin records/);
});
