import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const shared = source("src/features/home/AndroidFavoriteButton.tsx");
const carResult = source("src/features/search/CarResultCard.tsx");
const carDetail = source("src/features/search/ApprovedCarDetailScreen.tsx");
const kayakCarDetail = source("src/features/search/NativeKayakCarDetailScreen.tsx");
const hotelResult = source("src/features/search/ApprovedResultsScreen.tsx");
const hotelDetail = source("src/features/search/HotelDetailsScreen.tsx");
const approvedHotelDetail = source("src/features/search/ApprovedDetailScreen.tsx");
const flightDetail = source("src/features/search/NativeFlightDetails.tsx");
const explore = source("src/features/explore/ExploreScreen.tsx");

const canonicalFlowHeart = /<FlowIcon name="heart"[^>]*color=\{[^}]*\?\s*androidFavoriteColors\.savedStroke\s*:\s*androidFavoriteColors\.unsavedStroke\}[^>]*fill=\{[^}]*\?\s*androidFavoriteColors\.savedFill\s*:\s*androidFavoriteColors\.unsavedFill\}/;
const canonicalHeart = /<Heart[^>]*color=\{[^}]*\?\s*androidFavoriteColors\.savedStroke\s*:\s*androidFavoriteColors\.unsavedStroke\}[^>]*fill=\{[^}]*\?\s*androidFavoriteColors\.savedFill\s*:\s*androidFavoriteColors\.unsavedFill\}/;

test("native favorite tokens make the state contract explicit and theme-independent", () => {
  const tokens = shared.slice(shared.indexOf("export const androidFavoriteColors"), shared.indexOf("} as const;") + 11);
  assert.match(tokens, /unsavedStroke: "#334155"/);
  assert.match(tokens, /shareStroke: "#334155"/);
  assert.match(tokens, /strokeWidth: 2/);
  assert.match(tokens, /savedStroke: "#E92D55"/);
  assert.doesNotMatch(tokens, /(?:^|\s)stroke:/);
  assert.match(shared, /savedFill: "#E92D55"/);
  assert.match(shared, /unsavedFill: "none"/);
  assert.doesNotMatch(shared, /active:|inactive:|useColorScheme|theme/);
});

test("every direct native interactive favorite uses the canonical stroke and fill contract", () => {
  assert.match(shared, /color=\{saved \? \(webParity \? webParityFavoriteColors\.savedStroke : androidFavoriteColors\.savedStroke\) : \(webParity \? webParityFavoriteColors\.unsavedStroke : androidFavoriteColors\.unsavedStroke\)\}/);
  assert.match(shared, /fill=\{saved \? \(webParity \? webParityFavoriteColors\.savedFill : androidFavoriteColors\.savedFill\) : \(webParity \? webParityFavoriteColors\.unsavedFill : androidFavoriteColors\.unsavedFill\)\}/);
  assert.match(carResult, canonicalFlowHeart);
  assert.match(explore, canonicalFlowHeart);
  for (const detail of [hotelResult, hotelDetail, approvedHotelDetail]) assert.match(detail, canonicalHeart);
  assert.match(flightDetail, /const saveColor=saveDisabled\?"#94A3B8":saved\?androidFavoriteColors\.savedStroke:androidFavoriteColors\.unsavedStroke/);\n  assert.match(flightDetail, /<Heart[^>]*strokeWidth=\{androidFavoriteColors\.strokeWidth\}[^>]*color=\{saveColor\}[^>]*fill=\{saved\?androidFavoriteColors\.savedFill:androidFavoriteColors\.unsavedFill\}/);
  for (const detail of [carDetail, kayakCarDetail]) assert.match(detail, /<Heart[^>]*strokeWidth=\{androidFavoriteColors\.strokeWidth\}[^>]*color=\{saved\.saved\s*\?\s*androidFavoriteColors\.savedStroke\s*:\s*light\s*\?\s*androidFavoriteColors\.unsavedStroke\s*:\s*theme\.icon\}[^>]*fill=\{saved\.saved\s*\?\s*androidFavoriteColors\.savedFill\s*:\s*androidFavoriteColors\.unsavedFill\}/);
});

test("interactive share icons use the same subtle stroke contract as unsaved hearts", () => {
  for (const detail of [carResult, carDetail, kayakCarDetail, hotelResult, hotelDetail, approvedHotelDetail]) {
    assert.match(detail, /(?:Share2|FlowIcon name="share")[^>]*strokeWidth=\{androidFavoriteColors\.strokeWidth\}[^>]*(?:androidFavoriteColors\.shareStroke|theme\.dark \? theme\.icon : androidFavoriteColors\.shareStroke)/);
  }
  assert.match(flightDetail, /const shareColor=shareDisabled\?"#94A3B8":androidFavoriteColors\.shareStroke/);
  assert.match(flightDetail, /<FlowIcon name="share"[^>]*strokeWidth=\{androidFavoriteColors\.strokeWidth\}[^>]*color=\{shareColor\}/);
});

test("legacy interactive favorite colors and empty fills cannot return", () => {
  const interactiveSources = [shared, carResult, carDetail, hotelResult, hotelDetail, flightDetail, explore];
  for (const file of interactiveSources) {
    assert.doesNotMatch(file, /androidFavoriteColors\.(?:stroke\b|active\b|inactive\b)|HOTEL_SAVED_HEART_COLOR/);
  }
  assert.doesNotMatch(carResult, /name="heart"[^>]*(?:theme\.icon|fill="(?:transparent|none)")/);
  assert.match(carDetail, /<Heart[^>]*color=\{saved\.saved\?androidFavoriteColors\.savedStroke:light\?androidFavoriteColors\.unsavedStroke:theme\.icon\}[^>]*fill=\{saved\.saved\?androidFavoriteColors\.savedFill:androidFavoriteColors\.unsavedFill\}/);
  assert.doesNotMatch(carDetail, /<Heart[^>]*(?:#075EE8|fill="none")/);
  assert.doesNotMatch(hotelResult, /<Heart[^>]*(?:#E11D48|theme\.icon|HOTEL_UTILITY_ICON_COLOR|fill="none")/);
  assert.doesNotMatch(hotelDetail, /<Heart[^>]*(?:hotelIdentityActionColor|fill="transparent")/);
  assert.match(flightDetail, /<Heart[^>]*color=\{saveColor\}[^>]*fill=\{saved\?androidFavoriteColors\.savedFill:androidFavoriteColors\.unsavedFill\}/);
  assert.doesNotMatch(flightDetail, /<Heart[^>]*fill="transparent"/);
});
