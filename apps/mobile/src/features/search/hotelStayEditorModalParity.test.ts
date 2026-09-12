import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/HotelStayEditor.tsx", "utf8");

test("iOS waits for the stay editor modal to dismiss before opening a picker", () => {
  assert.match(source, /type StayEditorTarget = "dates" \| "counts";/);
  assert.match(source, /const \[pendingEditor, setPendingEditor\] = useState<StayEditorTarget \| null>\(null\);/);
  assert.match(source, /setPendingEditor\(target\);\s*setEditorOpen\(false\);/);
  assert.match(source, /if \(Platform\.OS !== "ios"\) \{[\s\S]*?requestAnimationFrame/);
  assert.match(source, /const finishEditorDismiss = \(\) => \{\s*if \(Platform\.OS !== "ios" \|\| !pendingEditor\) return;[\s\S]*?launchEditor\(pendingEditor\);/);
  assert.match(source, /onDismiss=\{finishEditorDismiss\}/);
  assert.match(source, /<Modal[^>]*onDismiss=\{onDismiss\}/);
});
