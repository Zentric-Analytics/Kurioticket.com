import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const cardStart = source.indexOf("function HotelCard");
const cardEnd = source.indexOf("function FlightResultsSummaryRow", cardStart);
const card = source.slice(cardStart, cardEnd);

test("hotel result cards keep wider gutters and use a shorter result-card rhythm", () => {
  assert.match(source, /hotelResultsCardBody:\s*\{\s*paddingHorizontal:\s*12\s*\}/);
  assert.match(source, /<View style=\{s0\.hotelResultsCardBody\}>[\s\S]*?<HotelCard/);
  const cardStyle = source.match(/\n  hotelCard:\s*\{[^}]*\}/s)?.[0] ?? "";
  assert.match(cardStyle, /minHeight:\s*232/);
  assert.match(card, /const compactCardMinHeight = 224/);
});

test("hotel card surface remains the primary navigation action without a duplicate CTA", () => {
  assert.match(card, /const openHotel = \(\) => \{/);
  assert.match(card, /<Pressable[\s\S]*?onPress=\{openHotel\}[\s\S]*?s0\.hotelCard/);
  assert.match(card, /hotelCardPressed/);
  assert.doesNotMatch(card, />View hotel<\/Text>/);
  assert.doesNotMatch(card, /hotelDealButton/);
});

test("hotel utility and gallery controls do not trigger the card navigation", () => {
  assert.match(card, /event\.stopPropagation\(\); void canonical\.toggleHotel\(result, params\)/);
  assert.match(card, /event\.stopPropagation\(\); shareHotel\(\)/);
  assert.match(card, /event\.stopPropagation\(\);setActiveImage\(index=>\(index-1\+usableGallery\.length\)%usableGallery\.length\)/);
  assert.match(card, /event\.stopPropagation\(\);setActiveImage\(index=>\(index\+1\)%usableGallery\.length\)/);
});

test("hotel card prioritizes reviews, booking terms, nightly price and stay total", () => {
  assert.match(card, /result\.reviewCount \? `  ·  \$\{result\.reviewCount\.toLocaleString\(\)\} reviews`/);
  assert.match(card, /const bookingTerms = \[mealPlan, \.\.\.policy\]/);
  assert.match(card, /\.slice\(0, 2\)/);
  assert.match(card, /free cancellation\|breakfast included\|pay later\|reserve now/i);
  assert.match(card, /displayPrices\?\.nightly\?\.formatted/);
  assert.match(card, /displayPrices\?\.total\?\.formatted/);
  assert.match(card, />\{displayPrices\?\.total\?\.formatted \?\? money\(result\.currency, result\.totalPrice\)\} total<\/Text>/);
});
