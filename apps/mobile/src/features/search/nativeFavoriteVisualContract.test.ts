import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const shared = source("src/features/home/AndroidFavoriteButton.tsx");
const carResult = source("src/features/search/CarResultCard.tsx");
const carDetail = source("src/features/search/ApprovedCarDetailScreen.tsx");
const hotelResult = source("src/features/search/ApprovedResultsScreen.tsx");
const hotelDetail = source("src/features/search/ApprovedDetailScreen.tsx");
const flightDetail = source("src/features/search/NativeFlightDetails.tsx");
const explore = source("src/features/explore/ExploreScreen.tsx");

const canonicalFlowHeart = /<FlowIcon name="heart"[^>]*color=\{androidFavoriteColors\.stroke\}[^>]*fill=\{([^}]*)androidFavoriteColors\.savedFill([^}]*)androidFavoriteColors\.unsavedFill[^}]*\}/;
const canonicalHeart = /<Heart[^>]*color=\{androidFavoriteColors\.stroke\}[^>]*fill=\{([^}]*)androidFavoriteColors\.savedFill([^}]*)androidFavoriteColors\.unsavedFill[^}]*\}/;

test("native favorite tokens make the state contract explicit and theme-independent", () => {
  assert.match(shared, /stroke: "#E92D55"/);
  assert.match(shared, /savedFill: "#E92D55"/);
  assert.match(shared, /unsavedFill: "#FFFFFF"/);
  assert.doesNotMatch(shared, /active:|inactive:|useColorScheme|theme/);
});

test("every direct native interactive favorite uses the canonical stroke and fill contract", () => {
  assert.match(shared, canonicalFlowHeart);
  assert.match(carResult, canonicalFlowHeart);
  assert.match(explore, canonicalFlowHeart);
  for (const detail of [carDetail, hotelResult, hotelDetail, flightDetail]) assert.match(detail, canonicalHeart);
});

test("legacy interactive favorite colors and empty fills cannot return", () => {
  const interactiveSources = [shared, carResult, carDetail, hotelResult, hotelDetail, flightDetail, explore];
  for (const file of interactiveSources) {
    assert.doesNotMatch(file, /androidFavoriteColors\.(?:active|inactive)|HOTEL_SAVED_HEART_COLOR/);
  }
  assert.doesNotMatch(carResult, /name="heart"[^>]*(?:theme\.icon|fill="(?:transparent|none)")/);
  assert.doesNotMatch(carDetail, /<Heart[^>]*(?:#075EE8|theme\.icon|fill="none")/);
  assert.doesNotMatch(hotelResult, /<Heart[^>]*(?:#E11D48|theme\.icon|HOTEL_UTILITY_ICON_COLOR|fill="none")/);
  assert.doesNotMatch(hotelDetail, /<Heart[^>]*(?:hotelIdentityActionColor|fill="transparent")/);
  assert.doesNotMatch(flightDetail, /<Heart[^>]*(?:theme\.icon|fill="transparent")/);
});
