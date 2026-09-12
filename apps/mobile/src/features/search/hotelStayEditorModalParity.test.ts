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

test("date Done returns to Edit stay instead of collapsing the whole flow", () => {
  assert.match(source, /type ApplyStayResult = "unchanged" \| "updated" \| "failed";/);
  assert.match(source, /return "unchanged";/);
  assert.match(source, /hotelStayEditor: reopenEditorAfterUpdate \? "1" : ""/);
  assert.match(source, /if \(reopenEditorParam !== "1"\) return;\s*setEditorOpen\(true\);\s*router\.setParams\(\{ hotelStayEditor: "" \}\);/);
  assert.match(source, /const finishDates = \(nextCheckIn: string, nextCheckOut: string\) => \{\s*setDatesOpen\(false\);[\s\S]*?applyStay\([\s\S]*?true,[\s\S]*?\)\.then\(\(outcome\) => \{\s*if \(outcome !== "updated"\) setEditorOpen\(true\);/);
  assert.match(source, /onDone=\{finishDates\}/);
});

test("rooms and guests also returns to Edit stay after Done or cancel", () => {
  assert.match(source, /const countsReturnToEditor = useRef\(false\);/);
  assert.match(source, /const closeCountsToEditor = \(\) => \{[\s\S]*?countsReturnToEditor\.current = true;[\s\S]*?setCountsOpen\(false\);/);
  assert.match(source, /const finishCounts = \(nextGuests: number, nextRooms: number\) => \{[\s\S]*?pendingCountsApply\.current = \{ guests: nextGuests, rooms: nextRooms \};[\s\S]*?countsReturnToEditor\.current = true;[\s\S]*?setCountsOpen\(false\);/);
  assert.match(source, /onCancel=\{closeCountsToEditor\}/);
  assert.match(source, /onDismiss=\{finishCountsDismiss\}/);
  assert.match(source, /onDone=\{finishCounts\}/);
});