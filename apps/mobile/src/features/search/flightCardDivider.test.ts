import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const flightCard = source.slice(source.indexOf("function FlightCard"), source.indexOf("function FlightJourneyRow"));
const benefitsStyle = source.slice(source.indexOf("  benefits: {"), source.indexOf("  benefitList:"));

test("the flight card summary and action area has spacing without a divider", () => {
  assert.match(flightCard, /<View style=\{s0\.benefits\}>/);
  assert.doesNotMatch(flightCard, /borderTopColor|borderBottomColor|divider|separator|hairlineWidth/i);
  assert.doesNotMatch(benefitsStyle, /borderTopWidth|borderBottomWidth|borderColor/);
  assert.match(benefitsStyle, /paddingTop: 4/);
});

test("flight details navigation remains wired to the action", () => {
  assert.match(flightCard, /accessibilityLabel="View details"[\s\S]*?onPress=\{\(\) =>[\s\S]*?router\.push\(\{/);
  assert.match(flightCard, /pathname: "\/flight-details"/);
  assert.match(flightCard, /<Text style=\{s0\.detailsButtonText\}[^>]*>View details<\/Text>/);
});

test("only provider-backed baggage and refundable benefits remain eligible", () => {
  assert.match(flightCard, /summarizeBaggage\(result\.baggageInfo\)/);
  assert.doesNotMatch(flightCard, /Seat unavailable/);
  assert.match(flightCard, /summarizeFareRules\(result\.refundInfo\)/);
});

test("the flight card retains its light and dark mode theming", () => {
  assert.match(flightCard, /backgroundColor: theme\.surface/);
  assert.match(flightCard, /shadowColor: theme\.dark \?/);
  assert.match(flightCard, /theme\.dark && \{ backgroundColor:/);
  assert.match(flightCard, /color: theme\.textPrimary/);
  assert.match(flightCard, /color: theme\.textSecondary/);
  assert.match(flightCard, /color=\{theme\.icon\}/);
});
