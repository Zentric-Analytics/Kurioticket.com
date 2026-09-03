import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const panel = read("src/features/flow/HotelSearchPanel.tsx");
const dates = read("src/features/flow/DateRangeSheet.tsx");
const shell = read("src/features/flow/HotelResultsEditPickerShell.tsx");
const outer = read("src/features/search/HotelEditSearchModal.tsx");

test("Hotel Results Edit keeps its outer sheet and routes every field to the shared full-screen presentation", () => {
  assert.match(outer, /<Modal transparent animationType="none"/);
  assert.match(outer, /<HotelSearchPanel[^>]+editAppearance/);
  assert.match(panel, /<DateRangeSheet[^>]+presentation=\{editAppearance \? "resultsEditFullScreen" : "sheet"\}/);
  assert.match(panel, /<HotelDestinationSheet[^>]+pickerPresentation=\{editAppearance \? "resultsEditFullScreen" : "sheet"\}/);
  assert.match(panel, /<HotelGuestsRoomsSheet[^>]+presentation=\{editAppearance \? "resultsEditFullScreen" : "sheet"\}/);
});

test("one opaque safe-area shell owns the three child editor presentations", () => {
  assert.match(shell, /transparent=\{false\}/);
  assert.match(shell, /presentationStyle="fullScreen"/);
  assert.match(shell, /visible=\{visible\}/);
  assert.match(shell, /animationType="none"/);
  assert.match(shell, /edges=\{\["top", "bottom", "left", "right"\]\}/);
  assert.match(shell, /backgroundColor: ft\.colors\.surface/);
  assert.doesNotMatch(shell, /scrim|borderTopLeftRadius|borderTopRightRadius|SEARCH_PICKER_BACKDROP_COLOR/);
  assert.doesNotMatch(shell, /Animated|translateY|backdropStyle|sheetStyle|motion\./);
  assert.equal((panel.match(/<HotelResultsEditPickerShell/g) ?? []).length, 2);
  assert.equal((dates.match(/<HotelResultsEditPickerShell/g) ?? []).length, 1);
});

test("child headers are balanced and Android Back returns to Edit", () => {
  assert.match(shell, /side:\{width:76/);
  assert.match(shell, /<View accessible=\{false\} style=\{styles\.side\}\/\>/);
  assert.match(shell, /textAlign:"center"/);
  assert.match(shell, /minHeight:62/);
  assert.match(shell, /onRequestClose=\{onBack\}/);
  assert.match(shell, /accessibilityLabel="Back to edit hotel search"/);
});

test("Results Edit destination retains current context and selection stays immediate", () => {
  assert.match(panel, /setQuery\(pickerPresentation === "resultsEditFullScreen" \? value : ""\)/);
  assert.match(panel, /onShow=\{\(\) => inputRef\.current\?\.focus\(\)\}/);
  assert.match(panel, /keyboardShouldPersistTaps="handled"/);
  assert.match(panel, /setDraft\(item\); setQuery\(item\.searchValue\)[\s\S]*?onChoose\(item\.searchValue\)/);
  assert.doesNotMatch(panel.slice(panel.indexOf("export function HotelDestinationSheet"), panel.indexOf("type GuestsRoomsDraft")), /<PrimaryButton label="Done"/);
});

test("full-screen children use direct visibility while ordinary sheets keep their motion lifecycle", () => {
  assert.match(panel, /const sheetVisible = pickerPresentation === "sheet" \? visible : false;[\s\S]*?useSearchPickerMotion\(sheetVisible/);
  assert.match(panel, /pickerPresentation === "resultsEditFullScreen"[\s\S]*?<HotelResultsEditPickerShell visible=\{visible\}/);
  assert.match(panel, /return <Modal transparent animationType="none" visible=\{motion\.rendered\}/);
  assert.match(panel, /motion\.backdropStyle[\s\S]*?motion\.sheetStyle/);
  assert.match(dates, /const sheetVisible = presentation === "sheet" \? visible : false;[\s\S]*?useSearchPickerMotion\(sheetVisible\)/);
  assert.ok(dates.indexOf('presentation === "resultsEditFullScreen"') < dates.indexOf("if (!motion.rendered) return null"));
  assert.match(dates, /if \(!motion\.rendered\) return null;[\s\S]*?motion\.backdropStyle[\s\S]*?motion\.sheetStyle/);
});

test("full-screen draft state is synchronized before native presentation paints", () => {
  assert.match(panel, /useLayoutEffect\(\(\) => \{[\s\S]*?setQuery\(pickerPresentation === "resultsEditFullScreen" \? value : ""\)/);
  assert.match(panel, /useLayoutEffect\(\(\) => \{ if \(visible\) setDraft\(\{ adults, children, rooms, petFriendly \}\)/);
  assert.match(dates, /useState\(startDate\)[\s\S]*?useState\(endDate\)[\s\S]*?useLayoutEffect/);
});

test("date and guest drafts commit only from their stable footer actions", () => {
  assert.match(dates, /presentation === "resultsEditFullScreen"[\s\S]*?footer=\{<PrimaryButton label="Done"/);
  assert.match(panel, /presentation === "resultsEditFullScreen"[\s\S]*?title="Guests & Rooms"[\s\S]*?footer=\{<PrimaryButton label="Done"/);
  assert.match(dates, /onBack=\{onCancel\}/);
  assert.match(panel, /title="Guests & Rooms" onBack=\{onCancel\}/);
  assert.match(panel, /onDone=\{\(draft\) => \{[\s\S]*?update\(\{ \.\.\.form, guests: draft\.adults \+ draft\.children, rooms: draft\.rooms \}\)[\s\S]*?setCountsOpen\(false\)/);
  assert.match(dates, /onPress=\{\(\) => onDone\(draftStart,draftEnd\)\}/);
});

test("each child Back action closes only that child and keeps the outer Edit sheet mounted", () => {
  assert.match(panel, /<DateRangeSheet[\s\S]*?onCancel=\{\(\) => setDatesOpen\(false\)\}\/?>/);
  assert.match(panel, /<HotelDestinationSheet[\s\S]*?onCancel=\{\(\) => setDestinationOpen\(false\)\}\/?>/);
  assert.match(panel, /<HotelGuestsRoomsSheet[\s\S]*?onCancel=\{\(\) => setCountsOpen\(false\)\}\/?>/);
  assert.match(shell, /onRequestClose=\{onBack\}/);
});
