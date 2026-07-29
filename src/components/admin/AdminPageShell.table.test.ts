import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("src/components/admin/AdminPageShell.tsx", "utf8");
const usersPage = readFileSync("src/app/admin/users/page.tsx", "utf8");
const supportPage = readFileSync("src/app/admin/support/page.tsx", "utf8");
const accountDeletionPage = readFileSync("src/app/admin/account-deletions/page.tsx", "utf8");

test("admin data table renders semantic sticky table structure", () => {
  assert.match(shell, /export function AdminDataTable/);
  assert.match(shell, /<table className="w-full border-separate border-spacing-0 text-left text-sm"/);
  assert.match(shell, /<caption className="sr-only">/);
  assert.match(shell, /<th key=\{columnKey\(column\)\} scope="col"/);
  assert.match(shell, /<thead className="sticky top-0 z-10/);
});

test("admin data table standardizes row hover, focus, overflow, and action alignment", () => {
  assert.match(shell, /overflow-x-auto/);
  assert.match(shell, /hover:bg-slate-50\/80/);
  assert.match(shell, /focus-within:bg-slate-50\/80/);
  assert.match(shell, /\[&_a\]:focus-ring \[&_button\]:focus-ring/);
  assert.match(shell, /whitespace-nowrap text-right/);
});

test("admin empty, loading, and error states are shared and accessible", () => {
  assert.match(shell, /export function AdminEmptyState/);
  assert.match(shell, /role="status" aria-live="polite"/);
  assert.match(shell, /export function AdminDataTableSkeleton/);
  assert.match(shell, /motion-safe:animate-pulse/);
  assert.match(shell, /export function AdminDataErrorState/);
  assert.match(shell, /role="alert"/);
});

test("users page uses the shared admin data table system", () => {
  assert.match(usersPage, /AdminDataTable/);
  assert.doesNotMatch(usersPage, /<table className=/);
  assert.match(usersPage, /caption="Admin users"/);
  assert.match(usersPage, /Protected admin/);
});

test("support and account deletion actions use shared link button primitives", () => {
  assert.match(supportPage, /AdminLinkButton/);
  assert.match(supportPage, /aria-label=\{`View support ticket/);
  assert.match(accountDeletionPage, /AdminLinkButton/);
  assert.match(accountDeletionPage, /aria-label=\{`Manage deletion request/);
  assert.match(accountDeletionPage, /Action needed/);
});

test("status badges use human-readable label formatter", () => {
  assert.match(shell, /formatAdminBadgeLabel\(children\)/);
});
