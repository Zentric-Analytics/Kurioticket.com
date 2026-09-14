import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { carFilterCopy } from "./carFilterCopy";
import { NATIVE_FILTER_RESULTS_TRANSITION_MS, NATIVE_FILTER_SELECTION_FEEDBACK_MS } from "./filterResultsTransition";

const sheet = readFileSync("src/features/search/CarFilterSheet.tsx", "utf8");
const screen = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
const quickSheet = readFileSync("src/features/search/CarResultsQuickFilterSheet.tsx", "utf8");

test("Cars filter feedback is immediate and localized", () => {
  assert.equal(NATIVE_FILTER_SELECTION_FEEDBACK_MS, 400);
  assert.equal(NATIVE_FILTER_RESULTS_TRANSITION_MS, 700);
  assert.equal(carFilterCopy("en").updatingFilters, "Updating filters…");
  assert.equal(carFilterCopy("es").updatingFilters, "Actualizando filtros…");
  assert.equal(carFilterCopy("ar").updatingFilters, "جارٍ تحديث عوامل التصفية…");
  assert.match(sheet, /markUpdating\(\); onChange\(\{ \.\.\.filters, \[group\]: selected\.includes/);
});

test("Cars result transition is local and reuses accessible skeletons", () => {
  const helper = screen.slice(screen.indexOf("const startCarResultsTransition"), screen.indexOf("const changeCarFilters"));
  const sortCallback = screen.match(/onApplySort=\{\(next\)=>\{[\s\S]*?\}\}/)?.[0] ?? "";
  assert.match(screen, /carFilterSessionDirtyRef/);
  assert.match(screen, /const closeFilterSheet=\(\)=>setFilterSheetVisible\(false\);/);
  assert.match(screen, /carResultsApplying\?<CarSkeletons/);
  assert.match(screen, /accessibilityLabel="Updating car results"/);
  assert.doesNotMatch(helper, /searchCars|setStatus|setRetry|router|load\(/);
  assert.match(sortCallback, /if\(next!==sort\)\{setSort\(next\);startCarResultsTransition\(\);\}/);
  assert.doesNotMatch(sortCallback, /searchCars|setStatus|setRetry|router|load\(|scrollTo/);
});

test("Cars Sort remains draft-only until Apply and then closes", () => {
  assert.match(quickSheet, /const \[draftSort,setDraftSort\]=useState<CarSort>\(sort\)/);
  assert.match(quickSheet, /onPress=\{\(\)=>\{mark\(\);setDraftSort\(option\.value\);\}\}/);
  assert.match(quickSheet, /if\(kind==="sort"\)onApplySort\(draftSort\);else[\s\S]*?onClose\(\);/);
});
