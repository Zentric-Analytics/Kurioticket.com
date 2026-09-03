import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const panel = read("src/features/flow/HotelSearchPanel.tsx");
const dates = read("src/features/flow/DateRangeSheet.tsx");
const shell = read("src/features/flow/HotelResultsEditPickerShell.tsx");
const outer = read("src/features/search/HotelEditSearchModal.tsx");

test("Hotel Results Edit keeps its outer sheet and gates all full-screen children", () => {
  assert.match(outer, /<Modal transparent animationType="none"/);
  assert.match(outer, /<HotelSearchPanel[^>]+editAppearance/);
  assert.match(panel, /presentation=\{editAppearance \? "resultsEditFullScreen" : "sheet"\}/);
  assert.match(panel, /pickerPresentation=\{editAppearance \? "resultsEditFullScreen" : "sheet"\}/);
  assert.equal((panel.match(/editAppearance \? "resultsEditFullScreen" : "sheet"/g) ?? []).length, 3);
});

test("one opaque safe-area shell owns the three child editor presentations", () => {
  assert.match(shell, /transparent=\{false\}/);
  assert.match(shell, /presentationStyle="fullScreen"/);
  assert.match(shell, /animationType="slide"/);
  assert.match(shell, /edges=\{\["top", "bottom", "left", "right"\]\}/);
  assert.match(shell, /backgroundColor: ft\.colors\.surface/);
  assert.doesNotMatch(shell, /scrim|borderTopLeftRadius|borderTopRightRadius|SEARCH_PICKER_BACKDROP_COLOR/);
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

test("date and guest drafts commit only from their stable footer actions", () => {
  assert.match(dates, /presentation === "resultsEditFullScreen"[\s\S]*?footer=\{<PrimaryButton label="Done"/);
  assert.match(panel, /presentation === "resultsEditFullScreen"[\s\S]*?title="Guests & Rooms"[\s\S]*?footer=\{<PrimaryButton label="Done"/);
  assert.match(dates, /onBack=\{onCancel\}/);
  assert.match(panel, /title="Guests & Rooms" onBack=\{onCancel\}/);
});
