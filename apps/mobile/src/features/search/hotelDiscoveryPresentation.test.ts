import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const results = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const resultCard = results.slice(results.indexOf("function HotelCard"), results.indexOf("function Loading", results.indexOf("function HotelCard")));
const details = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const hotel = details.slice(details.indexOf("function HotelDetail"), details.indexOf("const detailIcons"));

test("discovery Hotel results never imply live price, saves, or classification", () => {
  assert.match(resultCard, /showCheapestBadge && hasPrice/); assert.match(resultCard, /classificationStars > 0/); assert.match(resultCard, /"Price unavailable"/);
});
test("native Hotel continuation distinguishes planning rooms and provider truth", () => {
  assert.match(hotel, /const internalRoomFlowAvailable = roomOptions\.length > 0/);
  assert.match(hotel, /nativeHotelProviderUrl\([\s\S]*?result\.partnerRedirectUrl,[\s\S]*?result\.bookingUrl/);
  assert.match(hotel, /result\.searchPolicy\.bookable && Boolean\(redirectUrl\)/);
  assert.doesNotMatch(hotel, /result\.partnerRedirectUrl \|\| result\.bookingUrl/);
  assert.match(hotel, /selectedOffer\?\.kind === "internal-room-flow"/);
  assert.match(hotel, /indicative planning/);
  assert.match(hotel, /Planning inventory · no live checkout/);
  assert.match(hotel, /disabled=\{!canContinue\}/);
  assert.doesNotMatch(hotel, /Booked|Reserved|Available now/);
});
test("Hotel details do not fabricate classification, reviews, rooms, or price", () => {
  assert.doesNotMatch(hotel, /Math\.round\(result\.rating\)|reviewScore \?\? result\.rating/);
  assert.match(hotel, /roomOptions\.length > 0/);
  assert.match(hotel, /hasPrice \?/);
  assert.match(hotel, /Price unavailable/);
  assert.match(hotel, /Verified guest reviews are not connected/);
});
test("narrow Hotel layout uses flexible price ownership", () => {
  assert.match(hotel, /useWindowDimensions\(\)\.width/);
  assert.match(hotel, /adjustsFontSizeToFit/);
  assert.match(hotel, /minimumFontScale=\{0\.65\}/);
  assert.match(hotel, /d\.hotelDockPrice/);
  assert.match(hotel, /d\.hotelContinue/);
});
