import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("src/components/admin/AdminPageShell.tsx", "utf8");
const usersPage = readFileSync("src/app/admin/users/page.tsx", "utf8");
const supportPage = readFileSync("src/app/admin/support/page.tsx", "utf8");
const accountDeletionPage = readFileSync("src/app/admin/account-deletions/page.tsx", "utf8");

test("admin data table renders semantic sticky table structure", () => {
  assert.match(shell, /export function AdminDataTable/);
  assert.match(shell, /<table className=\{cn\("w-full border-separate border-spacing-0 text-left text-sm", fixedLayout && "table-fixed"\)\}/);
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

test("admin data table keeps automatic layout and final-cell styling as backwards-compatible defaults", () => {
  assert.match(shell, /fixedLayout = false/);
  assert.match(shell, /fixedLayout && "table-fixed"/);
  assert.match(shell, /usesDefaultFinalCellAlignment\(column\)/);
  assert.match(shell, /typeof column === "string" \|\| column\.align === undefined/);
});

test("configured alignment and width are shared by corresponding headers and body cells", () => {
  assert.match(shell, /<th[^>]+style=\{\{ width: columnWidth\(column\) \}\}[^>]+columnAlignClass\(column\)/);
  assert.match(shell, /<td[^>]+style=\{\{ width: columnWidth\(column\) \}\}[^>]+columnAlignClass\(column\)/);
  assert.match(shell, /const cellPadding = density === "compact" \? "px-4 py-3" : "px-5 py-4"/);
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
