import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(`src/features/flow/${file}`, "utf8");
const panel = read("FlightSearchPanel.tsx");
const field = (label: string) => {
  const start = panel.indexOf(`<Field label="${label}"`);
  return start < 0 ? undefined : panel.slice(start, panel.indexOf("/>", start) + 2);
};

test("From and To use the existing location icon without changing picker behavior", () => {
  const from = field("From");
  const to = field("To");

  assert.ok(from);
  assert.match(from, /icon="location"/);
  assert.match(from, /onPress=\{\(\) => \{ userControlsOrigin\.current = true; setPicker\("from"\); \}\}/);
  assert.ok(to);
  assert.match(to, /icon="location"/);
  assert.match(to, /onPress=\{\(\) => setPicker\("to"\)\}/);
  assert.equal(panel.match(/icon="location"/g)?.length, 2);
});

test("other Flight fields retain their intended icons", () => {
  assert.match(field("Depart") ?? "", /icon="calendar"/);
  assert.match(field("Return") ?? "", /icon="calendar"/);
  assert.match(field("Travelers") ?? "", /icon="person"/);
  assert.doesNotMatch(field("Cabin") ?? "", /icon="location"/);
});

test("the location glyph stays decorative and precedes the Field text", () => {
  const icon = read("FlowIcon.tsx");
  const primitives = read("FlowPrimitives.tsx");

  assert.match(icon, /\| "location"/);
  assert.match(icon, /location: <>[\s\S]*?<Path[\s\S]*?<Circle/);
  assert.match(icon, /accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/);
  assert.match(primitives, /\{icon \? <FlowIcon name=\{icon\} size=\{22\} color=\{ft\.colors\.icon\} \/> : null\}[\s\S]*?<View style=\{styles\.grow\}>/);
  assert.match(primitives, /accessibilityLabel=\{`\$\{label\}, \$\{value\}`\}/);
});

test("the accessible swap control and icon remain in place", () => {
  assert.match(panel, /accessibilityLabel="Swap origin and destination"[\s\S]*?onPress=\{swapAirports\} style=\{styles\.swap\}><FlowIcon name="swap"/);
  assert.match(panel, /swap:\{position:"absolute",right:12,top:50,width:44,height:44/);
});
