import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buildHotelAmenityPresentation } from "../../../../../src/components/results/hotelAmenityPresentation";
import { colors } from "../../theme/tokens";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const card = source.slice(source.indexOf("function HotelCard"), source.indexOf("function Loading", source.indexOf("function HotelCard")));
const hotelList = source.slice(source.indexOf("sorted.map((x, i)"), source.indexOf("<PriceAlert", source.indexOf("sorted.map((x, i)")));
const amenities = readFileSync(resolve("src/features/search/HotelCardAmenityList.tsx"), "utf8");
const api = readFileSync(resolve("src/api/travelApi.ts"), "utf8");
const publicTypes = readFileSync(resolve("../../src/lib/types.ts"), "utf8");

test("hotel card keeps provider data but never prints its internal label", () => {
  assert.doesNotMatch(card, /result\.provider|s0\.providers/);
  assert.doesNotMatch(source, /providers:/);
  assert.match(api, /PublicHotelResult/);
});

test("hotel card gallery navigates and recovers failed images", () => { assert.match(card,/usableGallery\[activeImage\]/); assert.match(card,/Previous photo of/); assert.match(card,/Next photo of/); assert.match(card,/onError=/); assert.match(card,/Hotel image unavailable/); });
test("hotel actions independently save and share without share navigation", () => {
  assert.match(card, /<Heart\s/);
  assert.match(card, /canonical\.toggleHotel\(result, params\)/);
  assert.match(card, /accessibilityState=\{\{ selected: saved \}\}/);
  assert.match(card, /accessibilityLabel=\{saved \? `Remove \$\{result\.name\} from saved` : `Save \$\{result\.name\}`\}/);
  assert.match(card, /<Share2 /);
  assert.match(card, /accessibilityLabel=\{`Share \$\{result\.name\}`\}/);
  assert.match(card, /Share\.share\(\{ message \}\)/);
  const share = card.slice(card.indexOf("const shareHotel"), card.indexOf("return ("));
  assert.doesNotMatch(share, /router\.|toggleHotel/);
});

test("hotel utility colors match mobile web while saved and share states stay independent", () => {
  assert.match(source, /const HOTEL_UTILITY_ICON_COLOR = "#334155"/);
  assert.match(source, /const HOTEL_SAVED_HEART_COLOR = "#E11D48"/);
  assert.match(card, /color=\{saved \? HOTEL_SAVED_HEART_COLOR : HOTEL_UTILITY_ICON_COLOR\}/);
  assert.match(card, /fill=\{saved \? HOTEL_SAVED_HEART_COLOR : "none"\}/);
  assert.match(card, /<Share2 accessible=\{false\} size=\{20\} color=\{HOTEL_UTILITY_ICON_COLOR\} \/>/);
  assert.doesNotMatch(card, /<Heart[^>]*color=\{ui\.blue\}|<Share2[^>]*color=\{ui\.blue\}|fill=\{saved \? ui\.blue : "none"\}/s);
});

test("hotel location alone uses the exact web blue without changing typography", () => {
  const location = card.slice(card.indexOf("<View style={s0.hotelLocation}>"), card.indexOf("{score == null"));
  const locationTextStyle = source.slice(source.indexOf("  hotelLocationText:"), source.indexOf("\n", source.indexOf("  hotelLocationText:")));

  assert.equal(colors.blue, "#004BB8");
  assert.match(location, /<MapPin accessible=\{false\} size=\{14\} strokeWidth=\{2\} color=\{colors\.blue\} \/>/);
  assert.match(location, /<Text numberOfLines=\{1\} style=\{\[s0\.sub, s0\.hotelLocationText\]\}>\{result\.location\}<\/Text>/);
  assert.match(locationTextStyle, /color:\s*colors\.blue/);
  assert.doesNotMatch(location, /color=\{ui\.muted\}|style=\{s0\.sub\}/);
});

