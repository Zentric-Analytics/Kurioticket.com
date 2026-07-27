import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildAdminLogsHref, formatActionLabel, formatMetadata, formatTargetIdentifier, formatTargetType, parseAdminLogsSearchParams } from "./page-data";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const toolbar = readFileSync(new URL("./AdminLogsFilterToolbar.tsx", import.meta.url), "utf8");
const table = readFileSync(new URL("./AdminLogsTable.tsx", import.meta.url), "utf8");

test("admin logs uses the focused monitoring header and inline toolbar", () => {
  assert.doesNotMatch(page, /Admin Operations/);
  assert.match(page, /eyebrow="" title="Admin Logs"/);
  assert.match(toolbar, /Search logs\.\.\./);
  assert.match(toolbar, /name="admin"/);
  assert.match(toolbar, /name="action"/);
  assert.match(toolbar, /RotateCcw/);
  assert.match(toolbar, /Clear filters/);
  assert.doesNotMatch(page + toolbar, />Filter</);
});

test("table presents the required read-only security fields", () => {
  assert.match(table, /"Created", "Admin", "Action", "Target", "Target Email", "IP", "Details"/);
  assert.doesNotMatch(table, />Metadata<\/th>/);
  assert.match(table, /View details/);
  assert.match(table, /aria-expanded/);
  assert.match(table, /aria-controls/);
  assert.match(table, /font-mono/);
  assert.doesNotMatch(table, /dangerouslySetInnerHTML|delete|edit|mutation/i);
});

test("action and target values receive safe presentation formatting", () => {
  assert.equal(formatActionLabel("USER_SOFT_DELETED"), "User Soft Deleted");
  assert.equal(formatActionLabel("USER_HARD_DELETED"), "User Permanently Deleted");
  assert.equal(formatActionLabel("PROVIDER_RETESTED"), "Provider Retested");
  assert.equal(formatActionLabel("account_deletion.save_notes"), "Account Deletion Notes Saved");
  assert.equal(formatActionLabel("unknown/action.value"), "Unknown Action Value");
  assert.equal(formatTargetType("ACCOUNT_DELETION_REQUEST"), "Account Deletion Request");
  assert.equal(formatTargetType("AccountDeletionRequest"), "Account Deletion Request");
  assert.equal(formatTargetType("User"), "User");
  assert.equal(formatTargetType("Provider"), "Provider");
  assert.equal(formatTargetIdentifier("ckabcdefghijklmnopqrstuvwxyz1234"), "ckabcdef…1234");
  assert.equal(formatTargetIdentifier("duffel"), "Duffel");
});

test("table keeps network addresses intact and constrains dropdown metadata", () => {
  assert.match(table, /min-w-\[140px\] whitespace-nowrap[^\"]*font-mono/);
  assert.doesNotMatch(table, /break-all/);
  assert.match(table, /POPOVER_WIDTH = 420/);
  assert.match(table, /POPOVER_MAX_HEIGHT = 420/);
  assert.match(table, /max-h-\[420px\]/);
  assert.match(table, /overflow-y-auto/);
  assert.match(table, /whitespace-pre-wrap/);
  assert.match(table, /overflow-x-auto/);
});

test("details use a body portal instead of an expanded table row", () => {
  assert.match(table, /createPortal\(<AuditDetailsPopover/);
  assert.match(table, /document\.body/);
  assert.match(table, /className="fixed z-\[1000\]/);
  assert.doesNotMatch(table, /<tr id=\{detailsId\}|colSpan=\{7\}/);
  assert.doesNotMatch(table, /Hide details/);
});

test("details coordinate one open dropdown and support dismissal", () => {
  assert.match(table, /const \[openId, setOpenId\]/);
  assert.match(table, /setOpenId\(log\.id\)/);
  assert.match(table, /document\.addEventListener\("pointerdown", handlePointerDown\)/);
  assert.match(table, /event\.key === "Escape"/);
  assert.match(table, /closePopover\(true\)/);
  assert.match(table, /window\.addEventListener\("resize", handleViewportChange\)/);
  assert.match(table, /window\.addEventListener\("scroll", handleViewportChange, true\)/);
});

test("details trigger and floating panel expose accessible relationships", () => {
  assert.match(table, /aria-haspopup="dialog"/);
  assert.match(table, /aria-expanded=\{open\}/);
  assert.match(table, /aria-controls=\{detailsId\}/);
  assert.match(table, /role="dialog"/);
  assert.match(table, /aria-modal="false"/);
  assert.match(table, /focus-ring/);
});

test("metadata is complete, escaped by React, and handles empty and scalar values", () => {
  assert.equal(formatMetadata({ nested: ["<script>alert(1)</script>", 2] }), '{\n  "nested": [\n    "<script>alert(1)</script>",\n    2\n  ]\n}');
  assert.equal(formatMetadata(null), null);
  assert.equal(formatMetadata({}), null);
  assert.equal(formatMetadata("legacy"), '"legacy"');
  assert.match(table, /No additional metadata/);
  assert.doesNotMatch(table, /dangerouslySetInnerHTML/);
});

test("result states and pagination preserve all filters", () => {
  assert.match(page, /Showing \{first\}–\{last\} of \{data\.total\} log entries/);
  assert.match(page, /No admin logs recorded\./);
  assert.match(page, /No admin logs found\./);
  assert.match(page, /AdminDataErrorState/);
  assert.equal(buildAdminLogsHref(3, { q: "IPv6", admin: "admin@example.com", action: "USER_REACTIVATED" }), "/admin/logs?q=IPv6&admin=admin%40example.com&action=USER_REACTIVATED&page=3");
  assert.deepEqual(parseAdminLogsSearchParams({ page: "bad" }), { q: "", admin: "ALL", action: "ALL", page: 1 });
});
