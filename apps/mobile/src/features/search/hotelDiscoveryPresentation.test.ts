import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const resultCard = results.slice(
  results.indexOf("function HotelCard"),
  results.indexOf("function Loading", results.indexOf("function HotelCard")),
);
const hotel = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const rates = readFileSync("src/features/search/NativeHotelRatesSection.tsx", "utf8");
const reviews = readFileSync("src/features/search/NativeHotelReviewsSection.tsx", "utf8");

test("discovery Hotel results never imply live price, saves, or classification", () => {
  assert.match(resultCard, /showCheapestBadge && hasPrice/);
  assert.match(resultCard, /classificationStars > 0/);
  assert.match(resultCard, /"Price unavailable"/);
});

test("active native Hotel continuation distinguishes Kurioticket rooms and provider handoff", () => {
  assert.match(hotel, /const internalRoomFlowAvailable = roomOptions\.length > 0/);
  assert.match(hotel, /nativeHotelProviderUrl\([\s\S]*?result\.partnerRedirectUrl,[\s\S]*?result\.bookingUrl/);
  assert.match(hotel, /result\.searchPolicy\.bookable && Boolean\(redirectUrl\)/);
  assert.doesNotMatch(hotel, /result\.partnerRedirectUrl \|\| result\.bookingUrl/);
  assert.match(hotel, /const offer = hotelOffers\.find\(\(\{ id \}\) => id === offerId\)/);
  assert.match(hotel, /if \(offer\.kind === "internal-room-flow"\)/);
  assert.match(hotel, /offer\.kind !== "provider-handoff"/);
  assert.match(rates, /No reservable rates available/);
  assert.doesNotMatch(hotel, /Booked|Reserved|Available now/);
});

test("active Hotel details derive rates from supplied inventory instead of fabricating rooms or price", () => {
  assert.doesNotMatch(hotel, /Math\.round\(result\.rating\)|reviewScore \?\? result\.rating/);
  assert.match(hotel, /roomOptions\.length > 0/);
  assert.match(rates, /roomOptions\.forEach\(\(option\) =>/);
  assert.match(rates, /option\.displayPrice\?\.total/);
  assert.doesNotMatch(rates, /STATIC_RATE_GROUPS|\$1,225|Standard Room, 1 Queen Bed/);
  assert.match(reviews, /Verified guest reviews are not connected/);
});

test("narrow active Hotel layout gives price and Reserve flexible ownership without a dock", () => {
  assert.match(hotel, /useWindowDimensions\(\)\.width/);
  assert.match(rates, /adjustsFontSizeToFit/);
  assert.match(rates, /minimumFontScale=\{0\.68\}/);
  assert.match(rates, /width: 112/);
  assert.match(rates, /minHeight: 44/);
  assert.doesNotMatch(hotel, /s\.dockPrice|s\.continueButton/);
});
