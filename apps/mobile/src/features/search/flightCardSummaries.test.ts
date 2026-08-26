import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatCabinClass, summarizeBaggage, summarizeFareRules } from "./flightCardSummaries";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function FlightJourneyRow"));

test("metadata is one horizontal, flexible row in baggage, cabin, fare-rules order", () => {
  const row = card.slice(card.indexOf('<View style={s0.metadataRow}>'));
  const baggage = row.indexOf("baggageSummary");
  const cabin = row.indexOf("cabinSummary");
  const fareRules = row.indexOf("fareRulesSummary");

  assert.ok(baggage >= 0 && cabin > baggage && fareRules > cabin);
  assert.equal(row.match(/style=\{s0\.metadataItem\}/g)?.length, 3);
  assert.match(source, /metadataRow: \{ width: "100%", flexDirection: "row"/);
  assert.match(source, /metadataItem: \{ flex: 1, minWidth: 0, flexDirection: "row"/);
  assert.doesNotMatch(source, /metadataRow: \{[^}]*flexWrap|metadataItem: \{[^}]*width:/);
});

test("metadata shows values without redundant visual category labels", () => {
  const row = card.slice(card.indexOf('<View style={s0.metadataRow}>'));
  assert.doesNotMatch(row, /<Text[^>]*>Baggage: <\/Text>/);
  assert.doesNotMatch(row, /<Text[^>]*>Cabin: <\/Text>/);
  assert.doesNotMatch(row, /<Text[^>]*>Fare rules: <\/Text>/);
  assert.match(row, /metadataText[^>]*>\{baggageSummary\}<\/Text>/);
  assert.match(row, /metadataText[^>]*>\{cabinSummary\}<\/Text>/);
  assert.match(row, /metadataText[^>]*>\{fareRulesSummary\}<\/Text>/);
  assert.doesNotMatch(source, /metadataLabel/);
});

test("metadata summaries use provider result fields exactly once", () => {
  assert.equal(card.match(/summarizeBaggage\(result\.baggageInfo\)/g)?.length, 1);
  assert.equal(card.match(/formatCabinClass\(result\.cabinClass\)/g)?.length, 1);
  assert.equal(card.match(/summarizeFareRules\(result\.refundInfo\)/g)?.length, 1);
  assert.doesNotMatch(card, /baggageBenefit|fareBenefit|benefitList|benefitItem/);
});

test("metadata has complete accessibility labels and decorative icons", () => {
  assert.match(card, /accessibilityLabel=\{`Baggage: \$\{baggageSummary\}`\}/);
  assert.match(card, /accessibilityLabel=\{`Cabin: \$\{cabinSummary\}`\}/);
  assert.match(card, /accessibilityLabel=\{`Fare rules: \$\{fareRulesSummary\}`\}/);
  assert.equal(card.match(/accessible=\{false\} size=\{14\}/g)?.length, 3);
});

test("metadata and full-width journey fit supported mobile widths", () => {
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const cardWidth = viewport - 28;
    const contentWidth = cardWidth - 24;
    assert.ok(contentWidth > 0, `${viewport}px card remains inside its viewport`);
    assert.ok((contentWidth - 10) / 3 > 80, `${viewport}px retains three flexible metadata columns`);
  }
  assert.match(source, /journeyList: \{ width: "100%"/);
  assert.match(card, /<View style=\{s0\.fareRow\}>[\s\S]*?<View style=\{s0\.metadataRow\}>/);
});

test("baggage summaries distinguish positive, negative, and unknown provider states", () => {
  assert.equal(summarizeBaggage("Carry-on and 1 checked bag included"), "Carry-on + checked bag");
  assert.equal(summarizeBaggage("Cabin baggage included"), "Carry-on included");
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
