import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildSupportHref, getVisibleSupportPages, parseSupportSearchParams, SUPPORT_PAGE_SIZE } from "./page-data";

const page = readFileSync("src/app/admin/support/page.tsx", "utf8");
const toolbar = readFileSync("src/app/admin/support/SupportFilterToolbar.tsx", "utf8");

test("support header omits the operations eyebrow", () => {
  assert.match(page, /<AdminPageShell eyebrow="" title="Support"/);
  assert.doesNotMatch(page, /Admin Operations/i);
});

test("toolbar is inline and applies search, category, and status without a filter button", () => {
  assert.doesNotMatch(toolbar, /AdminFilterBar|AdminSectionCard/);
  assert.match(toolbar, /Search tickets\.\.\./);
  assert.match(toolbar, /RotateCcw/);
  assert.match(toolbar, /Clear filters/);
  assert.doesNotMatch(toolbar, />Filter<|type="submit"/);
});

test("support table removes raw IDs and Updated while retaining required columns", () => {
  assert.doesNotMatch(page, /"Updated"|updatedAt/);
  assert.match(page, /columns=\{\["Ticket", "User", "Category", "Status"/);
  const ticketCell = page.slice(page.indexOf('<p key="ticket"'), page.indexOf('<div key="user"'));
  assert.doesNotMatch(ticketCell, /ticket\.id/);
});

test("priority is condensed only when every loaded ticket is normal", () => {
  assert.match(page, /tickets\.some\(\(ticket\) => ticket\.priority !== "NORMAL"\)/);
  assert.match(page, /showPriorityColumn \? \["Priority"\]/);
  assert.match(page, /!showPriorityColumn/);
});

test("action labels and outlined style distinguish deletion requests", () => {
  assert.match(page, /"View request →" : "Open →"/);
  assert.match(page, /variant="secondary"/);
});

test("filters and pagination parse and preserve search parameters", () => {
  assert.equal(SUPPORT_PAGE_SIZE, 25);
  assert.deepEqual(parseSupportSearchParams({ q: "  refund ", category: "payment", status: "OPEN", page: "2" }), { q: "refund", category: "payment", status: "OPEN", page: 2 });
  assert.equal(parseSupportSearchParams({ status: "INVALID", page: "0" }).status, "ALL");
  assert.equal(buildSupportHref(3, { q: "refund", category: "payment", status: "OPEN" }), "/admin/support?q=refund&category=payment&status=OPEN&page=3");
  assert.deepEqual(getVisibleSupportPages(4, 8), [3, 4, 5]);
});

test("result count is present above and beneath the table", () => {
  assert.match(page, /summary=\{<span[^>]*>Showing \{firstResult\}–\{lastResult\} of \{matchingTickets\.length\} tickets/);
  assert.match(page, /<span>Showing \{firstResult\}–\{lastResult\} of \{total\} tickets<\/span>/);
  assert.match(page, />Previous<\/PageControl>/);
  assert.match(page, />Next<\/PageControl>/);
});
