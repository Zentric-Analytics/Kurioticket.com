import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const support = readFileSync("src/components/admin/AdminSupportToolbar.tsx", "utf8");
const deletion = readFileSync("src/components/admin/AdminDeletionFilters.tsx", "utf8");
const queue = readFileSync("src/components/admin/AdminQueueLoadingState.tsx", "utf8");
const deletionPage = readFileSync("src/app/admin/account-deletions/page.tsx", "utf8");

test("Support tabs and controls wrap directly above records, without Clear filters", () => {
  assert.match(support, /data-testid="support-status-filter-row"/);
  assert.match(support, /data-testid="support-filter-controls"/);
  assert.match(support, /lg:grid-cols-\[minmax\(0,2fr\)_repeat\(3,minmax\(0,1fr\)\)_120px\]/);
  assert.match(support, /<AdminQueueDateSelect range=\{draftRange\}/);
  assert.match(support, /<AdminQueueCustomDates range=\{draftRange\}/);
  assert.ok(support.indexOf('data-testid="support-search-row"') < support.indexOf('aria-label="Support ticket status"'));
  assert.ok(support.indexOf('data-testid="support-filter-controls"') < support.indexOf('aria-label="Support ticket status"'));
  assert.match(support, /<Search size=\{17\}/);
  assert.match(support, /onSubmit=\{applyFilters\}/);
  assert.doesNotMatch(support, /Clear filters|clearFilters|overflow-x-auto|overflow-x-scroll/);
  assert.match(support, /onValueChange=\{setDraftPriority\}/);
  assert.match(support, /onValueChange=\{setDraftCategory\}/);
});

test("Both admin queues reuse one consistent loading state only on Apply", () => {
  assert.match(queue, /role="status" aria-live="polite" aria-busy="true"/);
  assert.match(queue, /LoaderCircle size=\{18\}/);
  assert.match(support, /const isLoadingResults = isPending/);
  assert.match(support, /<AdminQueueLoadingState label="Loading tickets/);
  assert.match(deletion, /<AdminQueueLoadingState label="Loading requests/);
  assert.match(deletion, /startTransition\(\(\) => router\.push/);
  assert.match(deletion, /disabled=\{isPending\}/);
  assert.match(deletion, /onSubmit=\{applyFilters\}/);
  assert.match(deletion, /onValueChange=\{setDraftStatus\}/);
  assert.doesNotMatch(deletion, /onValueChange=\{[^}]*router\.push/);
  assert.match(deletion, /Intentionally omit cursor/);
  assert.match(deletionPage, /<AdminDeletionFilters/);
  assert.match(deletionPage, /adminOperationalReads\.deletions\.list\(params\)/);
  assert.match(deletionPage, /cursorHref\(applied, result\.data\.nextCursor\)/);
  assert.match(deletionPage, /const applied = \{ \.\.\.raw, from: window\.from \|\| undefined, to: window\.to \|\| undefined \}/);
  assert.match(deletionPage, /"\\&range=" \+ window\.range/);
});

test("Neither queue replaces unavailable or invalid reads with empty records", () => {
  const supportPage = readFileSync("src/app/admin/support/page.tsx", "utf8");
  assert.match(supportPage, /Invalid support filters/);
  assert.match(supportPage, /Support data unavailable/);
  assert.match(deletionPage, /Invalid deletion filters/);
  assert.match(deletionPage, /Deletion queue unavailable/);
});
