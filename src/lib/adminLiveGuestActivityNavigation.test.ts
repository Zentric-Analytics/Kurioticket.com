import assert from "node:assert/strict";
import test from "node:test";
import { recordedGuestActivityHref } from "./adminLiveGuestActivityNavigation";
import { parseActivityFilters } from "./adminIdentityActivity";

test("a verified guest keeps overview scope and directory context on its canonical route", () => {
  const href = recordedGuestActivityHref("qa-recorded-guest", false, {
    range: "all", q: "Lagos & Abuja", directory: "tab=guests&q=Guest", redirect: "https://other.invalid", cursor: "old-live-cursor",
  });
  assert.ok(href);
  const url = new URL(href, "https://admin.example.invalid");
  assert.equal(url.pathname, "/admin/users/guest/qa-recorded-guest/activity");
  assert.equal(url.searchParams.get("range"), "all");
  assert.equal(url.searchParams.get("q"), "Lagos & Abuja");
  assert.equal(url.searchParams.get("directory"), "tab=guests&q=Guest");
  assert.equal(url.searchParams.has("redirect"), false);
  assert.equal(url.searchParams.has("cursor"), false);
});

test("full history keeps its category, filters and cursor without accepting a different destination", () => {
  const href = recordedGuestActivityHref("qa-operational-guest", true, {
    tab: "searches", product: "CAR", stage: "SEARCH_COMPLETED", range: "custom",
    from: "2026-11-20", to: "2026-11-27", cursor: "opaque-recorded-cursor", href: "/admin/users/user/someone-else/activity",
  });
  assert.ok(href);
  const url = new URL(href, "https://admin.example.invalid");
  assert.equal(url.pathname, "/admin/users/guest/qa-operational-guest/activity/all");
  assert.equal(url.searchParams.get("cursor"), "opaque-recorded-cursor");
  assert.equal(url.searchParams.get("tab"), "searches");
  assert.equal(url.searchParams.get("product"), "CAR");
  assert.equal(url.searchParams.get("to"), "2026-11-27");
  assert.equal(url.searchParams.has("href"), false);
});

test("repeated filters remain invalid after the handoff instead of silently broadening history", () => {
  const href = recordedGuestActivityHref("qa-recorded-guest", true, { tab: ["searches", "all"], range: "all" });
  assert.ok(href);
  const query = new URL(href, "https://admin.example.invalid").searchParams;
  assert.deepEqual(query.getAll("tab"), ["searches", "all"]);
  assert.equal(parseActivityFilters({ tab: query.getAll("tab"), range: "all" }).ok, false);
});

test("invalid recorded identity values cannot construct a guest activity destination", () => {
  for (const id of ["", "short", "../user/someone", "guest?redirect=elsewhere"]) {
    assert.equal(recordedGuestActivityHref(id, true, {}), null);
  }
});
