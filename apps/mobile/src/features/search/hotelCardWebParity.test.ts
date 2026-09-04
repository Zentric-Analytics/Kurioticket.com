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
const searchUi = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
const webHotelCard = readFileSync(resolve("../../src/components/results/HotelCard.tsx"), "utf8");

test("hotel card keeps provider data but never prints its internal label", () => {
  assert.doesNotMatch(card, /result\.provider|s0\.providers/);
  assert.doesNotMatch(source, /providers:/);
  assert.match(api, /PublicHotelResult/);
});

test("hotel card gallery navigates, loops, and recovers failed images", () => {
  assert.match(card, /usableGallery\[activeImage\]/);
  assert.match(card, /usableGallery\.length>1/);
  assert.match(card, /accessibilityRole="button" accessibilityLabel=\{`Previous photo of \$\{result\.name\}`\}/);
  assert.match(card, /accessibilityRole="button" accessibilityLabel=\{`Next photo of \$\{result\.name\}`\}/);
  assert.match(card, /setActiveImage\(index=>\(index-1\+usableGallery\.length\)%usableGallery\.length\)/);
  assert.match(card, /setActiveImage\(index=>\(index\+1\)%usableGallery\.length\)/);
  assert.match(card, /onError=/);
  assert.match(card, /Hotel image unavailable/);
});

test("hotel card galleries use transparent 44dp edge controls matching mobile web", () => {
  const galleryStyles = source.slice(source.indexOf("  galleryControl:"), source.indexOf("  overlay:"));

  assert.match(galleryStyles, /galleryControl:\s*\{[^}]*position:\s*"absolute"[^}]*top:\s*"50%"[^}]*width:\s*44[^}]*height:\s*44/s);
  assert.match(galleryStyles, /transform:\s*\[\{translateY:\s*-22\}\]/);
  assert.match(galleryStyles, /galleryPrevious:\s*\{left:\s*0\}/);
  assert.match(galleryStyles, /galleryNext:\s*\{right:\s*0\}/);
  assert.match(galleryStyles, /galleryIconPrevious:\s*\{transform:\s*\[\{translateX:\s*-6\}\]\}/);
  assert.match(galleryStyles, /galleryIconNext:\s*\{transform:\s*\[\{translateX:\s*6\}\]\}/);
  assert.doesNotMatch(galleryStyles, /top:\s*"42%"|backgroundColor|borderRadius|left:\s*2|right:\s*2/);

  assert.match(source, /const HOTEL_GALLERY_CHEVRON_CONTRAST = "rgba\(0,0,0,0\.85\)"/);
  assert.match(galleryStyles, /galleryChevronStack:\s*\{width:\s*20,height:\s*20\}/);
  assert.match(galleryStyles, /galleryChevronUnderlay:\s*\{position:\s*"absolute",left:\s*0,top:\s*0\}/);
  for (const direction of ["Left", "Right"]) {
    const stack = new RegExp(
      `<View accessible=\\{false\\} importantForAccessibility="no-hide-descendants" pointerEvents="none" style=\\{\\[s0\\.galleryChevronStack,s0\\.galleryIcon${direction === "Left" ? "Previous" : "Next"}\\]\\}>` +
      `[\\s\\S]*?<Chevron${direction} accessible=\\{false\\} color=\\{HOTEL_GALLERY_CHEVRON_CONTRAST\\} size=\\{20\\} strokeWidth=\\{4\\} style=\\{s0\\.galleryChevronUnderlay\\}/>` +
      `[\\s\\S]*?<Chevron${direction} accessible=\\{false\\} color="white" size=\\{20\\} strokeWidth=\\{2\\.2\\}/>` +
      `[\\s\\S]*?</View>`,
    );
    assert.match(card, stack);
  }
  assert.doesNotMatch(galleryStyles, /rgba\(0,0,0,\.48\)/);
});
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

