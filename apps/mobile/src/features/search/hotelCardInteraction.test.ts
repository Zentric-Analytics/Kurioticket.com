import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const cardStart = source.indexOf("function HotelCard");
const cardEnd = source.indexOf("function FlightResultsSummaryRow", cardStart);
const card = source.slice(cardStart, cardEnd);

test("hotel result cards use wider gutters without increasing their height", () => {
  assert.match(source, /hotelResultsCardBody:\s*\{\s*paddingHorizontal:\s*12\s*\}/);
  assert.match(source, /<View style=\{s0\.hotelResultsCardBody\}>[\s\S]*?<HotelCard/);
  const cardStyle = source.match(/\n  hotelCard:\s*\{[^}]*\}/s)?.[0] ?? "";
  assert.match(cardStyle, /minHeight:\s*260/);
  assert.match(card, /const compactCardMinHeight = Math\.round\(\(viewportWidth - 32\) \* 0\.7\)/);
});

test("hotel card surface and View hotel share one navigation action", () => {
  assert.match(card, /const openHotel = \(\) => \{/);
  assert.match(card, /<Pressable[\s\S]*?onPress=\{openHotel\}[\s\S]*?s0\.hotelCard/);
  assert.match(card, /onPress=\{\(event\) => \{ event\.stopPropagation\(\); openHotel\(\); \}\}/);
  assert.match(card, /hotelCardPressed/);
});

test("hotel utility and gallery controls do not trigger the card navigation", () => {
  assert.match(card, /event\.stopPropagation\(\); void canonical\.toggleHotel\(result, params\)/);
  assert.match(card, /event\.stopPropagation\(\); shareHotel\(\)/);
  assert.match(card, /event\.stopPropagation\(\);setActiveImage\(index=>\(index-1\+usableGallery\.length\)%usableGallery\.length\)/);
  assert.match(card, /event\.stopPropagation\(\);setActiveImage\(index=>\(index\+1\)%usableGallery\.length\)/);
});
