import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/HotelStayEditor.tsx", "utf8");
const dateSheet = readFileSync("src/features/flow/DateRangeSheet.tsx", "utf8");

test("hotel stay editing keeps one native modal mounted while switching child views", () => {
  assert.match(source, /type StayEditorView = "menu" \| "dates" \| "counts";/);
  assert.match(source, /const \[editorView, setEditorView\] = useState<StayEditorView>\("menu"\);/);
  assert.match(source, /<Modal[\s\S]*visible=\{editorOpen\}[\s\S]*animationType="slide"/);
  assert.match(source, /editorView === "menu"/);
  assert.match(source, /editorView === "dates"/);
  assert.match(source, /editorView === "counts"/);
  assert.match(source, /onEditDates=\{\(\) => setEditorView\("dates"\)\}/);
  assert.match(source, /onEditCounts=\{openCounts\}/);
  assert.doesNotMatch(source, /pendingEditor|finishEditorDismiss|datesOpen|countsOpen|HotelStayCountsSheet/);
});

test("date Done returns to Edit stay inside the same modal without exposing Hotel Details", () => {
  assert.match(source, /const finishDates = \(nextCheckIn: string, nextCheckOut: string\) => \{\s*setEditorView\("menu"\);[\s\S]*?applyStay\(/);
  assert.match(source, /presentation="embedded"/);
  assert.match(source, /onDone=\{finishDates\}/);
  assert.match(source, /onCancel=\{\(\) => setEditorView\("menu"\)\}/);
  assert.doesNotMatch(source, /onDismiss=\{finishDatesDismiss\}|datesReturnToEditor|pendingDatesApply/);
  assert.match(dateSheet, /presentation\?: "sheet" \| "resultsEditFullScreen" \| "embedded";/);
  assert.match(dateSheet, /if \(presentation === "embedded"\) \{[\s\S]*?if \(!visible\) return null;[\s\S]*?<PickerSheetHeader title=\{title\} onClose=\{onCancel\}/);
});

test("rooms and guests Done returns to Edit stay inside the same modal", () => {
  assert.match(source, /const finishCounts = \(\) => \{[\s\S]*?setEditorView\("menu"\);[\s\S]*?applyStay\(/);
  assert.match(source, /<HotelStayCountsEditor[\s\S]*?onCancel=\{\(\) => setEditorView\("menu"\)\}[\s\S]*?onDone=\{finishCounts\}/);
  assert.doesNotMatch(source, /countsReturnToEditor|pendingCountsApply|finishCountsDismiss/);
});

test("existing standalone date sheets keep their native dismissal contract", () => {
  assert.match(dateSheet, /onDismiss\?: \(\) => void;/);
  assert.match(dateSheet, /const sheetWasPresented = useRef\(false\);/);
  assert.match(dateSheet, /const handleNativeDismiss = \(\) => \{/);
  assert.match(dateSheet, /<Modal transparent animationType="none" visible=\{motion\.rendered\} onRequestClose=\{onCancel\} onDismiss=\{handleNativeDismiss\}>/);
});