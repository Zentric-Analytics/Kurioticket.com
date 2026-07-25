import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ACCOUNT_DELETION_PAGE_SIZE, accountDeletionFilters, buildAccountDeletionHref, buildAccountDeletionWhere, getVisibleAccountDeletionPages, parseAccountDeletionSearchParams } from "./page-data";

const page = readFileSync("src/app/admin/account-deletions/page.tsx", "utf8");
const toolbar = readFileSync("src/app/admin/account-deletions/AccountDeletionFilterToolbar.tsx", "utf8");

test("header omits Admin Operations", () => {
  assert.match(page, /<AdminPageShell eyebrow="" title="Account Deletions"/);
  assert.doesNotMatch(page, /Admin Operations/i);
});

test("inline search and clear filters controls are rendered", () => {
  assert.match(toolbar, /Search requests\.\.\./);
  assert.match(toolbar, /RotateCcw/);
  assert.match(toolbar, /Clear filters/);
  assert.match(toolbar, /variant="secondary"/);
  assert.doesNotMatch(toolbar, /AdminSectionCard|AdminFilterBar/);
});

test("all existing lifecycle tabs and mappings remain available", () => {
  assert.deepEqual(accountDeletionFilters.map(({ label }) => label), ["Pending + review", "Pending", "Cancelled / Reactivated", "Ready for review", "Completed", "All"]);
  assert.deepEqual(accountDeletionFilters[0].statuses, ["PENDING", "READY_FOR_REVIEW"]);
  assert.match(page, /counts\[filter\.key\]/);
  assert.match(page, /aria-current=\{active \? "page"/);
});

test("active lifecycle tab and search use direct-link query parameters", () => {
  assert.equal(buildAccountDeletionHref(1, { q: "case", status: "ready" }), "/admin/account-deletions?q=case&status=ready");
  assert.equal(buildAccountDeletionHref(1, { q: "", status: "open" }), "/admin/account-deletions");
});

test("table is simplified for triage", () => {
  assert.match(page, /columns=\{\["Request", "User", "Status", "Requested", "Support \/ Admin reference"/);
  const columns = page.slice(page.indexOf("columns={"), page.indexOf("summary={"));
  for (const removed of ["Scheduled", "Cancelled / reactivated", "Completed", "Notes"]) assert.doesNotMatch(columns, new RegExp(`"${removed}"`, "i"));
  assert.doesNotMatch(page, /reviewNotes|cancellationMetadata/);
});

test("request action retains the details route and outlined Review label", () => {
  assert.match(page, /href=\{`\/admin\/account-deletions\/\$\{request\.id\}`\}/);
  assert.match(page, /variant="secondary"[^>]*>Review →/);
});

test("search supports available operational identifiers and combines with status", () => {
  const where = buildAccountDeletionWhere(parseAccountDeletionSearchParams({ q: "abc", status: "ready" }));
  assert.equal(where.OR?.length, 5);
  assert.deepEqual(where.status, { in: ["READY_FOR_REVIEW"] });
  assert.deepEqual(Object.keys(where.OR?.[0] || {}), ["email"]);
  assert.deepEqual(Object.keys(where.OR?.[1] || {}), ["id"]);
  assert.deepEqual(Object.keys(where.OR?.[2] || {}), ["supportTicketId"]);
  assert.deepEqual(Object.keys(where.OR?.[3] || {}), ["adminNotificationId"]);
});

test("pagination preserves search and lifecycle status", () => {
  assert.equal(ACCOUNT_DELETION_PAGE_SIZE, 25);
  assert.equal(buildAccountDeletionHref(3, { q: "ticket", status: "cancelled" }), "/admin/account-deletions?q=ticket&status=cancelled&page=3");
  assert.deepEqual(getVisibleAccountDeletionPages(4, 8), [3, 4, 5]);
  assert.match(page, /skip: \(currentPage - 1\) \* ACCOUNT_DELETION_PAGE_SIZE/);
  assert.match(page, />Previous<\/PageControl>/);
  assert.match(page, />Next<\/PageControl>/);
});

test("database, global empty, and filtered empty states are distinct", () => {
  assert.match(page, /<AdminDataErrorState title="Account deletion requests could not be loaded\."/);
  assert.match(page, /console\.error\("\[admin-account-deletions:data\]", error\)/);
  assert.match(page, /data\.totalRequests === 0 \? "No deletion requests" : "No requests in this view"/);
  assert.match(page, /Try another status filter to review other deletion request lifecycle states\./);
  assert.match(page, /href="\/admin\/account-deletions">Clear filters/);
});
