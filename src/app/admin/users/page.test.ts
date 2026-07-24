import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildUserWhere, buildUsersPaginationHref, clampUserPage, parseUserSearchParams, USER_PAGE_SIZE, usersTableColumns } from "./page-data";

const page = readFileSync("src/app/admin/users/page.tsx", "utf8");

test("authorization runs before database access", () => {
  assert.ok(page.indexOf('await requireAdminSession("/admin/users")') < page.indexOf("getPrisma()"));
});

test("invalid role falls back to ALL", () => {
  assert.equal(parseUserSearchParams({ role: "OWNER" }).role, "ALL");
});

test("invalid status falls back to ALL", () => {
  assert.equal(parseUserSearchParams({ status: "LOCKED" }).status, "ALL");
});

test("invalid page falls back to 1", () => {
  assert.equal(parseUserSearchParams({ page: "0" }).page, 1);
  assert.equal(parseUserSearchParams({ page: "-3" }).page, 1);
  assert.equal(parseUserSearchParams({ page: "2.5" }).page, 1);
  assert.equal(parseUserSearchParams({ page: "abc" }).page, 1);
});

test("search filters name and email case-insensitively", () => {
  assert.deepEqual(buildUserWhere(parseUserSearchParams({ q: "  Ada " })).OR, [
    { email: { contains: "Ada", mode: "insensitive" } },
    { name: { contains: "Ada", mode: "insensitive" } },
  ]);
});

test("role and status filters are included only when not ALL", () => {
  assert.deepEqual(buildUserWhere(parseUserSearchParams({ role: "ALL", status: "ALL" })), {});
  assert.equal(buildUserWhere(parseUserSearchParams({ role: "ADMIN" })).role, "ADMIN");
  assert.equal(buildUserWhere(parseUserSearchParams({ status: "SUSPENDED" })).status, "SUSPENDED");
});

test("page size is 25", () => {
  assert.equal(USER_PAGE_SIZE, 25);
  assert.match(page, /take: USER_PAGE_SIZE/);
});

test("correct skip is used for later pages", () => {
  assert.match(page, /skip: \(currentPage - 1\) \* USER_PAGE_SIZE/);
});

test("a page beyond the final page is clamped", () => {
  assert.deepEqual(clampUserPage(99, 84), { currentPage: 4, totalPages: 4 });
  assert.deepEqual(clampUserPage(99, 0), { currentPage: 1, totalPages: 1 });
});

test("pagination URLs preserve q, role and status", () => {
  assert.equal(buildUsersPaginationHref(3, { q: "ada", role: "ADMIN", status: "ACTIVE" }), "/admin/users?q=ada&role=ADMIN&status=ACTIVE&page=3");
  assert.equal(buildUsersPaginationHref(1, { q: "", role: "ALL", status: "ALL" }), "/admin/users");
});

test("database failure produces the Users data-error state", () => {
  assert.match(page, /<AdminDataErrorState/);
  assert.match(page, /Users could not be loaded\./);
  assert.match(page, /Refresh the page or check the database connection\./);
  assert.match(page, /console\.error\("\[admin-users:data\]", error\)/);
});

test("database failure does not produce filtered empty state", () => {
  const errorBranch = page.slice(page.indexOf("!data ?"), page.indexOf(": data.users.length === 0"));
  assert.doesNotMatch(errorBranch, /No users match these filters/);
});

test("legitimate zero users produces no-users-created empty state", () => {
  assert.match(page, /No users have been created yet\./);
});

test("legitimate filtered zero results produces no-filter-matches empty state", () => {
  assert.match(page, /No users match these filters\./);
  assert.match(page, /<AdminLinkButton href="\/admin\/users">Clear filters<\/AdminLinkButton>/);
});

test("summary counts use the correct definitions", () => {
  assert.match(page, /db\.user\.count\(\)/);
  assert.match(page, /db\.user\.count\(\{ where: \{ status: "ACTIVE" \} \}\)/);
  assert.match(page, /db\.user\.count\(\{ where: \{ status: "SUSPENDED" \} \}\)/);
  assert.match(page, /db\.user\.count\(\{ where: \{ role: \{ in: \["ADMIN", "SUPPORT"\] \} \} \}\)/);
});

test("table columns are exactly User, Role, Status, Joined, Actions", () => {
  assert.deepEqual(usersTableColumns.map((column) => typeof column === "string" ? column : column.label), ["User", "Role", "Status", "Joined", "Actions"]);
});

test("raw user ID is no longer rendered in the default table", () => {
  const cells = page.slice(page.indexOf("cells: ["), page.indexOf("<UserStatusActions"));
  assert.doesNotMatch(cells, /\{user\.id\}/);
  assert.doesNotMatch(cells, /font-mono/);
});

test("Updated column is removed", () => {
  assert.doesNotMatch(page, /"Updated"/);
  assert.doesNotMatch(page, /updatedAt/);
});

test("user name and email are combined in one cell", () => {
  const userCell = page.slice(page.indexOf('<div key="user"'), page.indexOf('<StatusPill key="role"'));
  assert.match(userCell, /user\.name \|\| "Unnamed user"/);
  assert.match(userCell, /user\.email \|\| "—"/);
});

test("UserStatusActions still receives all existing safety props", () => {
  const action = page.match(/<UserStatusActions[\s\S]*?\/>/)?.[0] ?? "";
  for (const prop of ["userId={user.id}", "email={user.email}", "role={user.role}", "status={user.status}", "isSelf={user.id === sessionUserId}", "isProtectedAdmin={isProtectedAdmin}"]) {
    assert.match(action, new RegExp(prop.replace(/[{}.[\]()*+?^$|]/g, "\\$&")));
  }
});