test("hotel location uses compact dedicated native typography", () => {
  const location = card.slice(card.indexOf("<View style={s0.hotelLocation}>"), card.indexOf("{score == null"));
  const locationStyles = source.slice(source.indexOf("  hotelLocation:"), source.indexOf("  starsMeta:"));

  assert.equal(colors.blue, "#004BB8");
  assert.match(location, /<MapPin accessible=\{false\} size=\{14\} strokeWidth=\{2\} color=\{colors\.blue\} \/>/);
  assert.match(location, /<Text numberOfLines=\{1\} ellipsizeMode="tail" style=\{s0\.hotelLocationText\}>\{result\.location\}<\/Text>/);
  assert.match(locationStyles, /hotelLocation:\s*\{[^}]*flexDirection:\s*"row"[^}]*alignItems:\s*"center"[^}]*gap:\s*4[^}]*minWidth:\s*0/s);
  assert.match(locationStyles, /hotelLocationText:\s*\{[^}]*flexShrink:\s*1[^}]*minWidth:\s*0[^}]*color:\s*colors\.blue[^}]*fontSize:\s*12[^}]*lineHeight:\s*16[^}]*fontWeight:\s*"600"[^}]*fontFamily:\s*appFonts\.semibold/s);
  assert.doesNotMatch(location, /s0\.sub|color=\{ui\.muted\}/);
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

test("Hotel utility actions leave title flow while retaining full parent-owned hit targets", () => {
  const copyStart = card.indexOf('<View style={[s0.hotelCopy, compact && s0.hotelCopyCompact]}>');
  const cheapestStart = card.indexOf("{showCheapestBadge && hasPrice", copyStart);
  const copyHeading = card.slice(copyStart, cheapestStart);
  const titleStart = copyHeading.indexOf('<View style={s0.hotelTitleRow}>');
  const titleEnd = copyHeading.indexOf("</View>", titleStart) + "</View>".length;
  const titleRow = copyHeading.slice(titleStart, titleEnd);
  const actionsStart = copyHeading.indexOf('<View style={[s0.hotelActions, compact && s0.hotelActionsCompact]}>');

  assert.ok(copyStart >= 0 && cheapestStart > copyStart);
  assert.ok(titleStart >= 0 && titleEnd > titleStart);
  assert.match(titleRow, /<Text numberOfLines=\{2\} style=\{s0\.hotelName\}>\{result\.name\}<\/Text>/);
  assert.doesNotMatch(titleRow, /hotelActions|<Pressable/);
  assert.ok(actionsStart > titleEnd, "actions must be a sibling after the closed title row");
  assert.ok(actionsStart < cheapestStart, "actions must precede Cheapest and star metadata");

  const copyStyles = source.slice(source.indexOf("  hotelCopy:"), source.indexOf("  hotelAction:"));
  assert.match(copyStyles, /hotelCopy:\s*\{[^}]*position:\s*"relative"[^}]*flex:\s*1[^}]*minWidth:\s*0[^}]*padding:\s*12[^}]*gap:\s*4/s);
  assert.match(copyStyles, /hotelCopyCompact:\s*\{[^}]*padding:\s*10/s);
  assert.match(copyStyles, /hotelTitleRow:\s*\{[^}]*minWidth:\s*0[^}]*paddingRight:\s*80/s);
  assert.doesNotMatch(copyStyles.match(/hotelTitleRow:\s*\{[^}]*\}/s)?.[0] ?? "", /\b(?:height|minHeight):\s*44|paddingBottom:\s*(?:20|24)/);
  assert.match(copyStyles, /hotelActions:\s*\{[^}]*position:\s*"absolute"[^}]*zIndex:\s*2[^}]*top:\s*4[^}]*right:\s*4[^}]*flexDirection:\s*"row"/s);
  assert.match(copyStyles, /hotelActionsCompact:\s*\{[^}]*top:\s*2[^}]*right:\s*2/s);
  const actionsStyle = copyStyles.match(/hotelActions:\s*\{[^}]*\}/s)?.[0] ?? "";
  assert.doesNotMatch(actionsStyle, /marginTop|marginRight/);
});

