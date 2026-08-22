import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/flow/FlowPrimitives.tsx", "utf8");
const primaryButton = source.slice(source.indexOf("export function PrimaryButton"), source.indexOf("export function UnavailableNotice"));
const flight = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
const hotel = readFileSync("src/features/flow/HotelSearchPanel.tsx", "utf8");
const car = readFileSync("src/features/flow/CarSearchPanel.tsx", "utf8");
const packageForm = readFileSync("src/features/flow/PackageSearchForm.tsx", "utf8");

const submitButton = (panel: string) => panel.match(/<PrimaryButton label=\{submitLabel\}[^>]*\/>/)?.[0] ?? "";

test("PrimaryButton supports an explicit iconless mode without changing its default or behavior", () => {
  assert.match(primaryButton, /icon = "search"/);
  assert.match(primaryButton, /icon\?: FlowIconName \| null/);
  assert.match(primaryButton, /\{icon \? <FlowIcon name=\{icon\} color="white" \/> : null\}/);
  assert.match(primaryButton, /<Text style=\{ft\.styles\.primaryText\}>\{label\}<\/Text>/);
  assert.match(primaryButton, /accessibilityLabel=\{label\}/);
  assert.match(primaryButton, /accessibilityState=\{\{ disabled \}\}/);
  assert.match(primaryButton, /disabled=\{disabled\}/);
  assert.match(primaryButton, /onPress=\{onPress\}/);
});

test("the four native product search CTAs are uniquely iconless", () => {
  for (const [panel, label] of [[flight, "Search flights"], [hotel, "Search hotels"], [car, "Search cars"]] as const) {
    assert.equal((panel.match(new RegExp(`submitLabel = "${label}"`, "g")) ?? []).length, 1);
    assert.match(submitButton(panel), /icon=\{null\}/);
    assert.doesNotMatch(submitButton(panel), /icon="search"/);
  }
  assert.equal((packageForm.match(/label="Search package"/g) ?? []).length, 1);
  assert.match(packageForm, /<PrimaryButton label="Search package" icon=\{null\} onPress=\{submit\}\/>/);
});
