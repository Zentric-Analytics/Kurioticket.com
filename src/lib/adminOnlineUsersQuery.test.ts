import assert from "node:assert/strict";
import test from "node:test";
import { adminOnlineUsersHref, defaultOnlineUsersQuery, matchesAdminOnlineUser, parseAdminOnlineUsersQuery } from "./adminOnlineUsersQuery";
import type { OnlineIdentityRow } from "./adminOnlineUsersSnapshot";

test("Online Users filter and page state round-trips in a shareable internal URL", () => {
  const expected = { q: "Lagos & Abuja", type: "guest" as const, role: "ALL" as const, platform: "website" as const, page: 3 };
  const href = adminOnlineUsersHref(expected);
  const url = new URL(href, "https://admin.example.invalid");
  assert.equal(url.pathname, "/admin/users/online");
  assert.deepEqual(parseAdminOnlineUsersQuery(url.searchParams), { ok: true, query: expected });
  assert.deepEqual(parseAdminOnlineUsersQuery(new URLSearchParams()), { ok: true, query: defaultOnlineUsersQuery });
  assert.equal(adminOnlineUsersHref(defaultOnlineUsersQuery), "/admin/users/online");
  const resetPage = new URL(adminOnlineUsersHref({ ...expected, q: "Nigeria", page: 1 }), url);
  assert.equal(resetPage.searchParams.has("page"), false);
  assert.equal(resetPage.searchParams.get("platform"), "website");
});

test("invalid and repeated Online filters fail explicitly instead of broadening the view", () => {
  for (const query of ["type=guest&type=registered", "role=OWNER", "platform=windows", "page=0", "page=1000001",
    "page=1.5", "q=%0A", "q=" + "a".repeat(121), "type=ALL&type=ALL"]) {
    assert.equal(parseAdminOnlineUsersQuery(new URLSearchParams(query)).ok, false, query);
  }
  assert.deepEqual(parseAdminOnlineUsersQuery(new URLSearchParams("redirect=https://other.invalid&token=private")),
    { ok: true, query: defaultOnlineUsersQuery });
});

test("Online search covers recorded country while respecting identity, role and platform scopes", () => {
  const account: OnlineIdentityRow = { id: "qa-account-001", kind: "registered", name: "Example account", email: "example@example.invalid",
    role: "ADMIN", locationLabel: "Nigeria", platforms: ["desktop_web", "ios"], lastSeenAt: "2026-11-27T01:40:00Z" };
  const guest: OnlineIdentityRow = { ...account, id: "guest-1", kind: "guest", name: "Guest session", email: null, role: null,
    platforms: ["mobile_web"], liveReference: "x".repeat(43) };
  assert.equal(matchesAdminOnlineUser(account, { ...defaultOnlineUsersQuery, q: "NIGERIA" }), true);
  assert.equal(matchesAdminOnlineUser(guest, { ...defaultOnlineUsersQuery, q: "Nigeria", platform: "website", type: "guest" }), true);
  assert.equal(matchesAdminOnlineUser(guest, { ...defaultOnlineUsersQuery, q: "guest session", role: "ADMIN" }), false);
  assert.equal(matchesAdminOnlineUser(account, { ...defaultOnlineUsersQuery, type: "guest" }), false);
  assert.equal(matchesAdminOnlineUser(guest, { ...defaultOnlineUsersQuery, platform: "ios" }), false);
  assert.equal(matchesAdminOnlineUser(guest, { ...defaultOnlineUsersQuery, q: "guest-1" }), false, "temporary display keys are not historical identity evidence");
  assert.equal(matchesAdminOnlineUser({ ...guest, locationLabel: null }, { ...defaultOnlineUsersQuery, q: "Nigeria" }), false);
});
