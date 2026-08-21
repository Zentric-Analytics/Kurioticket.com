import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { selectDateRange } from "./dateRangeModel";

const sheet = readFileSync("src/features/flow/DateRangeSheet.tsx", "utf8");

test("range selection supports Cars same-day and strict travel ranges", () => {
  assert.deepEqual(selectDateRange("", "", "2026-08-24", false), { startDate: "2026-08-24", endDate: "" });
  assert.deepEqual(selectDateRange("2026-08-24", "", "2026-08-24", false), { startDate: "2026-08-24", endDate: "2026-08-24" });
  assert.deepEqual(selectDateRange("2026-08-24", "", "2026-08-24", true), { startDate: "2026-08-24", endDate: "" });
  assert.deepEqual(selectDateRange("2026-08-24", "", "2026-08-29", true), { startDate: "2026-08-24", endDate: "2026-08-29" });
  assert.deepEqual(selectDateRange("2026-08-24", "2026-08-29", "2026-08-26", true), { startDate: "2026-08-26", endDate: "" });
});

test("sheet initializes draft state and Done is the only commit path", () => {
  assert.match(sheet, /if \(visible\) \{ setDraftStart\(startDate\); setDraftEnd\(endDate\); setMonthOffset\(0\); \}/);
  assert.match(sheet, /icon=\{null\} disabled=\{!valid\} onPress=\{\(\) => onDone\(draftStart,draftEnd\)\}/);
  assert.match(sheet, /onRequestClose=\{onCancel\}/);
  assert.match(sheet, /StyleSheet\.absoluteFill[^\n]+onPress=\{onCancel\}/);
  assert.match(sheet, /inRange&&\{backgroundColor:ft\.colors\.selected\}/);
  assert.match(sheet, /selected&&\{backgroundColor:ft\.colors\.selectedBorder\}/);
  assert.doesNotMatch(sheet, /height:\s*\d{3}/);
});

test("sheet uses semantic theme colors, accessible controls, and horizontal flexible values", () => {
  for (const token of ["surface", "overlay", "text", "secondaryText", "border", "selected", "selectedBorder"]) assert.match(sheet, new RegExp(`ft\\.colors\\.${token}`));
  assert.match(sheet, /accessibilityViewIsModal/);
  assert.match(sheet, /accessibilityState=\{\{disabled,selected\}\}/);
  assert.match(sheet, /rangeHeader:\{flexDirection:"row"/);
  assert.match(sheet, /rangeValue:\{flex:1,minWidth:0/);
});
