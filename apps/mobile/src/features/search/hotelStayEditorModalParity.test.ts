import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/HotelStayEditor.tsx", "utf8");
const dateSheet = readFileSync("src/features/flow/DateRangeSheet.tsx", "utf8");

test("iOS waits for the stay editor modal to dismiss before opening a picker", () => {
  assert.match(source, /type StayEditorTarget = "dates" \| "counts";/);
  assert.match(source, /const \[pendingEditor, setPendingEditor\] = useState<StayEditorTarget \| null>\(null\);/);
  assert.match(source, /setPendingEditor\(target\);\s*setEditorOpen\(false\);/);
  assert.match(source, /if \(Platform\.OS !== "ios"\) \{[\s\S]*?requestAnimationFrame/);
  assert.match(source, /const finishEditorDismiss = \(\) => \{\s*if \(Platform\.OS !== "ios" \|\| !pendingEditor\) return;[\s\S]*?launchEditor\(pendingEditor\);/);
  assert.match(source, /onDismiss=\{finishEditorDismiss\}/);
  assert.match(source, /<Modal[^>]*onDismiss=\{onDismiss\}/);
});

test("date Done returns to Edit stay only after the date sheet has actually closed", () => {
  assert.match(source, /type ApplyStayResult = "unchanged" \| "updated" \| "failed";/);
  assert.match(source, /return "unchanged";/);
  assert.match(source, /hotelStayEditor: reopenEditorAfterUpdate \? "1" : ""/);
  assert.match(source, /if \(reopenEditorParam !== "1"\) return;\s*setEditorOpen\(true\);\s*router\.setParams\(\{ hotelStayEditor: "" \}\);/);
  assert.match(source, /const pendingDatesApply = useRef<\{ checkIn: string; checkOut: string \} \| null>\(null\);/);
  assert.match(source, /const datesReturnToEditor = useRef\(false\);/);
  assert.match(source, /const finishDates = \(nextCheckIn: string, nextCheckOut: string\) => \{\s*pendingDatesApply\.current = \{ checkIn: nextCheckIn, checkOut: nextCheckOut \};\s*datesReturnToEditor\.current = true;\s*setDatesOpen\(false\);/);
  assert.match(source, /const finishDatesDismiss = \(\) => \{\s*if \(!datesReturnToEditor\.current\) return;[\s\S]*?applyStay\([\s\S]*?true,[\s\S]*?\)\.then\(\(outcome\) => \{[\s\S]*?if \(outcome !== "updated"\) setEditorOpen\(true\);/);
  assert.match(source, /onDone=\{finishDates\}/);
  assert.match(source, /onCancel=\{closeDatesToEditor\}/);
  assert.match(source, /onDismiss=\{finishDatesDismiss\}/);
  assert.doesNotMatch(source, /SEARCH_PICKER_CLOSE_DURATION_MS|datesDismissTimer|setTimeout/);

  assert.match(dateSheet, /onDismiss\?: \(\) => void;/);
  assert.match(dateSheet, /const sheetWasPresented = useRef\(false\);/);
  assert.match(dateSheet, /if \(motion\.rendered\) \{[\s\S]*?sheetWasPresented\.current = true;/);
  assert.match(dateSheet, /if \(!visible && sheetWasPresented\.current && !dismissNotified\.current\) \{[\s\S]*?onDismiss\?\.\(\);/);
  assert.match(dateSheet, /if \(!motion\.rendered\) return null;/);
});

test("rooms and guests also returns to Edit stay after Done or cancel", () => {
  assert.match(source, /const countsReturnToEditor = useRef\(false\);/);
  assert.match(source, /const closeCountsToEditor = \(\) => \{[\s\S]*?countsReturnToEditor\.current = true;[\s\S]*?setCountsOpen\(false\);/);
  assert.match(source, /const finishCounts = \(nextGuests: number, nextRooms: number\) => \{[\s\S]*?pendingCountsApply\.current = \{ guests: nextGuests, rooms: nextRooms \};[\s\S]*?countsReturnToEditor\.current = true;[\s\S]*?setCountsOpen\(false\);/);
  assert.match(source, /onCancel=\{closeCountsToEditor\}/);
  assert.match(source, /onDismiss=\{finishCountsDismiss\}/);
  assert.match(source, /onDone=\{finishCounts\}/);
});