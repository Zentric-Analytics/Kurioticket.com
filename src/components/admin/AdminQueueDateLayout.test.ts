import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const support = readFileSync("src/components/admin/AdminSupportToolbar.tsx", "utf8");
const supportPage = readFileSync("src/app/admin/support/page.tsx", "utf8");
const deletion = readFileSync("src/components/admin/AdminDeletionFilters.tsx", "utf8");
const deletionPage = readFileSync("src/app/admin/account-deletions/page.tsx", "utf8");
const controls = readFileSync("src/components/admin/AdminQueueDateControls.tsx", "utf8");

test("Support aligns five controls in a single desktop row before unchanged status tabs", () => {
  assert.match(support, /lg:grid-cols-\[minmax\(0,2fr\)_repeat\(3,minmax\(0,1fr\)\)_120px\]/);
  assert.match(support, /<AdminQueueDateSelect range=\{draftRange\}/);
  assert.ok(support.indexOf('data-testid="support-search-row"') < support.indexOf('aria-label="Support ticket status"'));
  assert.match(support, /supportStatusTabs\.map/);
  assert.match(support, /from: customWindow\.from, to: customWindow\.to/);
  assert.match(supportPage, /resolveAdminQueueWindow/);
  assert.match(supportPage, /cursorHref\(applied, result\.data\.nextCursor\)/);
});

test("Deletion Requests has heading and four controls with applied date window", () => {
  assert.match(deletionPage, />Deletion Requests<\/h1>/);
  assert.match(deletion, /data-testid="deletion-filters-row"/);
  assert.match(deletion, /lg:grid-cols-\[minmax\(0,2fr\)_minmax\(0,1fr\)_minmax\(0,1fr\)_120px\]/);
  assert.match(deletion, /<AdminQueueDateSelect range=\{draftRange\}/);
  assert.match(deletion, /params\.set\("range", selectedWindow\.range\)/);
  assert.match(deletionPage, /cursorHref\(applied, result\.data\.nextCursor\)/);
  assert.match(deletionPage, /const params = toParams\(applied\)/);
});

test("Date controls show local custom inputs only when custom date is selected", () => {
  assert.match(controls, /range !== "custom"/);
  assert.match(controls, /<AdminCalendarInput mode="datetime-local" timeZone=\{timeZone\}/);
  assert.match(controls, /timeZoneLabel=\{timeZoneLabel\}/);
  assert.match(controls, /role="alert"/);
});
