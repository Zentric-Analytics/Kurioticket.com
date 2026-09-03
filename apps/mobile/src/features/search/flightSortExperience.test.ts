import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const sheet = readFileSync("src/features/search/FlightSortSheet.tsx", "utf8");
const controls = readFileSync("src/features/search/FlightResultsQuickControls.tsx", "utf8");

test("the sort control opens the shared draft-based sheet", () => {
  assert.match(controls, /openSheet\("sort"\)/);
  assert.match(screen, /<FlightSortSheet visible=\{sortOpen\}/);
  assert.match(sheet, /<FlightResultsSheetShell/);
  assert.match(sheet, /accessibilityRole="radiogroup"/);
  assert.match(sheet, /accessibilityRole="radio" accessibilityState=\{\{ selected \}\}/);
});

test("sort changes remain draft state until Apply", () => {
  assert.match(sheet, /const \[draft, setDraft\] = useState\(sort\)/);
  assert.match(sheet, /onPress=\{\(\) => setDraft\(option\.value\)\}/);
  assert.match(sheet, /label="Apply sort"[\s\S]*?onApply\(draft\)/);
  assert.match(screen, /onApply=\{\(next\) => \{ setSort\(next\); setSortOpen\(false\); \}\}/);
});

test("sort sheet presents only Best, Cheapest, and Fastest", () => {
  for (const label of ["Best", "Cheapest", "Fastest"]) assert.match(sheet, new RegExp(`label: "${label}"`));
  assert.doesNotMatch(sheet, /Earliest departure|Latest departure/);
});
