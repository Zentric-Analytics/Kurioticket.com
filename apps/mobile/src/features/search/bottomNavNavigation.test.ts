import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const bottomNav = source.slice(source.indexOf("export function BottomNav"), source.indexOf("const s0 = StyleSheet.create"));

test("Flight Results bottom navigation uses the existing app routes", () => {
  assert.match(bottomNav, /label: "Explore"[^\n]+route: "\/\(tabs\)\/explore"/);
  assert.match(bottomNav, /label: "Trips"[^\n]+accessibilityLabel: "My Trips"[^\n]+route: "\/\(tabs\)\/trips"/);
  assert.match(bottomNav, /label: "Search"[^\n]+route: "\/flights"/);
  assert.match(bottomNav, /label: "Saved"[^\n]+route: "\/saved"/);
  assert.match(bottomNav, /label: "Profile"[^\n]+route: "\/\(tabs\)\/profile"/);
  assert.match(bottomNav, /onPress=\{\(\) => router\.replace\(route\)\}/);
});

test("all bottom navigation items are accessible press targets and Search stays selected", () => {
  assert.match(bottomNav, /<Pressable/);
  assert.match(bottomNav, /accessibilityRole="button"/);
  assert.match(bottomNav, /accessibilityLabel=\{accessibilityLabel\}/);
  assert.match(bottomNav, /accessibilityState=\{\{ selected: label === "Search" \}\}/);
  assert.match(bottomNav, /color=\{label === "Search" \? ui\.blue/);
});
