import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/CarSearchPanel.tsx", "utf8");
const ageSheet = panel.slice(panel.indexOf("const DRIVER_AGES"), panel.indexOf("const styles"));

test("native Driver age options derive exactly from the numeric model bounds", () => {
  assert.match(ageSheet, /Array\.from\(\{ length: CAR_AGE\.max - CAR_AGE\.min \+ 1 \}, \(_, index\) => CAR_AGE\.min \+ index\)/);
  assert.doesNotMatch(ageSheet, /Any age|18-70/);
});

test("Driver age sheet is a themed, accessible single-choice list", () => {
  assert.match(ageSheet, /<FlatList/);
  assert.equal((ageSheet.match(/<FlatList /g) ?? []).length, 1);
  assert.match(ageSheet, /accessibilityRole="radiogroup" accessibilityLabel="Driver age options"/);
  assert.match(ageSheet, /accessibilityRole="radio" accessibilityLabel=\{label\} accessibilityState=\{\{ selected \}\}/);
  assert.match(ageSheet, /<FlowIcon name="check" color="white"/);
  assert.match(ageSheet, /backgroundColor: ft\.colors\.surface/);
  assert.match(ageSheet, /borderBottomColor: ft\.colors\.border/);
  assert.match(ageSheet, /backgroundColor: ft\.colors\.selected/);
  assert.match(ageSheet, /color: ft\.colors\.selectedPrimaryText/);
  assert.match(ageSheet, /ft\.colors\.selectedBorder/);
  assert.doesNotMatch(ageSheet, /flowColors\.navy/);
});

test("Driver age selection is draft-only until enabled Done commits it", () => {
  assert.match(ageSheet, /useState<number \| undefined>\(age\)/);
  assert.match(ageSheet, /if \(!visible\) return;\s*setDraftAge\(age\)/);
  assert.match(ageSheet, /onPress=\{\(\) => setDraftAge\(item\)\}/);
  assert.match(ageSheet, /disabled=\{draftAge === undefined\}/);
  assert.match(ageSheet, /if \(draftAge !== undefined\) onConfirm\(draftAge\)/);
  assert.match(ageSheet, /onRequestClose=\{onClose\}/);
  assert.match(ageSheet, /accessibilityLabel="Close driver age picker" onPress=\{onClose\}/);
});

test("Driver age sheet removes free entry, counter controls, and keyboard interaction", () => {
  assert.doesNotMatch(ageSheet, /TextInput|number-pad|Decrease driver age|Increase driver age|boundedAge|change\(delta|parsed/);
});

test("Driver age list positions valid committed selections deterministically", () => {
  assert.match(ageSheet, /DRIVER_AGES\.indexOf\(age\)/);
  assert.match(ageSheet, /requestAnimationFrame/);
  assert.match(ageSheet, /scrollToIndex\(\{ index: selectedIndex, animated: false, viewPosition: 0\.5 \}\)/);
  assert.match(ageSheet, /getItemLayout=/);
  assert.match(ageSheet, /onScrollToIndexFailed=/);
  assert.doesNotMatch(ageSheet, /setTimeout/);
});


test("Driver age Done is iconless while the selected-age indicator remains", () => {
  assert.match(ageSheet, /<PrimaryButton label="Done" icon=\{null\} disabled=\{draftAge === undefined\}/);
  assert.match(ageSheet, /selected \? <FlowIcon name="check"/);
});
