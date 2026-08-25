import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(`src/features/flow/${file}`, "utf8");
const panel = read("FlightSearchPanel.tsx");
const packages = read("PackageSearchForm.tsx");
const field = (label: string) => {
  const start = panel.lastIndexOf(`<CompactSearchField label="${label}"`);
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
  assert.equal(panel.match(/icon="location"/g)?.length, 4);
});

test("Destination has one concise empty value while retaining selected airport metadata", () => {
  const destination = field("Destination");

  assert.ok(destination);
  assert.match(destination, /value=\{form\.to\?\.code \?\? "To\?"\}/);
  assert.match(destination, /meta=\{form\.to \? `\$\{form\.to\.city\}, \$\{form\.to\.country\}` : undefined\}/);
  assert.doesNotMatch(destination, /Select destination|No airport selected/);
  assert.match(destination, /muted=\{!form\.to\}/);
});

test("other Flight fields retain their intended icons", () => {
  assert.match(field("Travel dates") ?? "", /icon="calendar"/);
  assert.match(field("Travelers & Cabin Class") ?? "", /icon="person"/);
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

test("the accessible Flight swap control matches the Packages presentation", () => {
  assert.match(panel, /accessibilityRole="button" accessibilityLabel="Swap origin and destination" accessibilityState=\{\{ disabled: !form\.from \|\| !form\.to \}\} disabled=\{!form\.from \|\| !form\.to\} onPress=\{swapAirports\}/);
  assert.match(panel, /style=\{\(\{ pressed \}\) => \[styles\.swapTarget, pressed && ft\.styles\.pressed\]\}/);
  assert.match(panel, /<View style=\{\[styles\.swapCircle, \{ backgroundColor: ft\.colors\.surface, borderColor: ft\.colors\.border, shadowColor: ft\.colors\.shadow \}\]\}>/);
  assert.match(panel, /<ArrowRightLeft accessible=\{false\} size=\{17\} color=\{ft\.colors\.blue\}\/>/);
  assert.doesNotMatch(panel, /<FlowIcon name="swap"/);
  assert.match(panel, /routeFields:\{position:"relative"\}/);
  assert.match(panel, /swapTarget:\{position:"absolute",right:12,top:"50%",transform:\[\{translateY:-22\}\],width:44,height:44/);
  assert.match(panel, /swapCircle:\{width:36,height:36,borderRadius:18,borderWidth:1[^}]*shadowOpacity:0\.12,shadowRadius:4,shadowOffset:\{width:0,height:2\},elevation:3\}/);

  for (const source of [panel, packages]) {
    assert.match(source, /swapTarget:\{[\s\S]*?width:44,height:44/);
    assert.match(source, /swapCircle:\{width:36,height:36,borderRadius:18/);
    assert.match(source, /<ArrowRightLeft accessible=\{false\} size=\{17\}/);
  }
});

test("Flight swapping retains its disabled rule and route behavior", () => {
  const handler = panel.match(/const swapAirports = \(\) => \{[^\n]+\};/)?.[0] ?? "";

  assert.match(handler, /userControlsOrigin\.current = true/);
  assert.match(handler, /current\.from && current\.to \? \{ \.\.\.current, from: current\.to, to: current\.from \} : current/);
  assert.match(handler, /clear\("from", "to"\)/);
  assert.match(panel, /accessibilityState=\{\{ disabled: !form\.from \|\| !form\.to \}\}/);
  assert.match(panel, /disabled=\{!form\.from \|\| !form\.to\}/);
});
