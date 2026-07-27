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
  assert.equal(formatTargetIdentifier("ckabcdefghijklmnopqrstuvwxyz1234"), "ckabcdef…1234");
  assert.equal(formatTargetIdentifier("duffel"), "Duffel");
});

test("table keeps network addresses intact and constrains expanded metadata", () => {
  assert.match(table, /min-w-\[140px\] whitespace-nowrap[^\"]*font-mono/);
  assert.doesNotMatch(table, /break-all|break-words/);
  assert.match(table, /max-w-\[600px\]/);
  assert.match(table, /whitespace-pre-wrap/);
  assert.match(table, /overflow-x-auto/);
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
