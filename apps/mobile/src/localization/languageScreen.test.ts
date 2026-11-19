import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mobileLocaleCodes, mobileLocales } from "./mobileLocalizationCatalog";

const source = readFileSync("app/language.tsx", "utf8");
const expectedLocaleOrder = [
  "en-us", "es-es", "fr", "de-de", "it-it", "pt-br", "nl", "ar", "zh-cn",
  "ja", "ko", "hi", "tr", "pl", "sv", "id", "th", "vi",
];

test("Language screen renders all locale rows from the shared catalog in a ScrollView", () => {
  assert.equal(mobileLocales.length, 18);
  assert.match(source, /<ScrollView/);
  assert.match(source, /mobileLocales\.map\(\(option\) =>/);
});

test("locale presentation metadata includes every flag and readable description", () => {
  for (const locale of mobileLocales) {
    assert.ok(locale.flag, `${locale.code} should have a flag`);
    assert.ok(locale.countryCode, `${locale.code} should have a country mapping`);
    assert.ok(locale.description, `${locale.code} should have a description`);
  }
  assert.deepEqual(mobileLocales.map(({ code }) => code), expectedLocaleOrder);
  assert.deepEqual([...mobileLocaleCodes], expectedLocaleOrder);
});

test("Language rows use separators without a large enclosing card", () => {
  assert.match(source, /contentContainerStyle=\{styles\.list\}/);
  assert.match(source, /borderBottomWidth: StyleSheet\.hairlineWidth/);
  assert.doesNotMatch(source, /borderRadius/);
  assert.doesNotMatch(source, /overflow: "hidden"/);
  assert.doesNotMatch(source, /contentContainerStyle=\{\[styles\.card/);
});

test("selected Language row remains immediate, highlighted, and accessible", () => {
  assert.match(source, /accessibilityRole="radio"/);
  assert.match(source, /accessibilityLabel=\{`\$\{option\.label\}, \$\{option\.description\}\$\{selected \? ", selected" : ""\}`\}/);
  assert.match(source, /accessibilityState=\{\{ checked: selected \}\}/);
  assert.match(source, /onPress=\{\(\) => void setLocale\(option\.code\)\}/);
  assert.match(source, /selected && \{ backgroundColor: theme\.priceAlertSurface \}/);
  assert.match(source, /selected \? <FlowIcon name="check" color="#0754F7" \/> : null/);
});

test("Language screen has no Save or Reset action", () => {
  assert.doesNotMatch(source, /t\("save"\)|t\("saveChanges"\)/);
  assert.doesNotMatch(source, /t\("reset"\)/);
});
