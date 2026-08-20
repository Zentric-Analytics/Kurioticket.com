import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/CarSearchPanel.tsx", "utf8");
const pickers = readFileSync("src/features/flow/CarSearchPickers.tsx", "utf8");
const ageSheet = panel.slice(panel.indexOf("function AgeSheet"), panel.indexOf("const styles"));

test("rental date and time backdrops cancel drafts while Done commits", () => {
  assert.match(pickers, /accessibilityLabel="Cancel rental date changes" onPress=\{onCancel\}/);
  assert.match(pickers, /onPress=\{\(\)=>onDone\(draftPickup,draftReturn\)\}/);
  assert.match(pickers, /accessibilityLabel="Cancel time changes" onPress=\{onCancel\}/);
  assert.match(pickers, /onRequestClose=\{onCancel\}/g);
  for (const label of ["Cancel rental date changes", "Cancel time changes"]) {
    const start = pickers.indexOf(`accessibilityLabel="${label}"`);
    const end = pickers.indexOf("/>", start);
    assert.doesNotMatch(pickers.slice(start, end), /onDone/);
  }
});

test("driver age backdrop and sheet are siblings and close without confirming", () => {
  const backdrop = ageSheet.indexOf('accessibilityLabel="Close driver age picker"');
  const sheet = ageSheet.indexOf("<View accessibilityViewIsModal");

  assert.ok(backdrop >= 0 && sheet > backdrop);
  assert.match(ageSheet, /<View style=\{styles\.modalRoot\}><Pressable[^>]+onPress=\{onClose\}\/?>/);
  assert.match(ageSheet, /<SafeAreaView[^>]+pointerEvents="box-none"><View accessibilityViewIsModal/);
  assert.match(ageSheet, /onRequestClose=\{onClose\}/);
  assert.doesNotMatch(ageSheet.slice(ageSheet.indexOf("<Modal"), sheet), /<Pressable[^>]*>\s*<Pressable/);
});

test("driver age Done remains the only draft commit path", () => {
  assert.ok(ageSheet.includes('<PrimaryButton label="Done" icon="check" onPress={() => { if (valid) onConfirm(parsed); }}/>'));
  const backdrop = ageSheet.slice(ageSheet.indexOf('accessibilityLabel="Close driver age picker"'), ageSheet.indexOf("/>", ageSheet.indexOf('accessibilityLabel="Close driver age picker"')));
  assert.doesNotMatch(backdrop, /onConfirm/);
});
