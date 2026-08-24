import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sheet = readFileSync("src/features/search/FlightFilterSheet.tsx", "utf8");
const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

test("mobile filter sheet is extracted, scrollable, safe-area aware, and has a fixed confirmation CTA", () => {
  assert.match(screen, /<FlightFilterSheet[\s\S]*?filters=\{filters\}[\s\S]*?onChange=\{setFilters\}/);
  assert.match(sheet, /useSafeAreaInsets\(\)[\s\S]*?<ScrollView[\s\S]*?<View style=\{\[styles\.footer/);
  assert.match(sheet, /const cta = `Show \$\{previewCount\}[\s\S]*?label=\{cta\}[\s\S]*?onChange\(draft\); onClose\(\)/);
});

test("filter sheet remains usable while the airline keyboard is open", () => {
  assert.match(sheet, /KeyboardAvoidingView/);
  assert.match(sheet, /keyboardDismissMode=\{Platform\.OS === "ios" \? "interactive" : "on-drag"\}/);
  assert.match(sheet, /keyboardShouldPersistTaps="handled"/);
});

test("full sheet exposes required supported groups and conditionally hides optional groups", () => {
  for (const title of ["Price", "Times", "Duration", "Stops", "Airlines", "Airports", "Amenities"]) assert.match(sheet, new RegExp(`title="${title}"`));
  assert.match(sheet, /options\.showAirports \?/);
  assert.match(sheet, /options\.baggage \|\| options\.refundable/);
});

test("quick Airlines and Stops controls share the full-sheet filter state", () => {
  assert.match(screen, /x === "Stops" \? filters\.stops\.length/);
  assert.match(screen, /x === "Airlines" \? filters\.airlines\.length/);
  assert.match(screen, /filters=\{filters\}[\s\S]*?onChange=\{setFilters\}/);
  assert.match(sheet, /setDraft\(emptyFlightFilters\(\)\)/);
});

test("dynamic count uses the dedicated helper and requested middle-dot label", () => {
  assert.match(screen, /activeFlightFilterCount\(filters, flightOptions\)/);
  assert.match(screen, /`Filter · \$\{activeFilterCount\}`/);
});

test("decision rows expose local counts, airline logos, and accessible dynamic labels", () => {
  assert.match(sheet, /flightFacetCounts\(results, draft, normalizePrice\)/);
  assert.match(sheet, /matchingFlightCount\(results, draft, normalizePrice\)/);
  assert.match(sheet, /<AirlineLogo airlineName=\{name\} logoUrl=\{logoByAirline\.get\(name\)\}/);
  assert.match(sheet, /accessibilityLabel=\{count == null \? label : `\$\{label\}, \$\{count\} flights`\}/);
});

test("clear all is subdued when draft filters are empty and the CTA remains available at zero", () => {
  assert.match(sheet, /accessibilityState=\{\{ disabled: !hasDraftFilters \}\}[\s\S]*?disabled=\{!hasDraftFilters\}/);
  assert.doesNotMatch(sheet, /<Button label=\{cta\}[^>]*disabled=/);
});
