import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../app/language.tsx", import.meta.url), "utf8");

test("Language screen renders the shared locale catalog in a ScrollView", () => {
  assert.match(source, /<ScrollView/);
  assert.match(source, /mobileLocales\.map\(option=>/);
  assert.doesNotMatch(source, /\[\s*["']en-us["']\s*,\s*["']es-es["']\s*\]/);
});

test("Language selection remains immediate and accessible", () => {
  assert.match(source, /accessibilityRole="radio"/);
  assert.match(source, /accessibilityState=\{\{checked:locale===option\.code\}\}/);
  assert.match(source, /onPress=\{\(\)=>void setLocale\(option\.code\)\}/);
  assert.match(source, /locale===option\.code\?<FlowIcon name="check" color="#0754F7"\/>/);
});
