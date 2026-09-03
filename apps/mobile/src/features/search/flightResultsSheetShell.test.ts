import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("src/features/search/FlightResultsSheetShell.tsx", "utf8");
const filter = readFileSync("src/features/search/FlightFilterSheet.tsx", "utf8");
const sort = readFileSync("src/features/search/FlightSortSheet.tsx", "utf8");

test("sort and filters share one safe-area-aware bottom-sheet shell", () => {
  assert.match(sort, /<FlightResultsSheetShell/);
  assert.match(filter, /<FlightResultsSheetShell/);
  assert.match(shell, /useSafeAreaInsets/);
  assert.match(shell, /paddingBottom: Math\.max\(inset\.bottom, 12\)/);
  assert.match(shell, /borderTopLeftRadius: 24/);
});

test("sheet supports backdrop, close-button, and Android-back dismissal", () => {
  assert.match(shell, /onRequestClose=\{onClose\}/);
  assert.match(shell, /StyleSheet\.absoluteFill/);
  assert.match(shell, /accessibilityLabel=\{closeLabel\}[\s\S]*?onPress=\{onClose\}/);
});

test("filter section entry is deterministic without pixel offsets", () => {
  assert.match(filter, /const full=section==="all"/);
  assert.match(filter, /full\|\|section==="stops"/);
  assert.match(filter, /full\|\|section==="airlines"/);
  assert.doesNotMatch(filter, /scrollTo\(\{\s*y:|setTimeout/);
});

test("filter dismissal discards and Apply commits draft once", () => {
  assert.match(filter, /if\(visible\)\{setDraft\(filters\)/);
  assert.match(filter, /footer=\{<Button label=\{`Apply/);
  assert.equal((filter.match(/onChange\(draft\)/g) ?? []).length, 1);
});
