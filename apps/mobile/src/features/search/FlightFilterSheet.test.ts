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

test("price waits for stable currency context without withholding other sections", () => {
  assert.match(screen, /priceFilteringReady=\{flightPriceContext != null\}/);
  assert.match(sheet, /isPriceFilteringAvailable\(options, priceFilteringReady\)/);
  assert.match(sheet, /isPriceFilteringAvailable\(options, priceFilteringReady\)[\s\S]*?title="Price"/);
  for (const title of ["Times", "Duration", "Stops", "Airlines", "Airports", "Amenities"]) {
    assert.match(sheet, new RegExp(`title="${title}"`));
  }
});

test("a comparison-currency identity change clears only the local price filter", () => {
  assert.match(screen, /previousComparisonCurrency\.current !== nextCurrency[\s\S]*?current\.price \? \{ \.\.\.current, price: null \} : current/);
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
  assert.match(sheet, /flightFacetCounts\(results, draft, priceValue\)/);
  assert.match(sheet, /matchingFlightCount\(results, draft, priceValue\)/);
  assert.match(sheet, /<AirlineLogo airlineName=\{name\} logoUrl=\{logoByAirline\.get\(name\)\}/);
  assert.match(sheet, /accessibilityLabel=\{count == null \? label : `\$\{label\}, \$\{count\} flights`\}/);
});

test("clear all is subdued when draft filters are empty and the CTA remains available at zero", () => {
  assert.match(sheet, /accessibilityState=\{\{ disabled: !hasDraftFilters \}\}[\s\S]*?disabled=\{!hasDraftFilters\}/);
  assert.doesNotMatch(sheet, /<Button label=\{cta\}[^>]*disabled=/);
});

test("price and duration use real accessible gesture sliders instead of numeric range inputs", () => {
  const slider = readFileSync("src/features/search/FlightRangeSlider.tsx", "utf8");
  assert.match(sheet, /<FlightRangeSlider[\s\S]*?onChange=/);
  assert.match(slider, /PanResponder\.create/);
  assert.match(slider, /accessibilityRole="adjustable"/);
  assert.match(slider, /Minimum price/);
  assert.match(slider, /Maximum price/);
  assert.match(slider, /Maximum flight duration/);
  assert.match(slider, /lockedRangeEdgeForDrag/);
  assert.match(slider, /zIndex: activeEdge === edge \? 2 : 1/);
  assert.match(slider, /onPanResponderRelease: finishDrag/);
  assert.match(slider, /onPanResponderTerminate: finishDrag/);
  assert.match(slider, /onPanResponderTerminationRequest: \(\) => false/);
  assert.match(sheet, /scrollEnabled=\{!sliderDragging\}/);
  assert.match(sheet, /Outbound journey/);
  assert.doesNotMatch(sheet, /accessibilityLabel=\{`\$\{key\} \$\{edge\}`\}/);
});
