import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const support = readFileSync("src/components/admin/AdminSupportToolbar.tsx", "utf8");
const product = readFileSync("src/components/admin/ProductSearchRecordsPanel.tsx", "utf8");
const handoffs = readFileSync("src/components/admin/ProviderHandoffFilters.tsx", "utf8");

test("Support search and dropdown filters are drafts until Apply filters", () => {
  assert.match(support, /const \[draftPriority, setDraftPriority\]/);
  assert.match(support, /const \[draftCategory, setDraftCategory\]/);
  assert.match(support, /onValueChange=\{setDraftPriority\}/);
  assert.match(support, /onValueChange=\{setDraftCategory\}/);
  assert.match(support, /onSubmit=\{applyFilters\}/);
  assert.match(support, /Apply filters/);
  assert.match(support, /const isLoadingResults = isPending;/);
  assert.doesNotMatch(support, /setTimeout\(\(\) => \{[^}]*navigate\(\{ q:/);
  assert.doesNotMatch(support, /onValueChange=\{next => navigate\(\{ (?:priority|category):/);
  assert.match(support, /sm:grid-cols-\[minmax\(0,160px\)_minmax\(0,160px\)_auto\]/);
});

test("date and outcome records filters are applied together only on request", () => {
  assert.match(product, /onClick=\{applyFilters\}/);
  assert.match(product, /setFilter\(draftFilter\)/);
  assert.match(product, /setWindowValue\(draftWindow\)/);
  assert.match(handoffs, /Apply filters/);
  assert.match(handoffs, /method="get"/);
});
