import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const calendar = readFileSync("src/features/flow/LocalCalendarModal.tsx", "utf8");

test("shared calendar presentation follows the active flow theme", () => {
  assert.match(calendar, /import \{ useFlowTheme \} from "\.\/flowStyles"/);
  assert.match(calendar, /const ft = useFlowTheme\(\)/);
  assert.match(calendar, /backgroundColor: ft\.colors\.surface/);
  assert.match(calendar, /backgroundColor: ft\.colors\.overlay/g);
  assert.match(calendar, /style=\{ft\.styles\.title\}/);
  assert.doesNotMatch(calendar, /backgroundColor:\s*["']white["']/);
  assert.doesNotMatch(calendar, /#071A4866|flowColors\.(?:navy|muted)/);
});

test("calendar controls and date copy use semantic foregrounds and borders", () => {
  assert.match(calendar, /borderColor: ft\.colors\.border/g);
  assert.match(calendar, /styles\.controlText, \{ color: ft\.colors\.icon \}/g);
  assert.match(calendar, /styles\.month, \{ color: ft\.colors\.text \}/);
  assert.match(calendar, /styles\.weekday, \{ color: ft\.colors\.secondaryText \}/);
  assert.match(calendar, /styles\.dayText, \{ color: ft\.colors\.text \}/);
  assert.match(calendar, /styles\.closeText, \{ color: ft\.colors\.selectedBorder \}/);
});

test("calendar selection, disabled state, and backdrop default remain unchanged", () => {
  assert.match(calendar, /dismissOnBackdropPress = false/);
  assert.match(calendar, /const disabled = iso < minimum/);
  assert.match(calendar, /accessibilityState=\{\{ disabled, selected: chosen \}\}/);
  assert.match(calendar, /chosen && styles\.selectedDay/);
  assert.match(calendar, /backgroundColor: ft\.colors\.blue, borderColor: ft\.colors\.selectedBorder/);
  assert.match(calendar, /selectedText:\{color:"white",fontWeight:"800"\}/);
  assert.match(calendar, /disabled:\{opacity:\.35\}/);
});
