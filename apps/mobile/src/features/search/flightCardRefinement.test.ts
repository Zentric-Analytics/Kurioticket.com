import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

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

test("flight benefits retain truthful provider values and explicit fallbacks", () => {
  assert.match(card, /result\.baggageInfo \|\| "Baggage details unavailable"/);
  assert.match(card, /result\.refundInfo \|\| "Fare rules unavailable"/);
  assert.match(card, /Seat selection unavailable/);
  assert.match(card, /numberOfLines=\{1\}/);
});

test("flight card keeps narrow layouts to one compact row without height-growing text", () => {
  assert.match(card, /style=\{s0\.bigPrice\} numberOfLines=\{1\}/);
  assert.match(card, /style=\{s0\.nameSmall\} numberOfLines=\{1\}/);
  assert.equal(card.match(/style=\{s0\.benefit\} numberOfLines=\{1\}/g)?.length, 3);
  assert.match(source, /card: \{[\s\S]*?padding: 13,[\s\S]*?gap: 10,/);
  assert.match(source, /benefits: \{[\s\S]*?paddingTop: 10,[\s\S]*?flexDirection: "row"/);
});

test("flight card uses Lucide icons for route, benefits, badges, and saved state", () => {
  for (const icon of ["PlaneTakeoff", "Luggage", "Armchair", "ShieldCheck", "Award", "Tag"]) {
    assert.match(card, new RegExp(`<${icon}\\b`));
  }
  assert.match(card, /<Heart[\s\S]*fill=\{saved \? ui\.blue : "none"\}/);
  assert.match(card, /accessibilityLabel=\{`\$\{saved \? "Remove" : "Save"\}/);
  assert.doesNotMatch(card, /[▣◉★]/);
  assert.doesNotMatch(card, /<FlowIcon[\s\S]*name="heart"/);
});
