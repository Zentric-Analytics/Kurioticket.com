import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const quick = readFileSync(
  "src/features/personal-details/PersonalDetailsQuickEditor.tsx",
  "utf8",
).replace(/\r\n/g, "\n");

test("quick selections remain drafts and only the explicit shared Save persists", () => {
  assert.match(quick, /onGenderChange\(value\)/);
  assert.match(quick, /onNationalityChange\(item\.value\)/);
  assert.match(quick, /<PersonalDetailsSaveButton[\s\S]*?onSave=\{onSave\}/);
  assert.doesNotMatch(quick, /travelApi|fetch\(|onSave\(\)/);
  assert.match(quick, /disabled=\{saving\}/);
  assert.match(quick, /onRequestClose=\{onClose\}/);
});

test("nationality results take remaining space while Save stays outside the list", () => {
  const results = quick.indexOf("data={shown}");
  const footer = quick.indexOf("style={s.footer}");
  assert.ok(results > 0 && footer > results);
  assert.match(
    quick.slice(quick.lastIndexOf("<FlatList", results), results),
    /style=\{\{ flex: 1 \}\}/,
  );
  assert.match(quick, /Keyboard\.dismiss\(\);\s*onNationalityChange/);
  assert.match(
    quick,
    /behavior=\{Platform\.OS === "ios" \? "padding" : "height"\}/,
  );
  assert.match(quick, /accessibilityLiveRegion="assertive"/);
});

test("DOB columns expose selected values accessibly and preserve scrollable years", () => {
  assert.match(quick, /accessibilityRole="radio"/);
  assert.match(quick, /selected: value === item.value/);
  assert.match(quick, /initialScrollIndex=\{initialIndex\}/);
  assert.match(quick, /extraData=\{value\}/);
  assert.match(quick, /Array\.from\(\{ length: 125 \}/);
  assert.ok(quick.indexOf("</ScrollView>") < quick.indexOf("<DateColumn"));
});


test("nationality retains shared flags with validated image loading and fallback", () => {
  assert.match(quick, /<PersonalDetailsCountryFlag/);
  assert.match(quick, /country.label === item.value/);
  const flag = readFileSync("src/features/personal-details/PersonalDetailsCountryFlag.tsx", "utf8");
  assert.match(flag, /getCountryFlagUri\(isoCode\)/);
  assert.match(flag, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(flag, /isoCode \|\| "--"/);
  assert.match(flag, /accessible=\{false\}/);
});
