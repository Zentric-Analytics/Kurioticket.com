import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buildHotelAmenityPresentation } from "../../../../../src/components/results/hotelAmenityPresentation";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const card = source.slice(source.indexOf("function HotelCard"), source.indexOf("function Loading", source.indexOf("function HotelCard")));
const amenities = readFileSync(resolve("src/features/search/HotelCardAmenityList.tsx"), "utf8");
const api = readFileSync(resolve("src/api/travelApi.ts"), "utf8");

test("hotel card keeps provider data but never prints its internal label", () => {
  assert.doesNotMatch(card, /result\.provider|s0\.providers/);
  assert.doesNotMatch(source, /providers:/);
  assert.match(api, /PublicHotelResult/);
});

test("hotel actions independently save and share without share navigation", () => {
  assert.match(card, /<Heart /);
  assert.match(card, /canonical\.toggleHotel\(result, params\)/);
  assert.match(card, /accessibilityState=\{\{ selected: saved \}\}/);
  assert.match(card, /accessibilityLabel=\{saved \? `Remove \$\{result\.name\} from saved` : `Save \$\{result\.name\}`\}/);
  assert.match(card, /<Share2 /);
  assert.match(card, /accessibilityLabel=\{`Share \$\{result\.name\}`\}/);
  assert.match(card, /Share\.share\(\{ message \}\)/);
  const share = card.slice(card.indexOf("const shareHotel"), card.indexOf("return ("));
  assert.doesNotMatch(share, /router\.|toggleHotel/);
});

test("ranking, stars, and location follow the web-like hierarchy", () => {
  for (const label of ["Best overall", "Great price", "Highly rated"]) assert.match(card, new RegExp(label));
  const image = card.slice(card.indexOf("s0.hotelImageWrap"), card.indexOf("s0.hotelCopy"));
  assert.doesNotMatch(image, /hotelBadge|rankLabel/);
  assert.match(card, /<View style=\{s0\.hotelBadge\}><Badge>\{rankLabel\}<\/Badge><\/View>/);
  assert.match(card, /<MapPin accessible=\{false\}/);
  assert.match(card, />\{result\.location\}<\/Text>/);
  assert.doesNotMatch(card, /⌾|distanceFromCenter|neighbourhood/);
  const stars = card.slice(card.indexOf("accessibilityLabel={`${classificationStars}"), card.indexOf("s0.hotelLocation"));
  assert.match(stars, /"★"\.repeat\(classificationStars\)/);
  assert.doesNotMatch(stars, /neighbourhood|location| · /);
});

test("guest reviews are only rendered from a genuine reviewScore", () => {
  assert.match(card, /result\.reviewScore == null\s*\? null/);
  assert.match(card, /result\.reviewScore \* \(10 \/ \(result\.reviewScale \|\| 10\)\)/);
  assert.match(card, /\{score == null \? null : \(/);
  assert.doesNotMatch(card, /reviewScore == null[\s\S]{0,80}result\.rating/);
});

test("amenities use the shared semantic presentation and four neutral icon rows", () => {
  assert.match(card, /<HotelCardAmenityList amenities=\{result\.amenities\} \/>/);
  assert.match(amenities, /buildHotelAmenityPresentation\(amenities, 4\)/);
  for (const mapping of ["wifi: Wifi", "breakfast: Coffee", "fitness: Dumbbell", "restaurant: UtensilsCrossed", "pool: Waves", "parking: CircleParking", "generic: CircleDot"]) {
    assert.match(amenities, new RegExp(mapping));
  }
  assert.doesNotMatch(amenities, /●/);

  const presented = buildHotelAmenityPresentation([
    "Wi-Fi", "Fitness centre", "Restaurant", "Breakfast", "Pool", "Mystery amenity",
  ], 10);
  assert.deepEqual(presented.map((item) => item.iconKey), ["wifi", "breakfast", "pool", "fitness", "restaurant", "generic"]);
  assert.equal(buildHotelAmenityPresentation(["Wi-Fi", "Free Wi-Fi"], 4).length, 1);
  assert.deepEqual(buildHotelAmenityPresentation(["Free cancellation", "Pay later"], 4), []);
});

test("price and Hotel Details search context remain intact", () => {
  assert.match(card, /result\.pricePerNight/);
  assert.match(card, /result\.totalPrice/);
  assert.match(card, /pathname: "\/hotel-details"/);
  assert.match(card, /result: JSON\.stringify\(result\)/);
  assert.match(card, /Object\.entries\(params\)/);
});
