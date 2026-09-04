import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("src/features/search/FlightResultsSheetShell.tsx", "utf8");
const filter = readFileSync("src/features/search/FlightFilterSheet.tsx", "utf8");
const sort = readFileSync("src/features/search/FlightSortSheet.tsx", "utf8");
const controls = readFileSync("src/features/search/FlightResultsQuickControls.tsx", "utf8");
const anchor = readFileSync("src/features/search/flightResultsQuickMenuAnchor.ts", "utf8");

test("sort and focused filters share one shell while full filters use its safe-area full-screen mode", () => {
  assert.match(sort, /<FlightResultsSheetShell/);
  assert.match(filter, /<FlightResultsSheetShell/);
  assert.match(shell, /useSafeAreaInsets/);
  assert.match(shell, /paddingBottom: Math\.max\(inset\.bottom, 12\)/);
  assert.match(shell, /borderTopLeftRadius: 24/);
  assert.match(filter, /fullScreen=\{full\}/);
  assert.match(shell, /presentationStyle=\{fullScreen \? "fullScreen"/);
});

test("sheet supports backdrop, close-button, and Android-back dismissal", () => {
  assert.match(shell, /onRequestClose=\{onClose\}/);
  assert.match(shell, /StyleSheet\.absoluteFill/);
  assert.match(shell, /accessibilityLabel=\{closeLabel\}[\s\S]*?onPress=\{onClose\}/);
});

test("filter section entry is deterministic without static menu offsets", () => {
  assert.match(filter, /const full=section==="all"/);
  assert.match(filter, /full\|\|section==="stops"/);
  assert.match(filter, /full\|\|section==="airlines"/);
  assert.doesNotMatch(filter, /\{left:\d+,width:/);
  assert.doesNotMatch(filter, /scrollTo\(\{\s*y:|setTimeout/);
});

test("compact quick menus anchor to the actual pressed control", () => {
  assert.match(controls, /measureInWindow\(\(x, y, width, height\) =>/);
  assert.match(controls, /setFlightResultsQuickMenuAnchor\(\{ x, y, width, height \}\)/);
  assert.match(anchor, /let currentAnchor:/);
  assert.match(shell, /getFlightResultsQuickMenuAnchor\(\)/);
  assert.match(shell, /compactAnchor \? compactAnchor\.y \+ compactAnchor\.height \+ 6/);
  assert.match(shell, /compactAnchor\?\.x \?\? 12/);
  assert.match(shell, /windowWidth - compactWidth - 12/);
  assert.doesNotMatch(sort, /left:\s*\d+/);
});

test("compact menu light surface matches web white while dark mode stays semantic", () => {
  assert.match(shell, /backgroundColor: theme\.dark \? theme\.surface : "#FFFFFF"/);
  assert.match(shell, /borderColor: theme\.dark \? theme\.border : "#D8E1EC"/);
});

test("filter dismissal retains Web-style live edits while Done closes once", () => {
  assert.doesNotMatch(filter, /setDraft|onChange\(draft\)/);
  assert.match(filter, /footer=\{full\?[\s\S]*?<Button label="Done"/);
  assert.match(filter, /const close=\(\)=>\{setDragging\(false\);onClose\(\)\}/);
});
