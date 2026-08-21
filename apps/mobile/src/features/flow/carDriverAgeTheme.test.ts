import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/CarSearchPanel.tsx", "utf8");
const ageSheet = panel.slice(panel.indexOf("function AgeSheet"), panel.indexOf("const styles"));

test("Driver age sheet uses semantic theme colors for every sheet control", () => {
  assert.match(ageSheet, /backgroundColor: ft\.colors\.overlay/);
  assert.match(ageSheet, /backgroundColor: ft\.colors\.surface/);
  assert.match(ageSheet, /style=\{ft\.styles\.title\}>Driver age/);
  assert.match(ageSheet, /backgroundColor: ft\.colors\.input, borderColor: ft\.colors\.border/);
  assert.match(ageSheet, /color: ft\.colors\.icon/g);
  assert.match(ageSheet, /backgroundColor: ft\.colors\.input, color: ft\.colors\.text, borderColor: ft\.colors\.border/);
  assert.match(ageSheet, /selectionColor=\{ft\.colors\.selectedBorder\}/);
  assert.match(ageSheet, /styles\.link, \{ color: ft\.colors\.selectedBorder \}/);
  assert.match(ageSheet, /styles\.error, \{ color: ft\.colors\.red \}/);
  assert.doesNotMatch(ageSheet, /flowStyles\.title|flowColors\.navy/);
});

test("Driver age theme changes preserve commit, cancellation, and age rules", () => {
  assert.match(ageSheet, /parsed >= CAR_AGE\.min && parsed <= CAR_AGE\.max/);
  assert.match(ageSheet, /boundedAge\(valid \? parsed : CAR_AGE\.min, delta\)/);
  assert.match(ageSheet, /onRequestClose=\{onClose\}/);
  assert.match(ageSheet, /accessibilityLabel="Close driver age picker" onPress=\{onClose\}/);
  assert.match(ageSheet, /<PrimaryButton label="Done" icon="check" onPress=\{\(\) => \{ if \(valid\) onConfirm\(parsed\); \}\}\/?>/);
  assert.match(ageSheet, /<Pressable accessibilityRole="button" onPress=\{onClose\} style=\{styles\.cancel\}>/);
});
