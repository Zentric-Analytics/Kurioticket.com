import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
const field = panel.slice(panel.indexOf("function MultiCityField"), panel.indexOf("function MultiCityEditor"));
const editor = panel.slice(panel.indexOf("function MultiCityEditor"), panel.indexOf("function ErrorText"));
const styles = panel.slice(panel.indexOf("const styles=StyleSheet.create"));

test("Multi-city follows the web-mobile hierarchy with standalone leg headings", () => {
  assert.match(editor, />Multi-city flights<\/Text>/);
  assert.match(editor, /accessibilityLabel=\{`\$\{form\.multiCityLegs\.length\} of \$\{MULTI_CITY_MAX_LEGS\} flights`\}/);
  const order = ["Flight {index+1}", 'label="Origin"', 'label="Destination"', 'label="Departure date"', "Remove flight"];
  let cursor = 0;
  for (const value of order) {
    const next = editor.indexOf(value, cursor);
    assert.ok(next >= cursor, `expected ${value} in leg order`);
    cursor = next + value.length;
  }
  assert.ok(editor.indexOf("Add flight") > editor.indexOf("form.multiCityLegs.map"));
  assert.doesNotMatch(styles, /legCard:|legHeader:|removeButton:/);
});

test("each field is an independent accessible rounded surface with semantic icons", () => {
  assert.match(field, /accessibilityRole="button"/);
  assert.match(field, /<Text numberOfLines=\{0\}/);
  assert.match(editor, /label="Origin"[\s\S]*?icon="location"[\s\S]*?trailingChevron/);
  assert.match(editor, /label="Destination"[\s\S]*?icon="location"[\s\S]*?trailingChevron/);
  assert.match(editor, /label="Departure date"[\s\S]*?icon="calendar"[\s\S]*?onPress/);
  assert.match(styles, /multiField:\{minHeight:74,borderWidth:1,borderRadius:13/);
  assert.doesNotMatch(styles.match(/multiField:\{[^}]+\}/)?.[0] ?? "", /height:/);
});

test("Remove flight is below fields, remains visible at two legs, and is fully tappable", () => {
  assert.match(editor, /const removeDisabled = form\.multiCityLegs\.length <= MULTI_CITY_MIN_LEGS/);
  assert.match(editor, /accessibilityLabel=\{`Remove Flight \$\{index\+1\}`\} accessibilityState=\{\{disabled:removeDisabled\}\} disabled=\{removeDisabled\}/);
  assert.match(editor, /<Trash2 accessible=\{false\}[^>]+\/><Text[^>]*>Remove flight<\/Text>/);
  assert.match(styles, /removeFlightButton:\{minHeight:44/);
  assert.ok(editor.indexOf("<Trash2") > editor.indexOf('label="Departure date"'));
});

test("Add flight is compact, decorative, and preserves the maximum rule", () => {
  assert.match(editor, /const addDisabled = form\.multiCityLegs\.length >= MULTI_CITY_MAX_LEGS/);
  assert.match(editor, /accessibilityLabel="Add flight" accessibilityState=\{\{disabled:addDisabled\}\} disabled=\{addDisabled\}/);
  assert.match(editor, /<Plus accessible=\{false\}/);
  assert.match(styles, /addButton:\{alignSelf:"flex-start",minHeight:44/);
});

test("Multi-city placeholders and selected airport formatting are presentation-only", () => {
  assert.equal(editor.match(/"City or airport"/g)?.length, 2);
  assert.match(editor, /selectedAirportValue\(leg\.from,"City or airport"\)/);
  assert.match(editor, /selectedAirportValue\(leg\.to,"City or airport"\)/);
  assert.match(panel, /selectedAirportValue\(form\.from, "Select origin"\)/);
  assert.match(panel, /selectedAirportValue\(form\.to, "To\?"\)/);
});
