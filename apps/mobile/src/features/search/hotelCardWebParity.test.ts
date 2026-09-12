import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buildHotelAmenityPresentation } from "../../../../../src/components/results/hotelAmenityPresentation";
import { colors } from "../../theme/tokens";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const card = source.slice(source.indexOf("function HotelCard"), source.indexOf("function Loading", source.indexOf("function HotelCard")));
const amenities = readFileSync(resolve("src/features/search/HotelCardAmenityList.tsx"), "utf8");
const api = readFileSync(resolve("src/api/travelApi.ts"), "utf8");
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
});

test("hotel actions independently save and share without share navigation", () => {
  assert.match(card, /<Heart\s/);
  assert.match(card, /canonical\.toggleHotel\(result, params\)/);
  assert.match(card, /accessibilityState=\{\{ selected: saved \}\}/);
  assert.match(card, /<Share2 /);
  assert.match(card, /Share\.share\(\{ message \}\)/);
  const share = card.slice(card.indexOf("const shareHotel"), card.indexOf("return ("));
  assert.doesNotMatch(share, /router\.|toggleHotel/);
});

test("hotel favorite uses canonical states while share keeps its utility color", () => {
  assert.match(source, /const HOTEL_UTILITY_ICON_COLOR = "#334155"/);
  assert.match(card, /color=\{saved \? androidFavoriteColors\.savedStroke : androidFavoriteColors\.unsavedStroke\}/);
  assert.match(card, /fill=\{saved \? androidFavoriteColors\.savedFill : androidFavoriteColors\.unsavedFill\}/);
  assert.match(card, /<Share2 accessible=\{false\} size=\{20\} color=\{theme\.dark \? theme\.icon : HOTEL_UTILITY_ICON_COLOR\} \/>/);
});

test("hotel location uses compact dedicated native typography", () => {
  const location = card.slice(card.indexOf("<View style={s0.hotelLocation}>"), card.indexOf("{score == null"));
  const locationStyles = source.slice(source.indexOf("  hotelLocation:"), source.indexOf("  review:"));
  assert.equal(colors.blue, "#004BB8");
  assert.match(location, /<MapPin accessible=\{false\} size=\{14\} strokeWidth=\{2\} color=\{colors\.blue\} \/>/);
  assert.match(location, /<Text numberOfLines=\{1\} ellipsizeMode="tail" style=\{s0\.hotelLocationText\}>\{result\.location\}<\/Text>/);
  assert.match(locationStyles, /hotelLocationText:\s*\{[^}]*fontSize:\s*12[^}]*lineHeight:\s*16[^}]*fontWeight:\s*"600"/s);
});

test("hotel utility icons retain full touch targets", () => {
  const hotelActionStyles = source.slice(source.indexOf("  hotelActions:"), source.indexOf("  hotelName:"));
  assert.match(hotelActionStyles, /hotelAction:\s*\{[^}]*width:\s*44[^}]*height:\s*44/s);
  assert.match(hotelActionStyles, /hotelSaveAction:\s*\{[^}]*paddingRight:\s*4/s);
  assert.match(hotelActionStyles, /hotelShareAction:\s*\{[^}]*paddingLeft:\s*4/s);
});

test("Hotel utility actions leave title flow", () => {
  const copyStart = card.indexOf('<View style={[s0.hotelCopy, compact && s0.hotelCopyCompact]}>');
  const cheapestStart = card.indexOf("{showCheapestBadge && hasPrice", copyStart);
  const copyHeading = card.slice(copyStart, cheapestStart);
  const titleStart = copyHeading.indexOf('<View style={s0.hotelTitleRow}>');
  const actionsStart = copyHeading.indexOf('<View style={[s0.hotelActions, compact && s0.hotelActionsCompact]}>');
  assert.ok(copyStart >= 0 && cheapestStart > copyStart && titleStart >= 0 && actionsStart > titleStart);
  const copyStyles = source.slice(source.indexOf("  hotelCopy:"), source.indexOf("  hotelAction:"));
  assert.match(copyStyles, /hotelCopy:\s*\{[^}]*padding:\s*12[^}]*gap:\s*4/s);
  assert.match(copyStyles, /hotelCopyCompact:\s*\{[^}]*padding:\s*8/s);
  assert.match(copyStyles, /hotelTitleRow:\s*\{[^}]*paddingRight:\s*80/s);
});

