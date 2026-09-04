import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const resultsSource = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const resultCard = resultsSource.slice(
  resultsSource.indexOf("function HotelCard"),
  resultsSource.indexOf("function Loading", resultsSource.indexOf("function HotelCard")),
);
const detailsSource = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const hotelDetail = detailsSource.slice(
  detailsSource.indexOf("function HotelDetail"),
  detailsSource.indexOf("const detailIcons"),
);

test("discovery Hotel results never imply live price, saves, or classification", () => { assert.match(resultCard,/showCheapestBadge && hasPrice/); assert.match(resultCard,/classificationStars > 0/); assert.match(resultCard,/"Price unavailable"/); assert.match(resultCard,/disabled=\{!hasPrice && !saved\}/); });
test("source-backed discovery Hotel details remain planning-only", () => {
  assert.match(hotelDetail, /const discovery = result\.inventoryKind === "discovery"/);
  assert.match(hotelDetail, />Live room options unavailable</);
  assert.match(hotelDetail, /No live room, price, or availability was supplied/);
  assert.match(hotelDetail, /\{discovery \? <View[\s\S]*?: <Pressable/);
  assert.match(hotelDetail, /price=\{hasPrice \? totalPrice\?\.formatted \?\? "—" : "Price unavailable"\}/);
  assert.match(hotelDetail, /disabled=\{!bookable\}/);
  assert.match(hotelDetail, /"Live booking unavailable"/);
  assert.match(hotelDetail, /"No live provider redirect was supplied\."/);
  assert.match(hotelDetail, /discovery \? "Inventory source" : "Choose where to book"/);
  assert.match(hotelDetail, /selected=\{!discovery\}/);
  assert.match(detailsSource, /\{onSelect \? <Button label="Select" onPress=\{onSelect\} \/> : null\}/);
});

test("Hotel details suppress absent stars, reviews, amenities, and fake room facts", () => {
  assert.match(hotelDetail, /const classification = result\.classificationStars \|\| Math\.round\(result\.rating\)/);
  assert.match(hotelDetail, /classification > 0 \?/);
  assert.match(hotelDetail, /const reviewValue = result\.reviewScore \?\? result\.rating/);
  assert.match(hotelDetail, /reviewValue > 0 \?/);
  assert.match(hotelDetail, /result\.amenities\.length \? <>/);
  assert.match(hotelDetail, /result\.roomType \|\| "Room option"/);
  assert.doesNotMatch(hotelDetail, /result\.roomType \|\| "Standard Room"/);
});

test("compact Hotel details keep occupancy and sticky booking content within the viewport", () => {
  assert.match(detailsSource, /import \{ HOTEL_LIMITS \} from "\.\.\/flow\/hotelSearchModel"/);
  assert.match(hotelDetail, /const guestCount = positiveCount\(params\.guests, 2, HOTEL_LIMITS\.guests\.max\)/);
  assert.match(hotelDetail, /const roomCount = positiveCount\(params\.rooms, 1, HOTEL_LIMITS\.rooms\.max\)/);
  assert.match(hotelDetail, /d\.hotelIdentity/);
  assert.match(hotelDetail, /d\.hotelGallery/);
  assert.match(hotelDetail, /d\.hotelTabs/);
  assert.match(hotelDetail, /style=\{d\.stickyTotal\}/);
  assert.match(hotelDetail, /style=\{d\.stickyCta\}/);
  assert.match(hotelDetail, /adjustsFontSizeToFit minimumFontScale=\{0\.65\}/);
});
