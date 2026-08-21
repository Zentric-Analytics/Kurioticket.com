import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/HotelSearchPanel.tsx", "utf8");
const calendar = readFileSync("src/features/flow/DateRangeSheet.tsx", "utf8");
const destination = panel.slice(panel.indexOf("export function HotelDestinationSheet"), panel.indexOf("type GuestsRoomsDraft"));
const guests = panel.slice(panel.indexOf("function HotelGuestsRoomsSheet"), panel.indexOf("function PickerRow"));

test("Hotel destination backdrop and sheet share the keyboard-adjusted viewport", () => {
  assert.match(destination, /<Pressable style=\{\[StyleSheet\.absoluteFill,[^>]+onPress=\{onCancel\}/);
  assert.match(destination, /<KeyboardAvoidingView[^>]*>\s*<SafeAreaView[^>]*>\s*<Pressable[^>]+Close hotel destination picker[^>]*\/>\s*<View accessibilityViewIsModal/);
  assert.ok(destination.indexOf("<KeyboardAvoidingView") < destination.indexOf('accessibilityLabel="Close hotel destination picker"'));
  assert.doesNotMatch(destination, /pointerEvents="box-none"/);
  assert.match(destination, /onRequestClose=\{onCancel\}/);
});

test("Hotel date backdrop and Android Back cancel the shared range draft", () => {
  assert.ok(panel.includes("<DateRangeSheet") && panel.includes("onCancel={() => setDatesOpen(false)}"));
  assert.match(calendar, /onRequestClose=\{onCancel\}/);
  assert.match(calendar, /StyleSheet\.absoluteFill[^\n]+onPress=\{onCancel\}/);
  assert.match(calendar, /<View accessibilityViewIsModal style=\{\[styles\.sheet, \{ backgroundColor: ft\.colors\.surface \}\]\}>/);
});

test("Guests backdrop and Android Back cancel drafts while Done remains the only commit path", () => {
  assert.match(guests, /<Pressable style=\{\[StyleSheet\.absoluteFill,[^>]+onPress=\{onCancel\}/);
  assert.match(guests, /onRequestClose=\{onCancel\}/);
  assert.match(guests, /<SafeAreaView[^>]+pointerEvents="box-none">\s*<View accessibilityViewIsModal/);
  assert.match(guests, /<PrimaryButton label="Done" icon=\{null\} onPress=\{\(\) => onDone\(draft\)\}\/>/);
  assert.doesNotMatch(guests, /StyleSheet\.absoluteFill[^\n]+onDone/);
});
