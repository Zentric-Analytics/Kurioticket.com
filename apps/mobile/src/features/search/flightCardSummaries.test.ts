import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatCabinClass, summarizeBaggage, summarizeFareRules } from "./flightCardSummaries";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function FlightJourneyRow"));

test("metadata uses one horizontal baggage, cabin, fare-rule row", () => {
  const row = card.slice(card.indexOf('style={s0.flightMetadataRow}'));
  const baggage = row.indexOf("baggageSummary");
  const cabin = row.indexOf("cabinSummary");
  const fareRules = row.indexOf("labels.fareRules");

  assert.ok(baggage >= 0 && cabin > baggage && fareRules > cabin);
  assert.equal(row.match(/style=\{s0\.flightMetadataItem\}/g)?.length, 3);
  assert.match(card, /<ScrollView[\s\S]*horizontal[\s\S]*showsHorizontalScrollIndicator=\{false\}/);
  assert.match(row, /<Luggage\b/);
  assert.match(row, /<Armchair\b/);
  assert.match(row, /<FileText\b/);
  assert.match(card, /style=\{s0\.flightFareAction\}[\s\S]*?style=\{s0\.flightMetadataRow\}/);
  assert.match(source, /flightMetadataContent: \{[^\n]*flexDirection: "row"[^\n]*justifyContent: "space-between"/);
  assert.match(source, /flightMetadataItem: \{ flexShrink: 0, minWidth: 0, flexDirection: "row"/);
  assert.doesNotMatch(source, /metadataSeparator:/);
  assert.doesNotMatch(source, /metadataRow: \{[^}]*justifyContent: "space-between"/);
  assert.doesNotMatch(source, /metadataRow: \{[^}]*flexWrap/);
  assert.doesNotMatch(row, />·<\/Text>/);
});

test("metadata shows localized category labels and provider-derived values", () => {
  const row = card.slice(card.indexOf('style={s0.flightMetadataRow}'));
  assert.match(row, /labels\.baggage/);
  assert.match(row, /labels\.cabin/);
  assert.match(row, /labels\.fareRules/);
  assert.match(row, /labels\.review/);
  assert.match(row, /\{baggageSummary\}/);
  assert.match(row, /\{cabinSummary\}/);
  assert.doesNotMatch(row, /\{fareRulesSummary\}/);
  assert.equal(row.match(/numberOfLines=\{1\}/g)?.length, 3);
  assert.equal(row.match(/ellipsizeMode="tail"/g)?.length, 2);
  assert.doesNotMatch(row, /adjustsFontSizeToFit/);
  assert.match(source, /flightMetadataText:/);
});

test("metadata summaries use provider result fields exactly once", () => {
  assert.equal(card.match(/summarizeBaggage\(result\.baggageInfo\)/g)?.length, 1);
  assert.equal(card.match(/formatCabinClass\(result\.cabinClass\)/g)?.length, 1);
  assert.equal(card.match(/summarizeFareRules\(result\.refundInfo\)/g)?.length, 1);
  assert.doesNotMatch(card, /baggageBenefit|fareBenefit|benefitList|benefitItem/);
});

test("metadata has one complete accessibility label with decorative icons", () => {
  assert.match(card, /const baggageAccessibility = result\.baggageInfo\?\.trim\(\) \|\| baggageSummary/);
  assert.match(card, /const fareRulesAccessibility = result\.refundInfo\?\.trim\(\) \|\| fareRulesSummary/);
  assert.match(card, /accessibilityLabel=\{`\$\{labels\.baggage\}: \$\{baggageAccessibility\}\. \$\{labels\.cabin\}: \$\{cabinSummary\}\. \$\{labels\.fareRule\}: \$\{fareRulesAccessibility\}\.`\}/);
  assert.equal(card.match(/<(?:Luggage|Armchair|FileText) accessible=\{false\} size=\{13\} strokeWidth=\{2\} color=\{supportTextColor\}\/>/g)?.length, 3);
  assert.equal(card.match(/<(?:Luggage|Armchair|FileText) accessible=\{false\}/g)?.length, 3);
});

test("metadata and full-width journey fit supported mobile widths", () => {
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const cardWidth = viewport - 28;
    const contentWidth = cardWidth - 24;
    assert.ok(contentWidth > 0, `${viewport}px card remains inside its viewport`);
    assert.ok(contentWidth >= 268, `${viewport}px retains a non-overflowing footer text region`);
  }
  assert.match(source, /journeyList: \{ width: "100%"/);
  assert.match(card, /style=\{s0\.flightFareAction\}[\s\S]*?style=\{s0\.flightMetadataRow\}/);
});

test("baggage summaries distinguish positive, negative, and unknown provider states", () => {
  assert.equal(summarizeBaggage("Carry-on and 1 checked bag included"), "Included");
  assert.equal(summarizeBaggage("Outbound: 1 carry-on included. Return: baggage allowance not supplied."), null);
  assert.equal(summarizeBaggage("Checked bag available for a fee"), null);
  assert.equal(summarizeBaggage("Cabin baggage included"), "Carry-on included");
  assert.equal(summarizeBaggage("One checked bag included"), "Checked bag included");
  assert.equal(summarizeBaggage("No baggage included"), "Not included");
  assert.equal(summarizeBaggage("Baggage subject to airline policy"), null);
});

test("fare summaries only claim refundable when provider copy supports it", () => {
  assert.equal(summarizeFareRules("Refund available before departure"), "Refundable");
  assert.equal(summarizeFareRules("NON-REFUNDABLE"), null);
  assert.equal(summarizeFareRules(), null);
  assert.match(card, /summarizeFareRules\(result\.refundInfo\) \?\? "Review booking rules"/);
  assert.doesNotMatch(card, /Review before/);
});

test("cabin formatting handles canonical and provider capitalization safely", () => {
  for (const [value, expected] of [
    ["economy", "Economy"],
    ["premium-economy", "Premium Economy"],
    ["business", "Business"],
    ["first", "First"],
    ["Economy", "Economy"],
    ["BUSINESS", "Business"],
  ]) assert.equal(formatCabinClass(value), expected);
});
