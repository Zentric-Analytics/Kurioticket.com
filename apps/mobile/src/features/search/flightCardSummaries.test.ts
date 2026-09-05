import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatCabinClass, summarizeBaggage, summarizeFareRules } from "./flightCardSummaries";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function FlightJourneyRow"));

test("metadata groups baggage, cabin, and fare rules in one left footer column", () => {
  const row = card.slice(card.indexOf('style={s0.flightMetadataRegion}'));
  const baggage = row.indexOf("baggageSummary");
  const cabin = row.indexOf("cabinSummary");
  const fareRules = row.indexOf("labels.fareRules");

  assert.ok(baggage >= 0 && cabin > baggage && fareRules > cabin);
  assert.equal(row.match(/style=\{s0\.flightMetadataItem\}/g)?.length, 3);
  assert.doesNotMatch(row, /<ScrollView|horizontal/);
  assert.match(row, /<Luggage\b/);
  assert.match(row, /<Armchair\b/);
  assert.match(row, /<FileText\b/);
  assert.match(card, /style=\{s0\.flightMetadataRegion\}[\s\S]*?style=\{s0\.flightCommercialRegion\}/);
  assert.match(source, /flightMetadataRegion: \{ flex: 1, minWidth: 0/);
  assert.match(source, /flightMetadataItem: \{ width: "100%", minWidth: 0, flexDirection: "row"/);
  assert.match(source, /flightMetadataIconTile: \{ width: 28, height: 28, borderRadius: 8/);
  assert.match(source, /flightMetadataCopy: \{ flex: 1, minWidth: 0, flexDirection: "row"/);
  assert.match(source, /flightMetadataLabel: \{ width: 46, flexShrink: 0/);
  assert.match(source, /flightMetadataValue: \{ flex: 1, minWidth: 0/);
  assert.doesNotMatch(source, /metadataSeparator:/);
  assert.doesNotMatch(source, /metadataRow: \{[^}]*justifyContent: "space-between"/);
  assert.doesNotMatch(source, /metadataRow: \{[^}]*flexWrap/);
  assert.doesNotMatch(row, />·<\/Text>/);
});

test("metadata shows localized category labels and provider-derived values", () => {
  const row = card.slice(card.indexOf('style={s0.flightMetadataRegion}'));
  const metadata = row.slice(0, row.indexOf('<View style={s0.flightCommercialRegion}>'));
  assert.match(row, /labels\.baggage/);
  assert.match(row, /labels\.cabin/);
  assert.match(row, /labels\.fareRules/);
  assert.match(row, /labels\.review/);
  assert.match(row, /\{baggageSummary\}/);
  assert.match(row, /\{cabinSummary\}/);
  assert.doesNotMatch(row, /\{fareRulesSummary\}/);
  assert.equal(metadata.match(/numberOfLines=\{1\}/g)?.length, 6);
  assert.equal(metadata.match(/ellipsizeMode="tail"/g)?.length, 3);
  assert.doesNotMatch(metadata, /adjustsFontSizeToFit/);
  assert.equal(metadata.match(/s0\.flightMetadataLabel/g)?.length, 3);
  assert.equal(metadata.match(/s0\.flightMetadataValue/g)?.length, 3);
  assert.doesNotMatch(metadata, /\{labels\.(?:baggage|cabin|fareRules)\}: /);
  assert.doesNotMatch(metadata, /Baggage:|Cabin:|Fare rules:/);
});

test("metadata icon tiles, typography, and spacing establish a restrained hierarchy", () => {
  const metadata = card.slice(card.indexOf('style={s0.flightMetadataRegion}'), card.indexOf('<View style={s0.flightCommercialRegion}>'));
  assert.equal(metadata.match(/accessible=\{false\} style=\{\[s0\.flightMetadataIconTile/g)?.length, 3);
  assert.match(source, /flightMetadataIconTile: \{ width: 28, height: 28, borderRadius: 8[^}]*alignItems: "center", justifyContent: "center" \}/);
  assert.match(metadata, /backgroundColor: theme\.dark \? "#253147" : "#F0F2F5"/);
  assert.doesNotMatch(metadata, /ui\.blue|#(?:[0-9A-Fa-f]{2})?2563EB|border(?:Left|Right)|shadow|elevation|Chevron/);
  assert.match(source, /flightMetadataRegion: \{[^}]*alignItems: "flex-start"[^}]*gap: 6/);
  assert.match(source, /flightMetadataLabel: \{[^}]*fontSize: 9[^}]*fontWeight: "500"[^}]*appFonts\.medium/);
  assert.match(source, /flightMetadataValue: \{[^}]*fontSize: 10\.5[^}]*fontWeight: "600"[^}]*appFonts\.semibold/);
  assert.equal(metadata.match(/flightMetadataLabel, \{ color: supportTextColor \}/g)?.length, 3);
  assert.equal(metadata.match(/flightMetadataValue, \{ color: theme\.textPrimary \}/g)?.length, 3);
  assert.doesNotMatch(source, /flightMetadata(?:Region|Item): \{[^}]*backgroundColor/);
});

test("metadata stays non-actionable beside the unchanged right-aligned price region", () => {
  const metadata = card.slice(card.indexOf('style={s0.flightMetadataRegion}'), card.indexOf('<View style={s0.flightCommercialRegion}>'));
  assert.doesNotMatch(metadata, /Pressable|Chevron|borderLeft|borderRight/);
  assert.equal((card.match(/<Pressable/g) || []).length, 1);
  assert.match(source, /flightCommercialRegion: \{ width: "46%", minWidth: 104, flexShrink: 0, alignItems: "flex-end"/);
  assert.match(source, /bigPrice: \{[^}]*flexShrink: 1[^}]*textAlign: "right"/);
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
  assert.equal(card.match(/<(?:Luggage|Armchair|FileText) accessible=\{false\} size=\{14\} strokeWidth=\{2\} color=\{supportTextColor\}\/>/g)?.length, 3);
  assert.equal(card.match(/<(?:Luggage|Armchair|FileText) accessible=\{false\}/g)?.length, 3);
});

test("metadata and full-width journey fit supported mobile widths", () => {
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const cardWidth = viewport - 28;
    const contentWidth = cardWidth - 24;
    assert.ok(contentWidth > 0, `${viewport}px card remains inside its viewport`);
    assert.ok(contentWidth >= 268, `${viewport}px retains a non-overflowing footer text region`);
    assert.ok(contentWidth - 8 - 104 >= 156, `${viewport}px keeps separate metadata and price columns`);
  }
  assert.match(source, /journeyList: \{ width: "100%"/);
  assert.match(card, /style=\{s0\.flightMetadataRegion\}[\s\S]*?style=\{s0\.flightCommercialRegion\}/);
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
