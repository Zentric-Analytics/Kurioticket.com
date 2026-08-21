import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/HotelSearchPanel.tsx", "utf8");
const calendar = readFileSync("src/features/flow/LocalCalendarModal.tsx", "utf8");
const destination = panel.slice(panel.indexOf("export function HotelDestinationSheet"), panel.indexOf("type GuestsRoomsDraft"));
const guests = panel.slice(panel.indexOf("function HotelGuestsRoomsSheet"), panel.indexOf("function PickerRow"));

test("Hotel destination backdrop and sheet share the keyboard-adjusted viewport", () => {
  assert.match(destination, /<Pressable style=\{\[StyleSheet\.absoluteFill,[^>]+onPress=\{onCancel\}/);
  assert.match(destination, /<KeyboardAvoidingView[^>]*>\s*<SafeAreaView[^>]*>\s*<Pressable[^>]+Close hotel destination picker[^>]*\/>\s*<View accessibilityViewIsModal/);
  assert.ok(destination.indexOf("<KeyboardAvoidingView") < destination.indexOf('accessibilityLabel="Close hotel destination picker"'));
  assert.doesNotMatch(destination, /pointerEvents="box-none"/);
  assert.match(destination, /onRequestClose=\{onCancel\}/);
});

test("Hotels explicitly opt into calendar backdrop dismissal without changing the shared default", () => {
  assert.match(panel, /<LocalCalendarModal[^>]+onClose=\{\(\) => setCalendar\(undefined\)\} dismissOnBackdropPress\/>/);
  assert.match(calendar, /dismissOnBackdropPress = false/);
  assert.match(calendar, /dismissOnBackdropPress \? <Pressable[^>]+onPress=\{onClose\}/);
  assert.match(calendar, /onRequestClose=\{onClose\}/);
  assert.match(calendar, /<View accessibilityViewIsModal style=\{\[styles\.modal, \{ backgroundColor: ft\.colors\.surface \}\]\}>/);
});

test("Guests backdrop and Android Back cancel drafts while Done remains the only commit path", () => {
  assert.match(guests, /<Pressable style=\{\[StyleSheet\.absoluteFill,[^>]+onPress=\{onCancel\}/);
  assert.match(guests, /onRequestClose=\{onCancel\}/);
  assert.match(guests, /<SafeAreaView[^>]+pointerEvents="box-none">\s*<View accessibilityViewIsModal/);
  assert.match(guests, /<PrimaryButton label="Done" onPress=\{\(\) => onDone\(draft\)\}\/>/);
  assert.doesNotMatch(guests, /StyleSheet\.absoluteFill[^\n]+onDone/);
});
