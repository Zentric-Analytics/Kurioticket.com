import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const card = source.slice(source.indexOf("function HotelCard"), source.indexOf("function Loading"));
const styles = source.slice(source.indexOf("const s0 = StyleSheet.create"));

test("hotel card presents actual result information in a deliberate order", () => {
  const markers = [
    "result.name",
    "classificationRow",
    "reviewRow",
    "locationRow",
    "result.amenities.slice(0, 3)",
    "result.provider",
    "result.pricePerNight",
    "result.totalPrice",
    'label="View deal"',
  ];
  let previous = -1;
  for (const marker of markers) {
    const position = card.indexOf(marker, previous + 1);
    assert.ok(position > previous, `${marker} should follow the previous information group`);
    previous = position;
  }
});

test("hotel location and recognized amenities use semantic icons", () => {
  assert.match(card, /<MapPin[\s\S]*?locationText/);
  assert.match(card, /wi-\?fi[\s\S]*?return "wifi"/);
  assert.match(card, /restaurant\|dining[\s\S]*?return "dining"/);
  assert.match(card, /parking[\s\S]*?return "parking"/);
  assert.match(card, /pool\|swimming[\s\S]*?return "pool"/);
  assert.match(card, /fitness\|gym[\s\S]*?return "fitness"/);
  assert.match(card, /icon === "wifi" \? <Wifi/);
  assert.match(card, /icon === "dining" \? <Utensils/);
});

test("unknown and known amenities always retain their source text", () => {
  assert.match(card, /const icon = resolveHotelAmenityIcon\(label\)/);
  assert.match(card, /return undefined;/);
  assert.match(card, /<Text[^>]*>\{label\}<\/Text>/);
  assert.doesNotMatch(card, /amenities=\{|amenities:\s*\[/);
});

test("hotel favorite, prices, and deal navigation preserve their contracts", () => {
  assert.match(card, /canonical\.toggleHotel\(result, params\)/);
  assert.match(card, /accessibilityState=\{\{ selected: saved \}\}/);
  assert.match(card, /money\(result\.currency, result\.pricePerNight\)/);
  assert.match(card, /money\(result\.currency, result\.totalPrice\)/);
  assert.match(card, /pathname: "\/hotel-details"/);
  assert.match(card, /result: JSON\.stringify\(result\)/);
});

test("important hotel text wraps and the card grows with content", () => {
  const importantText = card.match(/<Text[^>]*hotelName[\s\S]*?<\/Text>|<Text[^>]*locationText[\s\S]*?<\/Text>|<Text[^>]*providers[\s\S]*?<\/Text>/g) || [];
  assert.equal(importantText.length, 3);
  importantText.forEach((textBlock) => assert.doesNotMatch(textBlock, /numberOfLines=\{?[12]\}?/));
  assert.match(styles, /hotelCard:\s*\{\s*minHeight: 234/);
  assert.doesNotMatch(styles, /hotelCard:\s*\{[^}]*\bheight:/);
  assert.match(styles, /hotelCopy: \{ flex: 1, minWidth: 0/);
  assert.match(styles, /locationText: \{ flex: 1, minWidth: 0/);
  assert.match(styles, /amenities: \{ flexDirection: "row", flexWrap: "wrap"/);
});
