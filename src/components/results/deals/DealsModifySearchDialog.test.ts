import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const dialog = readFileSync(
  new URL("./DealsModifySearchDialog.tsx", import.meta.url),
  "utf8",
);
const results = readFileSync(
  new URL("../DealsResultsClient.tsx", import.meta.url),
  "utf8",
);
const overview = readFileSync(
  new URL("./DealsResultsSearchSummary.tsx", import.meta.url),
  "utf8",
);
const form = readFileSync(
  new URL("../../search/DealsSearchForm.tsx", import.meta.url),
  "utf8",
);
const english = readFileSync(
  new URL("../../../lib/i18n/en.ts", import.meta.url),
  "utf8",
);

test("results search form retains only the pending-safe primary action", () => {
  const props =
    form.match(/export type DealsSearchFormProps = \{[\s\S]*?\n\};/)?.[0] ?? "";
  const parameters =
    form.match(/export function DealsSearchForm\(\{[^}]*\}/)?.[0] ?? "";
  const action = form.match(/const searchDealsButton = [^;]+;/)?.[0] ?? "";
  assert.doesNotMatch(props, /onCancel/);
  assert.doesNotMatch(parameters, /onCancel/);
  assert.doesNotMatch(form, /deals\.results\.editor\.cancel/);
  assert.doesNotMatch(form, /onClick=\{onCancel\}/);
  assert.match(action, /type="submit"/);
  assert.match(action, /disabled=\{submitting \|\| pending\}/);
  assert.match(action, /aria-busy=\{submitting \|\| pending\}/);
  assert.match(action, /deals\.results\.editor\.update/);
  assert.match(action, /deals\.results\.editor\.updating/);
  assert.doesNotMatch(dialog, /onCancel=\{onClose\}/);
});

test("English editor copy retains close and update labels without the obsolete cancel label", () => {
  assert.doesNotMatch(english, /deals\.results\.editor\.cancel/);
  assert.match(english, /deals\.results\.editor\.close/);
  assert.match(english, /deals\.results\.editor\.update/);
  assert.match(english, /deals\.results\.editor\.updating/);
});

test("modify search uses a labelled modal while preserving the results page", () => {
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /aria-labelledby="deals-modify-search-dialog-title"/);
  assert.match(dialog, /bg-slate-950\/45/);
  assert.match(dialog, /event\.target === event\.currentTarget/);
  assert.match(results, /editorOpen \? <DealsModifySearchDialog/);
  assert.doesNotMatch(results, /DealsInlineSearchEditor/);
});

test("modify search mounts the results form with the shared package selector", () => {
  assert.match(dialog, /<DealsSearchForm[^>]*variant="results"/);
  assert.match(form, /data-deals-package-selector/);
  assert.match(form, /data-deals-results-main-search-row/);
  assert.doesNotMatch(
    form,
    /data-deals-results-(?:flight|stay|car|travellers)/,
  );
  assert.doesNotMatch(form, /data-deals-product-selector/);
});

test("modify trigger and close controls retain accessible button contracts", () => {
  assert.match(overview, /<button\s+ref=\{modifyButtonRef\}\s+type="button"/);
  assert.equal(
    (overview.match(/aria-controls="deals-modify-search-dialog"/g) ?? [])
      .length,
    4,
  );
  assert.match(overview, /modifyButtonRef\.current = event\.currentTarget/);
  assert.match(overview, /onClick=\{handleModify\}/);
  assert.doesNotMatch(overview, /href=.*deals/);
  assert.match(
    dialog,
    /<button ref=\{closeRef\} type="button" onClick=\{onClose\} aria-label=\{t\("deals\.results\.editor\.close"\)\}/,
  );
  assert.match(
    results,
    /requestAnimationFrame\(\(\) => activeModifyTriggerRef\.current\?\.focus\(\)\)/,
  );
});

test("dialog traps focus, locks scrolling, and restores document styles", () => {
  assert.match(dialog, /event\.key !== "Tab"/);
  assert.match(dialog, /document\.body/);
  assert.match(dialog, /window\.scrollTo\(0, scrollY\)/);
  assert.match(dialog, /overscroll-contain/);
});

test("modify search uses one child-overlay selector for detection and focus filtering", () => {
  const selector =
    dialog.match(/const dealsChildOverlaySelector = ([^;]+);/)?.[0] ?? "";
  assert.match(selector, /data-deals-car-return-location-popover/);
  assert.match(dialog, /document\.querySelector\(dealsChildOverlaySelector\)/);
  assert.match(dialog, /node\.closest\(dealsChildOverlaySelector\)/);
});

test("Escape yields to nested pickers and backdrop dismissal only handles the backdrop", () => {
  assert.match(
    dialog,
    /if \(event\.key === "Escape"\) \{ if \(hasOpenChild\(\)\) return;[\s\S]*?onClose\(\); return; \}/,
  );
  assert.match(dialog, /event\.target === event\.currentTarget/);
});

test("pending updates remain protected by the parent close contract", () => {
  assert.match(
    results,
    /const closeEditor = useCallback\(\(\) => \{ if \(pendingFingerprint\) return;/,
  );
});

test("changed searches navigate directly and clear selections only after application", () => {
  assert.match(results, /startRouteProgress\(\); setPendingFingerprint/);
  assert.match(results, /router\.push\(buildDealsResultsUrl\(draft\)/);
  assert.match(results, /fingerprint === pendingFingerprint/);
  assert.doesNotMatch(
    results,
    /setPlan\(null\); removeDealsTripPlan\(\); setPersistence\("idle"\); setEditorOpen\(false\)[\s\S]*router\.push/,
  );
});
