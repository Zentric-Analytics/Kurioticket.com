import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ui = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
const screen = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const pill = ui.slice(ui.indexOf("export function Pill"), ui.indexOf("export function DateStrip"));
const styles = ui.slice(ui.indexOf("export const s = StyleSheet.create"));
const rail = screen.slice(screen.indexOf("const filterRail"), screen.indexOf("const resultContent"));

function styleBlock(name: string, nextName: string) {
  return styles.slice(styles.indexOf(`${name}:`), styles.indexOf(`${nextName}:`, styles.indexOf(`${name}:`)));
}

test("Flight Results quick controls retain their rail and behavior", () => {
  assert.match(rail, /<ScrollView\s+horizontal/);
  assert.match(rail, /showsHorizontalScrollIndicator=\{false\}/);
  assert.match(rail, /label=\{flightSortQuickLabel\(sort\)\}[\s\S]*?setSortOpen\(true\)/);
  assert.match(rail, /`Filter · \$\{activeFilterCount\}`[\s\S]*?openFlightFilters\("all"\)/);
  assert.match(rail, /\["Airlines", "Stops"\][\s\S]*?filters\.maxStops[\s\S]*?filters\.airlines/);
  assert.match(rail, /openFlightFilters\(x\.toLowerCase\(\) as "stops" \| "airlines"\)/);
  for (const label of ["Filter", "Airlines", "Stops"]) assert.match(rail, new RegExp(`"${label}"`));
});

test("Flight Results pills have compact dedicated geometry and press feedback", () => {
  const flightPill = styleBlock("flightPill", "flightPillPressed");
  assert.match(flightPill, /height: 38/);
  assert.match(flightPill, /paddingHorizontal: 10/);
  assert.match(flightPill, /borderRadius: 8/);
  assert.match(flightPill, /borderWidth: 1/);
  assert.match(flightPill, /gap: 6/);
  assert.match(styleBlock("flightPillPressed", "flightPillText"), /opacity: 0\.82[\s\S]*?scale: 0\.985/);
  assert.match(pill, /hitSlop=\{flightResults \? \{ top: 3, bottom: 3, left: 2, right: 2 \} : undefined\}/);
  assert.match(pill, /style=\{\(\{ pressed \}\) => \[[\s\S]*?flightResults && pressed && s\.flightPillPressed/);
});

test("Flight Results pills use theme-aware premium surfaces and typography", () => {
  assert.equal(ui.match(/pale: "#F7F9FC"/)?.length, 1);
  assert.match(pill, /theme\.dark \? theme\.surface : ui\.pale, borderColor: theme\.border/);
  assert.match(pill, /theme\.dark \? "#142B55" : "#EEF4FF", borderColor: ui\.blue/);
  assert.match(pill, /const selectedColor = theme\.dark \? "#8FB5FF" : ui\.blue/);
  const text = styleBlock("flightPillText", "flightPillTextActive");
  assert.match(text, /fontSize: 12/);
  assert.match(text, /lineHeight: 16/);
  assert.match(text, /fontWeight: "600"/);
  assert.match(text, /fontFamily: appFonts\.semibold/);
  assert.match(styleBlock("flightPillTextActive", "dateNavigator"), /fontWeight: "700"[\s\S]*?fontFamily: appFonts\.bold/);
});

test("Flight Results decorative icons are quieter and correctly sized", () => {
  assert.match(pill, /active \? selectedColor : theme\.textSecondary/);
  assert.match(pill, /<SlidersHorizontal size=\{17\} strokeWidth=\{2\} color=\{iconColor\}/);
  assert.match(pill, /<ChevronRight size=\{15\} strokeWidth=\{1\.9\} color=\{iconColor\}/);
});

test("generic Pills retain their existing contract and conditional overrides", () => {
  const generic = styleBlock("pill", "pillActive");
  assert.match(generic, /height: 38/);
  assert.match(generic, /borderRadius: 10/);
  assert.match(generic, /backgroundColor: "white"/);
  assert.match(styleBlock("pillText", "flightPill"), /fontWeight: "700"/);
  assert.match(pill, /flightResults && s\.flightPill/);
  assert.match(pill, /active && !flightResults && s\.pillActive/);
  assert.match(pill, /!icon && !flightResultsIcon[\s\S]*?<FlowIcon name="chevron" size=\{12\}/);
  assert.match(pill, /icon \? \([\s\S]*?<FlowIcon name=\{icon\} size=\{15\}/);
  assert.doesNotMatch(screen.slice(screen.indexOf('product === "hotel"'), screen.indexOf("<FlightSortModal")), /flightResultsIcon=\{"|flightResultsChevron=\{true\}/);
});

test("Flight Results pills preserve accessibility announcements", () => {
  assert.match(pill, /accessibilityRole="button"/);
  assert.match(pill, /accessibilityLabel=\{label\}/);
  assert.match(pill, /accessibilityState=\{\{ selected: active \}\}/);
});