test("Hotel spacing has no star or Cheapest position compensation", () => {
  const starsStyle = source.match(/\n  stars:\s*\{[^}]*\}/s)?.[0] ?? "";
  const badgeStyle = source.match(/\n  hotelBadge:\s*\{[^}]*\}/s)?.[0] ?? "";

  assert.doesNotMatch(starsStyle, /marginTop:\s*-|translateY|\btop:|position:\s*"absolute"/);
  assert.doesNotMatch(badgeStyle, /marginTop:\s*-|translateY|\btop:|position:\s*"absolute"/);
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

test("amenities use readable compact native metadata typography", () => {
  assert.match(amenities, /<Icon accessible=\{false\} size=\{14\} strokeWidth=\{1\.8\} color=\{ui\.muted\} \/>/);
  assert.match(amenities, /list:\s*\{[^}]*gap:\s*3[^}]*\}/s);
  assert.match(amenities, /item:\s*\{[^}]*flexDirection:\s*"row"[^}]*alignItems:\s*"center"[^}]*gap:\s*5[^}]*minWidth:\s*0[^}]*\}/s);
  assert.match(amenities, /label:\s*\{[^}]*flexShrink:\s*1[^}]*minWidth:\s*0[^}]*color:\s*ui\.muted[^}]*fontSize:\s*11[^}]*lineHeight:\s*15[^}]*fontWeight:\s*"500"[^}]*fontFamily:\s*appFonts\.medium[^}]*\}/s);
  assert.match(amenities, /import \{ appFonts \} from "\.\.\/\.\.\/theme\/typography"/);
});

test("hotel cards use a natural 260dp minimum and preserve bottom-aligned price rhythm", () => {
  const cardStyle = source.match(/\n  hotelCard:\s*\{[^}]*\}/s)?.[0] ?? "";
  const priceStyles = source.slice(source.indexOf("  hotelPrice:"), source.indexOf("\n", source.indexOf("  hotelDealButtonText:")));
  const priceStyle = source.match(/\n  hotelPrice:\s*\{[^}]*\}/s)?.[0] ?? "";

  assert.match(card, /<View style=\{s0\.hotelCard\}>/);
  assert.match(cardStyle, /minHeight:\s*260/);
  assert.doesNotMatch(cardStyle, /(?:^|[,\s])height:\s*260/);
  assert.doesNotMatch(source, /hotelCardCompact|(?:minHeight|height):\s*292/);
  assert.match(priceStyle, /marginTop:\s*"auto"/);
  assert.match(priceStyle, /paddingTop:\s*8/);
  assert.doesNotMatch(priceStyle, /marginTop:\s*-|translateY|position:\s*"absolute"|\bbottom:/);
  assert.match(priceStyles, /hotelPerNight:\s*\{[^}]*marginTop:\s*1/s);
  assert.match(priceStyles, /hotelDealButton:\s*\{[^}]*marginTop:\s*6/s);
  assert.doesNotMatch(amenities, /position:\s*"absolute"|translateY/);
});

test("View hotel uses the web brand blue and matching pressed treatment", () => {
  const dealButtonStyle = source.match(/\n  hotelDealButton:\s*\{[^}]*\}/s)?.[0] ?? "";
  const dealButtonPressedStyle = source.match(/\n  hotelDealButtonPressed:\s*\{[^}]*\}/s)?.[0] ?? "";

  assert.equal(colors.blue, "#004BB8");
  assert.match(dealButtonStyle, /backgroundColor:\s*colors\.blue/);
  assert.doesNotMatch(dealButtonStyle, /backgroundColor:\s*ui\.blue/);
  assert.match(dealButtonPressedStyle, /backgroundColor:\s*"#003B91"/);
  assert.match(card, /style=\{\(\{ pressed \}\) => \[s0\.hotelDealButton, pressed && s0\.hotelDealButtonPressed\]\}/);
  assert.match(searchUi, /blue:\s*"#0754F7"/);
  assert.match(webHotelCard, /bg-\[#004BB8\]/);
  assert.match(webHotelCard, /hover:bg-\[#003B91\]/);
});

test("Hotel cards preserve truthful price and use View hotel", () => { assert.match(card,/const hasPrice = hasHotelPrice\(result\)/); assert.match(card,/"Price unavailable"/); assert.match(card,/`View hotel for/); assert.match(card,/>View hotel<\/Text>/); });
