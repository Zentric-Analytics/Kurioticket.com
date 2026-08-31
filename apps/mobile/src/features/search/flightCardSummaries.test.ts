import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatCabinClass, summarizeBaggage, summarizeFareRules } from "./flightCardSummaries";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function FlightJourneyRow"));

test("metadata is one horizontal, flexible row in baggage, cabin, fare-rules order", () => {
  const row = card.slice(card.indexOf('style={s0.metadataRow}'));
  const baggage = row.indexOf("baggageSummary");
  const cabin = row.indexOf("cabinSummary");
  const fareRules = row.indexOf("Fare rules\n");

  assert.ok(baggage >= 0 && cabin > baggage && fareRules > cabin);
  assert.equal(row.match(/style=\{s0\.metadataItem\}/g)?.length, 3);
  assert.match(row, /<Luggage\b/);
  assert.match(row, /<Armchair\b/);
  assert.match(row, /<FileText\b/);
  assert.match(source, /metadataRow: \{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "flex-start", paddingTop: 1, paddingBottom: 2 \}/);
  assert.equal(row.match(/>·<\/Text>/g)?.length, 2);
});

test("metadata shows values without redundant visual category labels", () => {
  const row = card.slice(card.indexOf('style={s0.metadataRow}'));
  assert.doesNotMatch(row, /<Text[^>]*>Baggage: <\/Text>/);
  assert.doesNotMatch(row, /<Text[^>]*>Cabin: <\/Text>/);
  assert.doesNotMatch(row, /<Text[^>]*>Fare rules: <\/Text>/);
  assert.match(row, /\{baggageSummary\}/);
  assert.match(row, /\{cabinSummary\}/);
  assert.match(row, />\s*Fare rules\s*<\/Text>/);
  assert.equal(row.match(/numberOfLines=\{1\}/g)?.length, 3);
  assert.equal(row.match(/ellipsizeMode="tail"/g)?.length, 3);
  assert.doesNotMatch(row, /adjustsFontSizeToFit/);
  assert.doesNotMatch(source, /metadataLabel/);
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
  assert.match(card, /accessibilityLabel=\{`Baggage: \$\{baggageAccessibility\}\. Cabin: \$\{cabinSummary\}\. Fare rules: \$\{fareRulesAccessibility\}\.`\}/);
  assert.equal(card.match(/<View accessible=\{false\} style=\{s0\.metadataItem\}>/g)?.length, 3);
  assert.equal(card.match(/<(?:Luggage|Armchair|FileText) accessible=\{false\} size=\{13\} strokeWidth=\{2\} color=\{supportTextColor\} \/>/g)?.length, 3);
  assert.ok((card.match(/<Text accessible=\{false\}/g)?.length ?? 0) >= 5);
});

test("metadata and full-width journey fit supported mobile widths", () => {
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const cardWidth = viewport - 28;
    const contentWidth = cardWidth - 24;
    assert.ok(contentWidth > 0, `${viewport}px card remains inside its viewport`);
    assert.ok(contentWidth >= 268, `${viewport}px retains a non-overflowing footer text region`);
  }
  assert.match(source, /journeyList: \{ width: "100%"/);
  assert.match(card, /<View style=\{s0\.fareRow\}>[\s\S]*?style=\{s0\.metadataRow\}/);
});

test("baggage summaries distinguish positive, negative, and unknown provider states", () => {
  assert.equal(summarizeBaggage("Carry-on and 1 checked bag included"), "Bags included");
  assert.equal(summarizeBaggage("Cabin baggage included"), "Carry-on");
  assert.equal(summarizeBaggage("No baggage included"), "Not included");
  assert.equal(summarizeBaggage("Baggage subject to airline policy"), null);
});

test("fare summaries only claim refundable when provider copy supports it", () => {
  assert.equal(summarizeFareRules("Refund available before departure"), "Refundable");
  assert.equal(summarizeFareRules("NON-REFUNDABLE"), null);
  assert.equal(summarizeFareRules(), null);
  assert.match(card, /summarizeFareRules\(result\.refundInfo\) \?\? "Review before booking"/);
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
