import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatCabinClass, summarizeBaggage, summarizeFareRules } from "./flightCardSummaries";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function FlightJourneyRow"));

test("metadata keeps three compact inline rows beside the price region", () => {
  const metadata = card.slice(card.indexOf('style={s0.flightMetadataRegion}'), card.indexOf('<View style={s0.flightCommercialRegion}>'));

  assert.equal(metadata.match(/style=\{s0\.flightMetadataItem\}/g)?.length, 3);
  for (const icon of ["Luggage", "Armchair", "FileText"]) {
    assert.match(metadata, new RegExp(`<${icon} accessible=\\{false\\} size=\\{15\\} strokeWidth=\\{2\.4\\} color=\\{supportTextColor\\}/>`));
  }
  assert.match(source, /flightMetadataRegion: \{ flex: 1, minWidth: 0[^}]*gap: 5/);
  assert.match(source, /flightMetadataItem: \{ width: "100%", minWidth: 0, flexDirection: "row"/);
  assert.match(source, /flightMetadataText: \{ flex: 1, minWidth: 0/);
  assert.doesNotMatch(source, /flightMetadataIconTile|flightMetadataCopy|flightMetadataValue/);
  assert.doesNotMatch(metadata, /backgroundColor|border(?:Left|Right)|shadow|elevation|Chevron|Pressable/);
});

test("metadata renders each localized label and value as one natural sentence", () => {
  const metadata = card.slice(card.indexOf('style={s0.flightMetadataRegion}'), card.indexOf('<View style={s0.flightCommercialRegion}>'));

  assert.match(metadata, /\{labels\.baggage\}:<\/Text>\{\" \"\}\s*\{baggageSummary\}/);
  assert.match(metadata, /\{labels\.cabin\}:<\/Text>\{\" \"\}\s*\{cabinSummary\}/);
  assert.match(metadata, /\{labels\.fareRules\}:<\/Text>\{\" \"\}\s*\{labels\.review\}/);
  assert.equal(metadata.match(/s0\.flightMetadataText/g)?.length, 3);
  assert.equal(metadata.match(/s0\.flightMetadataLabel/g)?.length, 3);
  assert.doesNotMatch(metadata, /numberOfLines|ellipsizeMode|adjustsFontSizeToFit/);
  assert.doesNotMatch(source, /flightMetadataLabel: \{[^}]*width|flightMetadataLabel: \{[^}]*flex/);
});

test("metadata labels are stronger than naturally wrapping values", () => {
  const metadata = card.slice(card.indexOf('style={s0.flightMetadataRegion}'), card.indexOf('<View style={s0.flightCommercialRegion}>'));

  assert.match(source, /flightMetadataText: \{[^}]*fontWeight: "500"[^}]*appFonts\.medium/);
  assert.match(source, /flightMetadataLabel: \{ fontWeight: "600", fontFamily: appFonts\.semibold \}/);
  assert.equal(metadata.match(/flightMetadataText, \{ color: theme\.textPrimary \}/g)?.length, 3);
  assert.equal(metadata.match(/flightMetadataLabel, \{ color: supportTextColor \}/g)?.length, 3);
  assert.doesNotMatch(source, /flightMetadataLabel: \{[^}]*width:\s*\d+/);
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
  assert.equal(card.match(/<(?:Luggage|Armchair|FileText) accessible=\{false\} size=\{15\} strokeWidth=\{2\.4\} color=\{supportTextColor\}\/>/g)?.length, 3);
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
