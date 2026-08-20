import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/HotelSearchPanel.tsx", "utf8");
const api = readFileSync("src/api/travelApi.ts", "utf8");
const sheet = panel.slice(panel.indexOf("function HotelDestinationSheet"), panel.indexOf("type GuestsRoomsDraft"));

test("the Hotel destination field launches a dedicated searchable picker", () => {
  assert.match(panel, /onPress=\{\(\) => setDestinationOpen\(true\)\}/);
  assert.match(panel, /<HotelDestinationSheet visible=\{destinationOpen\}/);
  assert.match(sheet, /accessibilityLabel="Search hotel destinations"/);
  assert.match(sheet, /placeholder="City, area, or hotel"/);
  assert.match(sheet, /autoFocus/);
});

test("destination suggestions use the shared native API client with the web contract", () => {
  assert.match(api, /searchHotelDestinations:/);
  assert.match(api, /\/api\/hotels\/destinations\?\$\{params\.toString\(\)\}/);
  assert.match(api, /limit: String\(options\.limit \?\? 8\)/);
  assert.match(api, /params\.set\("locale", options\.locale\)/);
  assert.doesNotMatch(sheet, /fetch\(/);
});

test("search is debounced, cancellable, and guarded against stale responses", () => {
  assert.match(sheet, /setTimeout\(async \(\) => \{/);
  assert.match(sheet, /\}, 180\)/);
  assert.match(sheet, /const controller = new AbortController\(\)/);
  assert.match(sheet, /controller\.abort\(\)/);
  assert.match(sheet, /sequence !== requestSequence\.current/);
});

test("the picker keeps draft selection, clear, Done, and cancellation semantics", () => {
  assert.match(sheet, /setDraft\(item\.searchValue\)/);
  assert.match(sheet, /setQuery\(item\.searchValue\)/);
  assert.match(sheet, /const clear = \(\) => \{ setQuery\(""\); setDraft\(""\)/);
  assert.match(sheet, /label="Done" onPress=\{\(\) => onDone\(draft\.trim\(\)\)\}/);
  assert.match(sheet, /onRequestClose=\{onCancel\}/);
  assert.match(sheet, /accessibilityLabel="Close hotel destination picker"/);
});

test("rows show destination names and region/country detail with recoverable states", () => {
  assert.match(sheet, /\{item\.name\}/);
  assert.match(sheet, /item\.region \? `\$\{item\.region\} · \$\{item\.country\}` : item\.country/);
  assert.match(sheet, /Finding destinations…/);
  assert.match(sheet, /No matching destinations yet/);
  assert.match(sheet, /Couldn’t load destinations\. Please try again\./);
});

test("the native sheet is keyboard-aware, safe-area-aware, and scrollable", () => {
  assert.match(sheet, /<KeyboardAvoidingView/);
  assert.match(sheet, /behavior=\{Platform\.OS === "ios" \? "padding" : "height"\}/);
  assert.match(sheet, /<SafeAreaView edges=\{\["top", "bottom"\]\}/);
  assert.match(sheet, /<FlatList keyboardShouldPersistTaps="handled"/);
  assert.doesNotMatch(sheet, /keyboardHeight|Dimensions\.get|useWindowDimensions/);
});
