import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { summarizeBaggage, summarizeFareRules } from "./flightCardSummaries";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function HotelCard"));

test("flight card preserves display pricing and provider data during details navigation", () => {
  assert.match(card, /fare\?\.formatted \?\? "—"/);
  assert.doesNotMatch(card, /money\(result\.currency, result\.price\)/);
  assert.match(card, /pathname: "\/flight-details"/);
  assert.match(card, /result: JSON\.stringify\(result\)/);
});

test("flight card derives singular, plural, and nonstop labels from provider stops", () => {
  assert.match(card, /result\.stops === 1 \? "" : "s"/);
  assert.match(card, /: "Nonstop"/);
  assert.match(card, /\{stopLabel\}/);
});

test("flight benefits use concise summaries while retaining provider data for details", () => {
  assert.match(card, /summarizeBaggage\(result\.baggageInfo\)/);
  assert.match(card, /summarizeFareRules\(result\.refundInfo\)/);
  assert.match(card, /Seat unavailable/);
  assert.match(card, /numberOfLines=\{1\}/);
});

test("baggage summary only claims inclusions supported by provider copy", () => {
  assert.equal(summarizeBaggage("Carry-on and 1 checked bag included"), "Carry-on + checked bag");
  assert.equal(summarizeBaggage("Cabin baggage included"), "Carry-on included");
  assert.equal(summarizeBaggage("Baggage subject to airline policy"), "Baggage details");
  assert.equal(summarizeBaggage("No baggage included"), "Baggage details");
});

test("fare-rule summary classifies varied provider language without exact matching", () => {
  assert.equal(summarizeFareRules("This ticket is NON-REFUNDABLE; changes cost USD 150"), "Not refundable");
  assert.equal(summarizeFareRules("Refund available before departure with a fee"), "Refundable");
  assert.equal(summarizeFareRules("Changes allowed with USD 150.00 penalty"), "Fare rules apply");
  assert.equal(summarizeFareRules(), "Fare rules apply");
});

test("flight card keeps narrow layouts to one compact row without height-growing text", () => {
  assert.match(card, /style=\{s0\.bigPrice\} numberOfLines=\{1\}/);
  assert.match(card, /style=\{s0\.nameSmall\} numberOfLines=\{1\}/);
  assert.equal(card.match(/style=\{s0\.benefit\} numberOfLines=\{1\}/g)?.length, 3);
  assert.match(source, /card: \{[\s\S]*?padding: 13,[\s\S]*?gap: 10,/);
  assert.match(source, /benefits: \{[\s\S]*?paddingTop: 8,[\s\S]*?flexDirection: "row"/);
  assert.match(source, /detailsButton: \{ width: 88, minHeight: 44/);
  for (const viewport of [320, 360, 390, 430]) {
    assert.ok(viewport - 36 - 26 > 0, `${viewport}px retains positive single-row card content width`);
  }
});

test("long airline names truncate rather than increasing card height", () => {
  assert.match(card, /style=\{s0\.nameSmall\} numberOfLines=\{1\}/);
  assert.match(source, /departureBlock: \{ flex: 1\.35, minWidth: 0 \}/);
});

test("flight card uses Lucide icons for route, benefits, badges, and saved state", () => {
  for (const icon of ["PlaneTakeoff", "Luggage", "Armchair", "ShieldCheck", "Award", "Tag"]) {
    assert.match(card, new RegExp(`<${icon}\\b`));
  }
  assert.match(source, /import \{ Heart \} from "lucide-react-native"/);
  assert.match(card, /<Heart[\s\S]*fill=\{saved \? androidFavoriteColors\.active : "transparent"\}/);
  assert.match(card, /color=\{saved \? androidFavoriteColors\.active : ui\.muted\}/);
  assert.match(card, /accessibilityLabel=\{saved \? `Remove \$\{result\.airlineName\} flight from saved` : `Save \$\{result\.airlineName\} flight`\}/);
  assert.doesNotMatch(card, /[▣◉★]/);
  assert.doesNotMatch(card, /<FlowIcon[\s\S]*name="heart"/);
});

test("flight favorite uses persistent shared state for initial, save, and remove behavior", () => {
  assert.match(card, /const \{ savedFlights, toggle \} = useSavedFlights\(\)/);
  assert.match(card, /const saved = savedFlights\.has\(result\.id\)/);
  assert.match(card, /toggle\(result\)/);
  assert.doesNotMatch(card, /useState\(false\)/);
  const hook = readFileSync(resolve("src/storage/useSavedFlights.ts"), "utf8");
  assert.match(hook, /SAVED_FLIGHTS_KEY/);
  assert.match(hook, /SecureStore\.getItemAsync/);
  assert.match(hook, /SecureStore\.setItemAsync/);
  assert.match(hook, /next\.has\(flight\.id\) \? next\.delete\(flight\.id\) : next\.set\(flight\.id, flight\)/);
  assert.match(hook, /favoriteAction\(userId\)/);
});

test("flight favorite is accessible, isolated, and does not enlarge the top row", () => {
  assert.match(card, /accessibilityRole="button"/);
  assert.match(card, /accessibilityState=\{\{ selected: saved \}\}/);
  assert.match(card, /hitSlop=\{\{ top: 12, bottom: 12, left: 12, right: 12 \}\}/);
  assert.match(card, /event\.stopPropagation\(\); toggle\(result\)/);
  assert.match(source, /cardTop: \{ minHeight: 23/);
  assert.doesNotMatch(card, /onPress=.*View details[\s\S]*toggle\(result\)/);
});

test("saved flights remain visible in the established Saved screen", () => {
  const savedScreen = readFileSync(resolve("src/features/saved/SavedRecentScreen.tsx"), "utf8");
  assert.match(savedScreen, /useSavedFlights\(\)/);
  assert.match(savedScreen, /key: "flights", title: "Flights"/);
  assert.match(savedScreen, /\[\.\.\.savedFlights\.values\(\)\]\.map\(savedFlightItem\)/);
  assert.match(savedScreen, /item\.category === "flights"/);
  assert.match(savedScreen, /toggleFlight\(savedFlights\.get\(item\.id\)!\)/);
});
