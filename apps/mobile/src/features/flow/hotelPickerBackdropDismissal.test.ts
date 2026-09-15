import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/HotelSearchPanel.tsx", "utf8");
const calendar = readFileSync("src/features/flow/DateRangeSheet.tsx", "utf8");
const destination = panel.slice(panel.indexOf("export function HotelDestinationSheet"), panel.indexOf("type GuestsRoomsDraft"));
const guests = panel.slice(panel.indexOf("function HotelGuestsRoomsSheet"), panel.indexOf("function PickerRow"));

test("Hotel destination backdrop and Android Back dismiss the keyboard before cancelling", () => {
  assert.match(destination, /const dismissDestinationSheet = \(\) => \{ Keyboard\.dismiss\(\); onCancel\(\); \};/);
  assert.match(destination, /<Pressable style=\{StyleSheet\.absoluteFill\}[^>]+onPress=\{dismissDestinationSheet\}/);
  assert.match(destination, /<SafeAreaView pointerEvents=\{motion\.pointerEvents\}[^>]*>[\s\S]*?<Pressable[^>]+Close hotel destination picker[^>]*\/>\s*<Animated\.View accessibilityViewIsModal/);
  assert.doesNotMatch(destination, /<KeyboardAvoidingView pointerEvents=\{motion\.pointerEvents\}/);
  assert.doesNotMatch(destination, /pointerEvents="box-none"/);
  assert.match(destination, /onRequestClose=\{dismissDestinationSheet\}/);
});

test("Hotel date backdrop and Android Back cancel the shared range draft", () => {
  assert.ok(panel.includes("<DateRangeSheet") && panel.includes("onCancel={() => setDatesOpen(false)}"));
  assert.match(calendar, /onRequestClose=\{onCancel\}/);
  assert.match(calendar, /StyleSheet\.absoluteFill[^\n]+onPress=\{onCancel\}/);
  assert.match(calendar, /<Animated\.View accessibilityViewIsModal onLayout=\{motion\.onSheetLayout\} style=\{\[styles\.sheet, \{ backgroundColor: ft\.colors\.surface, paddingBottom: 16 \+ motion\.bottomSafeAreaInset \}, motion\.sheetStyle\]}>/);
});

test("Guests backdrop and Android Back cancel drafts while Done remains the only commit path", () => {
  assert.match(guests, /<Pressable style=\{StyleSheet\.absoluteFill\}[^>]+onPress=\{onCancel\}/);
  assert.match(guests, /onRequestClose=\{onCancel\}/);
  assert.match(guests, /<View[^>]+pointerEvents="box-none">\s*<Animated\.View accessibilityViewIsModal/);
  assert.match(guests, /<PrimaryButton label="Done" icon=\{null\} size="compact" onPress=\{\(\) => onDone\(draft\)\}\/>/);
  assert.doesNotMatch(guests, /StyleSheet\.absoluteFill[^\n]+onDone/);
});
