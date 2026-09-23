import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");

const styleBody = (name: string) => {
  const match = source.match(new RegExp(`${name}:\\{([^}]*)\\}`));
  assert.ok(match, `${name} style must exist`);
  return match[1];
};

test("loaded and loading states share one branded header", () => {
  assert.match(source, /function FlightDetailsBrandHeader/);
  assert.equal((source.match(/<FlightDetailsBrandHeader/g) ?? []).length, 3);
  assert.match(source, /testID="flight-details-brand-header"/);
  assert.match(source, /accessibilityLabel="Back to results"/);
  assert.match(source, /accessibilityLabel="Kurioticket"/);
  assert.match(source, /accessibilityLabel=\{saved\?"Remove saved flight":"Save flight"\}/);
  assert.match(source, /accessibilityLabel="Share flight"/);
});

test("brand header keeps compact touch targets and one continuous white surface", () => {
  assert.match(styleBody("brandHeader"), /backgroundColor:"#FFFFFF"/);
  assert.match(styleBody("brandHeaderRow"), /height:64/);
  assert.match(styleBody("brandHeaderRow"), /paddingHorizontal:16/);
  assert.match(styleBody("brandHeaderAction"), /width:44,height:44/);
  assert.match(styleBody("brandHeaderLogo"), /width:128,height:32/);
  assert.doesNotMatch(source, /heroBackControl|heroIconGlass|heroActionsGlass|floatingControl/);
});

test("hero begins below the branded header instead of carrying navigation controls", () => {
  const available = source.slice(source.indexOf('return <SafeAreaView edges={[]}'), source.indexOf("function FlightDetailsLoadingSkeleton"));
  const header = available.indexOf("<FlightDetailsBrandHeader");
  const scroll = available.indexOf('<ScrollView testID="flight-details-scroll-content"');
  const hero = available.indexOf('<ImageBackground testID="flight-details-hero"');
  assert.ok(header > -1 && header < scroll && scroll < hero);
  assert.doesNotMatch(available.slice(hero, available.indexOf("</ImageBackground>", hero)), /Back to results|Save flight|Share flight/);
});
