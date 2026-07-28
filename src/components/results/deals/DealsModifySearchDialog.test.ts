import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const dialog = readFileSync(new URL("./DealsModifySearchDialog.tsx", import.meta.url), "utf8");
const results = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");
const overview = readFileSync(new URL("./DealsResultsSearchSummary.tsx", import.meta.url), "utf8");

test("modify search uses a labelled modal while preserving the results page", () => {
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /aria-labelledby="deals-modify-search-dialog-title"/);
  assert.match(dialog, /bg-slate-950\/45/);
  assert.match(dialog, /event\.target === event\.currentTarget/);
  assert.match(results, /editorOpen \? <DealsModifySearchDialog/);
  assert.doesNotMatch(results, /DealsInlineSearchEditor/);
});

test("modify trigger and close controls retain accessible button contracts", () => {
  assert.match(overview, /<button ref=\{modifyButtonRef\} type="button"/);
  assert.equal((overview.match(/aria-controls="deals-modify-search-dialog"/g) ?? []).length, 2);
  assert.match(overview, /modifyButtonRef\.current = event\.currentTarget/);
  assert.match(overview, /onClick=\{handleModify\}/);
  assert.doesNotMatch(overview, /href=.*deals/);
  assert.match(dialog, /type="button" onClick=\{onClose\} aria-label=\{t\("deals\.results\.editor\.close"\)\}/);
  assert.match(results, /requestAnimationFrame\(\(\) => modifyButtonRef\.current\?\.focus\(\)\)/);
});

test("dialog traps focus, locks scrolling, and restores document styles", () => {
  assert.match(dialog, /event\.key !== "Tab"/);
  assert.match(dialog, /document\.body/);
  assert.match(dialog, /window\.scrollTo\(0, scrollY\)/);
  assert.match(dialog, /overscroll-contain/);
});

test("changed searches navigate directly and clear selections only after application", () => {
  assert.match(results, /startRouteProgress\(\); setPendingFingerprint/);
  assert.match(results, /router\.push\(buildDealsResultsUrl\(draft\)/);
  assert.match(results, /fingerprint === pendingFingerprint/);
  assert.doesNotMatch(results, /setPlan\(null\); removeDealsTripPlan\(\); setPersistence\("idle"\); setEditorOpen\(false\)[\s\S]*router\.push/);
});
