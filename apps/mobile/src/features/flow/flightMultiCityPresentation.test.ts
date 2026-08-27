import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
const editor = panel.slice(panel.indexOf("function MultiCityEditor"), panel.indexOf("function ErrorText"));
const styles = panel.slice(panel.indexOf("const styles=StyleSheet.create"));

const compactField = (label: string) => {
  const start = editor.indexOf(`<CompactSearchField label="${label}"`);
  return editor.slice(start, editor.indexOf("/>", start) + 2);
};

test("Multi-city keeps standalone leg headings and matches counter typography", () => {
  assert.match(editor, />Multi-city flights<\/Text>/);
  assert.match(styles, /multiTitle:\{fontSize:11,lineHeight:16,fontWeight:"700"\}/);
  assert.doesNotMatch(styles, /multiTitle:\{fontSize:18,lineHeight:24/);
  assert.match(editor, /style=\{ft\.styles\.meta\}>\{form\.multiCityLegs\.length\} of \{MULTI_CITY_MAX_LEGS\}/);
  assert.match(editor, /style=\{\[styles\.multiLegTitle,ft\.styles\.value\]\}>Flight \{index\+1\}/);
});

test("each leg uses compact Round-trip field rows without legacy rounded fields", () => {
  for (const label of ["Origin", "Destination"]) {
    const field = compactField(label);
    assert.match(field, /icon="location"/);
    assert.match(field, /valueNumberOfLines=\{0\}/);
    assert.match(field, /trailing=\{false\}/);
  }
  assert.match(compactField("Departure date"), /icon="calendar"/);
  assert.match(editor, /"Choose date"/);
  assert.doesNotMatch(panel, /MultiCityField|multiField/);
});

test("every mapped leg owns an accessible Round-trip-style swap", () => {
  assert.match(editor, /form\.multiCityLegs\.map[\s\S]*?<View style=\{styles\.routeFields\}>/);
  assert.match(editor, /accessibilityLabel=\{`Swap Flight \$\{index\+1\} origin and destination`\}/);
  assert.match(editor, /accessibilityState=\{\{disabled:!leg\.from\|\|!leg\.to\}\} disabled=\{!leg\.from\|\|!leg\.to\}/);
  assert.match(editor, /onPress=\{\(\)=>onSwap\(index\)\}/);
  assert.match(editor, /styles\.swapTarget/);
  assert.match(editor, /styles\.swapCircle/);
  assert.match(editor, /<ArrowRightLeft accessible=\{false\} size=\{17\}/);
  assert.match(styles, /swapTarget:\{[^\n]*width:44,height:44/);
  assert.match(styles, /swapCircle:\{width:36,height:36,borderRadius:18/);
});

test("Travelers and Cabin uses the shared compact field", () => {
  const start = panel.indexOf('<CompactSearchField label="Travelers & Cabin Class"');
  const field = panel.slice(start, panel.indexOf("/>", start) + 2);
  assert.equal(panel.match(/<CompactSearchField label="Travelers & Cabin Class"/g)?.length, 1);
  assert.match(field, /value=\{travelerCabinSummary\}/);
  assert.match(field, /icon="person"/);
  assert.match(field, /trailing=\{<FlowIcon name="chevron"/);
});

test("Remove and Add flight preserve their limits and semantics", () => {
  assert.match(editor, /length <= MULTI_CITY_MIN_LEGS/);
  assert.match(editor, /accessibilityLabel=\{`Remove Flight \$\{index\+1\}`\}/);
  assert.match(editor, /<Trash2 accessible=\{false\}/);
  assert.match(editor, /length >= MULTI_CITY_MAX_LEGS/);
  assert.match(editor, /accessibilityLabel="Add flight"/);
  assert.match(editor, /<Plus accessible=\{false\}/);
});

test("placeholders and errors remain scoped to each mapped leg", () => {
  assert.equal(editor.match(/"City or airport"/g)?.length, 2);
  assert.match(editor, /errors\.multiCityLegs\?\.\[index\]\?\.from/);
  assert.match(editor, /errors\.multiCityLegs\?\.\[index\]\?\.to/);
  assert.match(editor, /errors\.multiCityLegs\?\.\[index\]\?\.departureDate/);
});

test("Flight 1 swap claims default-origin ownership before immutable model update", () => {
  assert.match(panel, /onSwap=\{\(index\)=>\{if\(index===0\)userControlsOrigin\.current=true;setForm/);
  assert.match(panel, /swapMultiCityLegAirports\(current\.multiCityLegs,index\)/);
});
