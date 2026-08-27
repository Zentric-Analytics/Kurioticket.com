import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const flightCard = source.slice(source.indexOf("function FlightCard"), source.indexOf("function FlightJourneyRow"));
const footerStyles = source.slice(source.indexOf("  fareRow:"), source.indexOf("  hotelCard:"));

test("the flight card has one subtle theme-aware horizontal metadata divider", () => {
  assert.match(flightCard, /<View style=\{s0\.fareRow\}>[\s\S]*<View style=\{\[s0\.metadataDivider, \{ backgroundColor: theme\.border \}\]\} \/>[\s\S]*<View style=\{s0\.metadataRow\}>/);
  assert.equal(flightCard.match(/s0\.metadataDivider/g)?.length, 1);
  assert.match(footerStyles, /metadataDivider: \{ width: "100%", height: StyleSheet\.hairlineWidth, marginTop: 3, marginBottom: 4 \}/);
  assert.doesNotMatch(footerStyles, /borderLeftWidth|borderRightWidth/);
});

test("flight details navigation is wired to the complete borderless card", () => {
  assert.match(flightCard, /<Pressable[\s\S]*?accessibilityRole="button"[\s\S]*?onPress=\{\(\) =>[\s\S]*?router\.push\(\{/);
  assert.match(flightCard, /pathname: "\/flight-details"/);
  assert.doesNotMatch(flightCard, /View details|detailsButton|detailsButtonText/);
  assert.match(flightCard, /event\.stopPropagation\(\); onToggleSaved\(\)/);
  const cardStyle = /card: \{([\s\S]*?)\n  \},/.exec(source)?.[1] ?? "";
  assert.doesNotMatch(cardStyle, /borderWidth|borderColor/);
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
  assert.match(flightCard, /color=\{theme\.textSecondary\}/);
  assert.match(flightCard, /backgroundColor: theme\.border/);
});