test("hotel title matches mobile web typography", () => {
  const hotelNameStyle = source.slice(source.indexOf("  hotelName: {"), source.indexOf("  stars:"));
  assert.match(hotelNameStyle, /fontSize:\s*15/);
  assert.match(hotelNameStyle, /lineHeight:\s*20/);
  assert.match(hotelNameStyle, /fontWeight:\s*"700"/);
  assert.match(hotelNameStyle, /fontFamily:\s*appFonts\.bold/);
});

test("only the actual lowest comparable filtered hotel receives the green Cheapest badge", () => {
  assert.match(card,/showCheapestBadge && hasPrice/);
  assert.match(source,/getLowestPricedHotelId\(filteredHotelResults, currencyState\?\.rates\)/);
  assert.match(source,/showCheapestBadge=\{item\.id === cheapestHotelId\}/);
  assert.doesNotMatch(source,/\(clampedHotelPage - 1\) \* HOTEL_RESULTS_PAGE_SIZE \+ i === 0/);
});

test("guest reviews are only rendered from a genuine reviewScore", () => {
  assert.match(card, /result\.reviewScore == null\s*\? null/);
  assert.match(card, /result\.reviewScore \* \(10 \/ \(result\.reviewScale \|\| 10\)\)/);
  assert.match(card, /\{score == null \? null : \(/);
});

test("amenities use the shared semantic presentation and four neutral icon rows", () => {
  assert.match(card, /<HotelCardAmenityList amenities=\{result\.amenities\} \/>/);
  assert.match(amenities, /buildHotelAmenityPresentation\(amenities, 4\)/);
  const presented = buildHotelAmenityPresentation(["Wi-Fi", "Fitness centre", "Restaurant", "Breakfast", "Pool", "Mystery amenity"], 10);
  assert.deepEqual(presented.map((item) => item.iconKey), ["pool", "fitness", "wifi", "breakfast", "restaurant", "generic"]);
});

test("amenities use readable compact native metadata typography", () => {
  assert.match(amenities, /fontSize:\s*11[^}]*lineHeight:\s*15[^}]*fontWeight:\s*"500"/s);
});

test("compact hotel cards follow the measured reference aspect while preserving bottom price rhythm", () => {
  const cardStyle = source.match(/\n  hotelCard:\s*\{[^}]*\}/s)?.[0] ?? "";
  const priceStyle = source.match(/\n  hotelPrice:\s*\{[^}]*\}/s)?.[0] ?? "";
  assert.match(cardStyle, /minHeight:\s*260/);
  assert.match(card, /const compactCardMinHeight = Math\.round\(\(viewportWidth - 32\) \* 0\.7\)/);
  assert.match(card, /compact && \{ minHeight: compactCardMinHeight \}/);
  assert.match(priceStyle, /marginTop:\s*"auto"/);
  assert.match(priceStyle, /paddingTop:\s*8/);
  assert.match(source, /hotelImageWrap:\s*\{ width: "39%"/);
  assert.match(source, /hotelImageWrapCompact:\s*\{ width: "38%" \}/);
});

test("Hotel card shell preserves its split layout with Flight-family depth", () => {
  const cardStyle = source.match(/\n  hotelCard:\s*\{[^}]*\}/s)?.[0] ?? "";
  assert.match(cardStyle, /borderRadius:\s*13/);
  assert.match(cardStyle, /flexDirection:\s*"row"/);
  assert.match(source, /shadowOffset: \{ width: 0, height: 2 \}, shadowOpacity: 0\.08, shadowRadius: 10, elevation: 2/);
});

test("View hotel uses the web brand blue and compact reference geometry", () => {
  const dealButtonStyle = source.match(/\n  hotelDealButton:\s*\{[^}]*\}/s)?.[0] ?? "";
  assert.equal(colors.blue, "#004BB8");
  assert.match(dealButtonStyle, /backgroundColor:\s*colors\.blue/);
  assert.match(source, /hotelDealButtonCompact: \{ minHeight: 36, minWidth: 92, paddingHorizontal: 12 \}/);
  assert.match(card, /hitSlop=\{4\}/);
  assert.match(card, /style=\{\(\{ pressed \}\) => \[s0\.hotelDealButton, compact && s0\.hotelDealButtonCompact, pressed && s0\.hotelDealButtonPressed\]\}/);
  assert.match(searchUi, /blue:\s*"#0754F7"/);
  assert.match(webHotelCard, /bg-\[#004BB8\]/);
});

test("Hotel cards preserve truthful price and use View hotel", () => {
  assert.match(card,/const hasPrice = hasHotelPrice\(result\)/);
  assert.match(card,/"Price unavailable"/);
  assert.match(card,/`View hotel for/);
  assert.match(card,/>View hotel<\/Text>/);
});
