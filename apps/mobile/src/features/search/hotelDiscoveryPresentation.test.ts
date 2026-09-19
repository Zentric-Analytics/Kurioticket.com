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

test("active native Hotel continuation uses one provider handoff pattern for Kurioticket and external providers", () => {
  assert.match(hotel, /nativeKurioticketHotelDetailsUrl/);
  assert.match(hotel, /const kurioticketHandoffAvailable =[\s\S]*?roomOptions\.length > 0 && Boolean\(kurioticketWebUrl\)/);
  assert.match(hotel, /nativeHotelProviderUrl\([\s\S]*?result\.partnerRedirectUrl,[\s\S]*?result\.bookingUrl/);
  assert.match(hotel, /const providerHandoffAvailable =[\s\S]*?Boolean\(redirectUrl\)[\s\S]*?result\.searchPolicy\.bookable \|\| result\.searchPolicy\.source === "kayak-sandbox"/);
  assert.match(hotel, /const hotelOffers = nativeHotelOffers\([\s\S]*?kurioticketHandoffAvailable,[\s\S]*?providerHandoffAvailable/);
  assert.match(hotel, /const targetUrl =[\s\S]*?selectedRate\.offerId === "internal-rooms"[\s\S]*?\? kurioticketWebUrl[\s\S]*?: selectedRate\.offerId === "provider"/);
  assert.match(hotel, /await openProviderInApp\(targetUrl\)/);
  assert.doesNotMatch(hotel, /HotelRoomOptionsModal|Choose room|setRoomsOpen/);
  assert.match(rates, /No reservable rates available/);
});

test("active Hotel details derive provider rows from supplied inventory without exposing room-card detail", () => {
  assert.doesNotMatch(hotel, /Math\.round\(result\.rating\)|reviewScore \?\? result\.rating/);
  assert.match(hotel, /roomOptions\.length > 0/);
  assert.match(rates, /id: "provider-kurioticket"/);
  assert.match(rates, /nightlyPrice:[\s\S]*nightlyPrice\.formatted/);
  assert.match(rates, /totalPrice:[\s\S]*totalPrice\.formatted/);
  assert.doesNotMatch(rates, /roomOptions|roomOptionId|Compact room|Deluxe|Suite|STATIC_RATE_GROUPS|\$1,225|Standard Room, 1 Queen Bed/);
  assert.match(reviews, /Verified guest reviews are not connected/);
});

test("narrow active Hotel layout mirrors Flight Compare deals cards and persistent continuation dock", () => {
  assert.match(hotel, /useWindowDimensions\(\)\.width/);
  assert.match(rates, /adjustsFontSizeToFit/);
  assert.match(rates, /minimumFontScale=\{0\.72\}/);
  assert.match(rates, /borderRadius: 14/);
  assert.match(rates, /minHeight: 96/);
  assert.match(rates, /accessibilityRole="radiogroup"/);
  assert.match(rates, /accessibilityRole="radio"/);
  assert.match(rates, /s\.dealRadioDot/);
  assert.match(rates, /onPress=\{row\.actionable \? \(\) => onSelectRate\(row\.id\) : undefined\}/);
  assert.match(rates, /disabled=\{!row\.actionable\}/);
  assert.doesNotMatch(rates, /rateTitle|rateMeta|Compact room|Deluxe|Suite|Choose room/);
  assert.match(hotel, /s\.bookingDock/);
  assert.match(hotel, /Continue to[\s\S]*selectedRate\.providerName/);
  assert.match(hotel, /bookingDockButtonText\}>\{bookingActionLabel\}<\/Text>/);
});