test("hotel utility icons move inward without shrinking or overlapping touch targets", () => {
  const hotelActionStyles = source.slice(source.indexOf("  hotelActions:"), source.indexOf("  hotelName:"));

  assert.match(hotelActionStyles, /hotelActions:\s*\{[^}]*flexDirection:\s*"row"[^}]*gap:\s*0/s);
  assert.match(hotelActionStyles, /hotelAction:\s*\{[^}]*width:\s*44[^}]*height:\s*44/s);
  assert.match(hotelActionStyles, /hotelSaveAction:\s*\{[^}]*alignItems:\s*"flex-end"[^}]*paddingRight:\s*4/s);
  assert.match(hotelActionStyles, /hotelShareAction:\s*\{[^}]*alignItems:\s*"flex-start"[^}]*paddingLeft:\s*4/s);
  const inwardOverrides = hotelActionStyles.slice(hotelActionStyles.indexOf("  hotelSaveAction:"));
  assert.doesNotMatch(inwardOverrides, /\b(?:width|height):|margin(?:Left|Right):\s*-/);
  assert.match(card, /style=\{\[s0\.hotelAction, s0\.hotelSaveAction\]\}/);
  assert.match(card, /style=\{\[s0\.hotelAction, s0\.hotelShareAction\]\}/);
});

test("hotel title matches mobile web typography without compromising actions", () => {
  const hotelNameStyle = source.slice(source.indexOf("  hotelName: {"), source.indexOf("  stars:"));
  assert.match(card, /<Text numberOfLines=\{2\} style=\{s0\.hotelName\}>/);
  assert.match(hotelNameStyle, /flex:\s*1/);
  assert.match(hotelNameStyle, /minWidth:\s*0/);
  assert.match(hotelNameStyle, /fontSize:\s*15/);
  assert.match(hotelNameStyle, /lineHeight:\s*20/);
  assert.match(hotelNameStyle, /fontWeight:\s*"700"/);
  assert.match(hotelNameStyle, /fontFamily:\s*appFonts\.bold/);
  assert.doesNotMatch(hotelNameStyle, /fontWeight:\s*"900"|appFonts\.black/);
  assert.match(source, /hotelAction:\s*\{[^}]*width:\s*44[^}]*height:\s*44/s);
});

test("only the global first priced hotel receives the green Cheapest badge", () => { assert.match(card,/showCheapestBadge && hasPrice/); assert.match(source,/\(clampedHotelPage - 1\) \* HOTEL_RESULTS_PAGE_SIZE \+ i === 0/); });
test("guest reviews are only rendered from a genuine reviewScore", () => {
  assert.match(card, /result\.reviewScore == null\s*\? null/);
  assert.match(card, /result\.reviewScore \* \(10 \/ \(result\.reviewScale \|\| 10\)\)/);
  assert.match(card, /\{score == null \? null : \(/);
  assert.doesNotMatch(card, /reviewScore == null[\s\S]{0,80}result\.rating/);
});

test("amenities use the shared semantic presentation and four neutral icon rows", () => {
  assert.match(card, /<HotelCardAmenityList amenities=\{result\.amenities\} \/>/);
  assert.match(amenities, /buildHotelAmenityPresentation\(amenities, 4\)/);
  for (const mapping of ["wifi: Wifi", "breakfast: Coffee", "petFriendly: PawPrint", "evCharging: BatteryCharging", "fitness: Dumbbell", "restaurant: UtensilsCrossed", "pool: Waves", "parking: CircleParking", "generic: CircleDot"]) {
    assert.match(amenities, new RegExp(mapping));
  }
  assert.doesNotMatch(amenities, /●/);

  const presented = buildHotelAmenityPresentation([
    "Wi-Fi", "Fitness centre", "Restaurant", "Breakfast", "Pool", "Mystery amenity",
  ], 10);
  assert.deepEqual(presented.map((item) => item.iconKey), ["pool", "fitness", "wifi", "breakfast", "restaurant", "generic"]);
  assert.equal(buildHotelAmenityPresentation(["Wi-Fi", "Free Wi-Fi"], 4).length, 1);
  assert.deepEqual(buildHotelAmenityPresentation(["Free cancellation", "Pay later"], 4), []);
});

test("Hotel cards preserve truthful price and use View hotel", () => { assert.match(card,/const hasPrice = hasHotelPrice\(result\)/); assert.match(card,/"Price unavailable"/); assert.match(card,/`View hotel for/); assert.match(card,/>View hotel<\/Text>/); });
