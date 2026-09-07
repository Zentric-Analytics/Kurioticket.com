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
  const footer = quick.indexOf("s.footer", quick.indexOf("data={shown}"));
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

test("DOB uses accessible snapping wheels in month/day/year order", () => {
  const wheel = readFileSync(
    "src/features/personal-details/PersonalDetailsDateWheel.tsx",
    "utf8",
  );
  assert.match(wheel, /accessibilityRole="adjustable"/);
  assert.match(wheel, /snapToInterval=\{rowHeight\}/);
  assert.match(wheel, /onMomentumScrollEnd/);
  assert.match(wheel, /latest.current.onChange/);
  assert.match(wheel, /clearTimeout/);
  assert.match(quick, /Array\.from\(\{ length: 125 \}/);
  assert.ok(quick.indexOf("label={c.month}") < quick.indexOf("label={c.day}"));
  assert.ok(quick.indexOf("label={c.day}") < quick.indexOf("label={c.year}"));
  assert.match(quick, /blocked=\{detail === "birth" && wheelsMoving\}/);
  assert.match(quick, /sheetGesture.panHandlers/);
  assert.doesNotMatch(quick, /columnLabel|dateOption|<DateColumn/);
});

test("nationality retains shared flags with validated image loading and fallback", () => {
  assert.match(quick, /<PersonalDetailsCountryFlag/);
  assert.match(quick, /country.label === item.value/);
  const flag = readFileSync(
    "src/features/personal-details/PersonalDetailsCountryFlag.tsx",
    "utf8",
  );
  assert.match(flag, /getCountryFlagUri\(isoCode\)/);
  assert.match(flag, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(flag, /isoCode \|\| "--"/);
  assert.match(flag, /accessible=\{false\}/);
});

test("gender has no back arrow while nationality keeps its navigation control", () => {
  const header = quick.slice(
    quick.indexOf("<View style={s.header}>"),
    quick.indexOf(
      "{fullScreen ? (",
      quick.indexOf("<View style={s.header}>") + 100,
    ),
  );
  assert.match(header, /fullScreen \? \(/);
  assert.match(header, /<FlowIcon name="back"/);
  assert.match(header, /<View style=\{s.back\} \/>/);
  assert.match(quick, /onPress=\{onClose\}/);
});
