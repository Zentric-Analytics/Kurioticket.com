import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(`src/features/flow/${file}`, "utf8");
const panel = read("FlightSearchPanel.tsx");
const field = (label: string) => {
  const start = panel.indexOf(`<CompactSearchField label="${label}"`);
  return start < 0 ? undefined : panel.slice(start, panel.indexOf("/>", start) + 2);
};

test("Origin and Destination use the existing location icon without changing picker behavior", () => {
  const origin = field("Origin");
  const destination = field("Destination");

  assert.ok(origin);
  assert.match(origin, /icon="location"/);
  assert.match(origin, /onPress=\{\(\) => \{ userControlsOrigin\.current = true; setPicker\("from"\); \}\}/);
  assert.ok(destination);
  assert.match(destination, /icon="location"/);
  assert.match(destination, /onPress=\{\(\) => setPicker\("to"\)\}/);
  assert.equal(panel.match(/icon="location"/g)?.length, 2);
});

test("other Flight fields retain their intended icons", () => {
  assert.match(field("Travel dates") ?? "", /icon="calendar"/);
  assert.match(field("Travelers") ?? "", /icon="person"/);
  assert.doesNotMatch(field("Cabin") ?? "", /icon="location"/);
});

test("the location glyph stays decorative and precedes the compact field text", () => {
  const icon = read("FlowIcon.tsx");
  const primitives = read("FlowPrimitives.tsx");

  assert.match(icon, /\| "location"/);
  assert.match(icon, /location: <>[\s\S]*?<Path[\s\S]*?<Circle/);
  assert.match(icon, /accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/);
  assert.match(primitives, /<View style=\{styles\.compactValueRow\}>[\s\S]*?<FlowIcon name=\{icon\} size=\{18\}[\s\S]*?<View style=\{styles\.compactTextColumn\}>/);
  assert.match(primitives, /accessibilityLabel=\{\[label, value, meta\]\.filter\(Boolean\)\.join\(", "\)\}/);
});

test("the accessible swap control and icon remain in place", () => {
  assert.match(panel, /accessibilityLabel="Swap origin and destination"[\s\S]*?onPress=\{swapAirports\} style=\{\[styles\.swap,[\s\S]*?<FlowIcon name="swap"/);
  assert.match(panel, /routeFields:\{position:"relative"\}/);
  assert.match(panel, /swap:\{position:"absolute",right:16,top:"50%",transform:\[\{translateY:-22\}\],width:44,height:44/);
  assert.doesNotMatch(panel, /swap:\{[^}]*top:58/);
});
