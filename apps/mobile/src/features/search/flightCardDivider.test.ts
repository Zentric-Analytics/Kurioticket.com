import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const flightCard = source.slice(source.indexOf("function FlightCard"), source.indexOf("function FlightJourneyRow"));
const footerStyles = source.slice(source.indexOf("  fareRow:"), source.indexOf("  hotelCard:"));

test("the flight card has one subtle theme-aware horizontal metadata divider", () => {
  assert.match(flightCard, /<View style=\{s0\.fareRow\}>[\s\S]*<View style=\{\[s0\.metadataDivider, \{ backgroundColor: theme\.border \}\]\} \/>[\s\S]*style=\{s0\.metadataRow\}/);
  assert.equal(flightCard.match(/s0\.metadataDivider/g)?.length, 1);
  assert.match(footerStyles, /metadataDivider: \{ width: "100%", height: StyleSheet\.hairlineWidth, marginTop: 6, marginBottom: 4 \}/);
  assert.doesNotMatch(footerStyles, /borderLeftWidth|borderRightWidth/);
});

test("flight details navigation is wired to the complete bordered card", () => {
  assert.match(flightCard, /<Pressable[\s\S]*?accessibilityRole="button"[\s\S]*?onPress=\{\(\) =>[\s\S]*?router\.push\(\{/);
  assert.match(flightCard, /pathname: "\/flight-details"/);
  assert.doesNotMatch(flightCard, /View details|detailsButton|detailsButtonText/);
  assert.match(flightCard, /onPressIn=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(flightCard, /onPress=\{\(event\) => \{ event\.stopPropagation\(\); if \(!pending\) onToggleSaved\(\); \}\}/);
  const cardStyle = /card: \{([\s\S]*?)\n  \},/.exec(source)?.[1] ?? "";
  assert.match(cardStyle, /borderWidth: 1/);
  assert.match(flightCard, /borderColor: theme\.dark \? theme\.border : "#D8E1EC"/);
});

test("only provider-backed baggage and refundable benefits remain eligible", () => {
  assert.match(flightCard, /summarizeBaggage\(result\.baggageInfo\)/);
  assert.doesNotMatch(flightCard, /Seat unavailable/);
  assert.match(flightCard, /summarizeFareRules\(result\.refundInfo\)/);
});

test("the flight card retains its light and dark mode theming", () => {
  assert.match(flightCard, /backgroundColor: theme\.surface/);
  assert.match(flightCard, /shadowColor: theme\.dark \?/);
  assert.match(flightCard, /const highlightBackgroundColor = highlightUsesGreen[\s\S]*?theme\.dark \? "#153D2A" : "#E3F6EA"[\s\S]*?: theme\.dark \? "#173568" : "#EEF4FF"/);
  assert.match(flightCard, /const highlightTextColor = highlightUsesGreen[\s\S]*?theme\.dark \? "#8BE0B0" : "#157347"[\s\S]*?: theme\.dark \? "#8FB5FF" : ui\.blue/);
  assert.match(flightCard, /style=\{\[s0\.resultBadge, \{ backgroundColor: highlightBackgroundColor \}\]\}/);
  assert.match(flightCard, /color: highlightTextColor/);
  assert.match(flightCard, /color: theme\.textPrimary/);
  assert.match(flightCard, /supportTextColor = theme\.dark \? flightSupportText\.dark : flightSupportText\.light/);
  assert.match(flightCard, /color=\{saved \? androidFavoriteColors\.active : theme\.textSecondary\}/);
  assert.match(flightCard, /s0\.metadataText, \{ color: supportTextColor \}/);
  assert.match(flightCard, /backgroundColor: theme\.border/);
});
