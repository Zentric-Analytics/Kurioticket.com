import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync("src/features/search/HotelPriceAlert.tsx", "utf8");
test("Flight keeps its compact native switch and expanded touch target", () => {
  assert.match(source, /hitSlop=\{flight \? 6 : undefined\}/);
  assert.match(source, /style=\{Platform.OS === "ios" \? styles.switchIos : undefined\}/);
  assert.match(source, /switchSlot: \{ minWidth: 51, minHeight: 44/);
  assert.doesNotMatch(source, />On<|>Off</);
});
test("Hotel retains its switch appearance without Flight's additional hit area", () => {
  assert.match(source, /product = "hotel"/);
  assert.match(source, /hitSlop=\{flight \? 6 : undefined\}/);
  assert.match(source, /switchIos: \{ transform: \[\{ translateY: 8 \}\]/);
});
