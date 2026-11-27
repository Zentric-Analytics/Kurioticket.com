import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_USERS_DIRECTORY_MAX_PAGE, ADMIN_USERS_DIRECTORY_PAGE_SIZE,
  adminUsersDirectoryPageBounds, adminUsersDirectoryPageHref,
  isAdminUsersDirectoryPageValue, parseAdminUsersDirectoryPage,
} from "./adminUsersDirectoryPagination";

test("invalid directory page values clamp to page one without becoming SQL offsets", () => {
  for (const value of [undefined, "", "0", "-2", "1.2", "1e3", "Infinity", "1;DROP TABLE", ["1", "2"], "999999999999999999999999999"]) {
    assert.equal(parseAdminUsersDirectoryPage(value), 1, String(value));
  }
  assert.equal(parseAdminUsersDirectoryPage("0002"), 2);
  assert.equal(parseAdminUsersDirectoryPage("23"), 23);
  assert.equal(parseAdminUsersDirectoryPage(String(Number.MAX_SAFE_INTEGER)), ADMIN_USERS_DIRECTORY_MAX_PAGE);
  assert.equal(Number.isSafeInteger((ADMIN_USERS_DIRECTORY_MAX_PAGE - 1) * ADMIN_USERS_DIRECTORY_PAGE_SIZE), true);
});

test("directory pages retain complete access beyond a million pages and clamp to exact matching totals", () => {
  assert.deepEqual(adminUsersDirectoryPageBounds(2, 43), { page: 2, totalPages: 3, total: 43, offset: 20 });
  assert.deepEqual(adminUsersDirectoryPageBounds(100, 43), { page: 3, totalPages: 3, total: 43, offset: 40 });
  assert.deepEqual(adminUsersDirectoryPageBounds(100, 0), { page: 1, totalPages: 1, total: 0, offset: 0 });
  const large = adminUsersDirectoryPageBounds(1_000_001, 20_000_001);
  assert.equal(large.page, 1_000_001);
  assert.equal(large.totalPages, 1_000_001);
  assert.equal(large.offset, 20_000_000);
  assert.equal(isAdminUsersDirectoryPageValue(String(large.page)), true);
  assert.equal(isAdminUsersDirectoryPageValue(String(ADMIN_USERS_DIRECTORY_MAX_PAGE)), true);
  assert.equal(isAdminUsersDirectoryPageValue(String(ADMIN_USERS_DIRECTORY_MAX_PAGE + 1)), false);
  for (const total of [-1, 1.2, NaN, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => adminUsersDirectoryPageBounds(1, total));
});

test("directory page links preserve search, identity, role, status, ordering and custom dates exactly", () => {
  const filters = new URLSearchParams({ q: "Alex + 50%", tab: "REGISTERED", role: "ADMIN", status: "ACTIVE",
    sort: "name_desc", date: "custom", from: "2026-11-20", to: "2026-11-26", page: "99" });
  const next = new URL(adminUsersDirectoryPageHref(filters, 3), "https://fixture.invalid");
  assert.equal(next.pathname, "/admin/users");
  assert.equal(next.searchParams.get("page"), "3");
  for (const [key, value] of filters) if (key !== "page") assert.equal(next.searchParams.get(key), value);
  assert.equal(filters.get("page"), "99", "building a link does not mutate applied state");
  assert.equal(new URL(adminUsersDirectoryPageHref(filters, 1), "https://fixture.invalid").searchParams.has("page"), false);
});
