import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const sheet = readFileSync("src/features/search/FlightSortSheet.tsx", "utf8");
const shell = readFileSync("src/features/search/FlightResultsSheetShell.tsx", "utf8");
const controls = readFileSync("src/features/search/FlightResultsQuickControls.tsx", "utf8");

test("the sort control opens a compact web-parity menu", () => {
  assert.match(controls, /openSheet\("sort"\)/);
  assert.match(controls, /anchored[\s\S]*?onPress=\{\(\) => openSheet\("sort"\)\}/);
  assert.match(screen, /<FlightSortSheet visible=\{sortOpen\}/);
  assert.match(sheet, /compactMenu=\{\{ width: 190 \}\}/);
  assert.doesNotMatch(sheet, /compactMenu=\{\{[^}]*left:/);
  assert.match(shell, /animationType="fade"/);
  assert.match(shell, /styles\.compactMenu/);
  assert.match(shell, /borderColor: theme\.dark \? theme\.border : "#D8E1EC"/);
});

test("sort changes apply immediately like web mobile", () => {
  assert.doesNotMatch(sheet, /draft|setDraft|Apply sort/);
  assert.match(sheet, /onPress=\{\(\) => onApply\(option\.value\)\}/);
  assert.match(screen, /onApply=\{\(next\) => \{ setSort\(next\); setSortOpen\(false\); \}\}/);
});

test("sort quick menu presents only Best, Cheapest, and Fastest", () => {
  for (const label of ["Best", "Cheapest", "Fastest"]) assert.match(sheet, new RegExp(`label: "${label}"`));
  assert.doesNotMatch(sheet, /Earliest departure|Latest departure/);
});

test("selected sort row uses the web light-blue active treatment", () => {
  assert.match(sheet, /"#F7FAFF"/);
  assert.match(sheet, /"#004BB8"/);
  assert.match(sheet, /<Check/);
});
