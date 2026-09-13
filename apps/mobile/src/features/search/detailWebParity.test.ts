import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotelSource = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const hotel = hotelSource.slice(hotelSource.indexOf("function HotelDetail"));
const bookingDetails = readFileSync("src/features/search/NativeHotelBookingDetails.tsx", "utf8");
const gallery = readFileSync("src/features/search/NativeHotelDetails.tsx", "utf8");
const stayEditor = readFileSync("src/features/search/HotelStayEditor.tsx", "utf8");
const car = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const tokens = readFileSync("src/theme/tokens.ts", "utf8");
const appTheme = readFileSync("src/theme/AppTheme.tsx", "utf8");
const webHotelDetails = readFileSync(
  "../../src/components/results/hotelDetails/StandaloneHotelDetails.tsx",
  "utf8",
);
const webSectionNav = readFileSync(
  "../../src/components/results/hotelDetails/HotelDetailsSectionNav.tsx",
  "utf8",
);
const nativeLocation = readFileSync(
  "src/features/search/NativeHotelLocationSection.tsx",
  "utf8",
);
const reviews = readFileSync(
  "src/features/search/NativeHotelReviewsSection.tsx",
  "utf8",
);

function hotelStyle(name: string, nextName: string) {
  const start = hotelSource.indexOf(`  ${name}:`);
  const end = hotelSource.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return hotelSource.slice(start, end);
}

test("active Hotel details follow hero, identity, tabs, stay editor, and content hierarchy", () => {
  assert.doesNotMatch(hotel, />Back to hotel results<\/Text>/);
  assert.match(stayEditor, /<CalendarDays accessible=\{false\} size=\{22\}/);
  assert.match(hotel, /<Users accessible=\{false\} size=\{18\}/);
  assert.ok(hotel.indexOf("<NativeHotelGallery") < hotel.indexOf("<View style={s.identity}>"));
  assert.ok(hotel.indexOf("<View style={s.identity}>") < hotel.indexOf('accessibilityRole="tablist"'));
  assert.ok(hotel.indexOf('accessibilityRole="tablist"') < hotel.indexOf("<HotelStayEditor"));
  assert.ok(hotel.indexOf("<HotelStayEditor") < hotel.indexOf("<View style={s.detailBody}>"));
  assert.match(hotel, /stickyHeaderIndices=\{\[2\]\}/);
  assert.match(hotel, /\["details", "reviews", "deals"\]/);
  assert.match(hotel, /<NativeHotelBookingDetails/);
  assert.match(hotel, /<NativeHotelReviewsSection result=\{result\} \/>/);
  assert.match(hotel, /activeHotelTab === "deals"/);
});

test("active Hotel Details keeps fixed icon-only controls and stack-aware Results navigation", () => {
  const heroStart = hotel.indexOf("<View style={s.heroShell}>");
  const heroEnd = hotel.indexOf("<View style={s.identity}>", heroStart);
  const hero = hotel.slice(heroStart, heroEnd);
  const scrollEnd = hotel.indexOf("</ScrollView>");
  const backControl = hotel.indexOf('accessibilityLabel="Back to hotel results"');
  const returnNavigation = hotel.slice(
    hotel.indexOf("const returnToHotelResults"),
    hotel.indexOf("const titleColor"),
  );

  assert.match(hotelStyle("heroBack", "heroActions"), /left: 20[^}]*width: 44[^}]*height: 44[^}]*borderRadius: 22[^}]*zIndex: 20/);
  assert.match(hotelStyle("heroActions", "heroAction"), /right: 20[^}]*width: 112[^}]*height: 44[^}]*borderRadius: 22[^}]*zIndex: 20/);
  assert.doesNotMatch(hero, /accessibilityLabel="Back to hotel results"/);
  assert.ok(scrollEnd >= 0 && scrollEnd < backControl, "fixed hotel controls must sit outside the scrolling content");
  assert.match(hotel, /accessibilityLabel="Back to hotel results"[\s\S]*?onPress=\{returnToHotelResults\}[\s\S]*?s\.heroBack/);
  assert.match(hotel, /<ArrowLeft size=\{25\} strokeWidth=\{2\.2\} color="#0F172A" \/>/);
  assert.doesNotMatch(hotel, />Back to hotel results<\/Text>/);
  assert.match(returnNavigation, /if \(hotelResultsStack\) \{/);
  assert.match(returnNavigation, /hotelResultsDismissCount\(navigation\.getState\(\)\)/);
  assert.match(returnNavigation, /router\.dismiss\(dismissCount\);\s*return;/);
  assert.match(returnNavigation, /router\.replace\(\{\s*pathname: "\/hotel-results"/);
  assert.doesNotMatch(returnNavigation, /router\.back\(|router\.dismissTo/);
});

test("active Hotel light canvas matches the web white article while allowing a full-bleed hero", () => {
  assert.match(appTheme, /lightTheme = \{[\s\S]*?background: "#FAFBFF",[\s\S]*?surface: "#FFFFFF",/);
  assert.match(webHotelDetails, /<article className="[^"]*\bbg-white\b[^"]*">/);
  assert.match(hotel, /const hotelCanvasColor = theme\.dark \? theme\.background : theme\.surface;/);
  assert.match(hotel, /<SafeAreaView[\s\S]*?backgroundColor: hotelCanvasColor[\s\S]*?edges=\{\[\]\}/);
  assert.match(hotel, /<ScrollView[\s\S]*?stickyHeaderIndices=\{\[2\]\}[\s\S]*?contentInsetAdjustmentBehavior="never"[\s\S]*?backgroundColor: hotelCanvasColor/);
  assert.match(hotel, /const hotelStickyTabsTop = inset\.top \+ 72/);
  assert.match(hotel, /s\.tabsShell,[\s\S]*?paddingTop: hotelStickyTabsTop,[\s\S]*?marginTop: 1 - hotelStickyTabsTop,[\s\S]*?backgroundColor: hotelTabsPinned \? hotelCanvasColor : "transparent"/);
  assert.match(hotel, /style=\{\[s\.tabsRow, \{ backgroundColor: hotelCanvasColor \}\]\}/);
  assert.match(hotel, /backgroundColor: hotelCanvasColor/);
  assert.doesNotMatch(hotel, /Platform\.OS/);
});

test("active Hotel section navigation keeps one deterministic compact tab row", () => {
  const shellStyle = hotelStyle("tabsShell", "tabsRow");
  const row = hotelStyle("tabsRow", "tab");
  const tab = hotelStyle("tab", "tabText");
  assert.equal((hotel.match(/accessibilityRole="tablist"/g) ?? []).length, 1);
  assert.match(shellStyle, /width: "100%"[^}]*alignSelf: "stretch"[^}]*minHeight: 45[^}]*paddingHorizontal: 8/);
  assert.doesNotMatch(shellStyle, /marginTop:/);
  assert.match(row, /minHeight: 44[^}]*flexDirection: "row"[^}]*flexWrap: "nowrap"/);
  assert.match(tab, /width: "33\.333%"[^}]*flexGrow: 0[^}]*flexShrink: 0[^}]*minWidth: 0[^}]*minHeight: 44/);
  assert.match(tab, /borderBottomWidth: 2[^}]*borderBottomColor: "transparent"/);
  assert.match(hotel, /paddingTop: hotelStickyTabsTop/);
  assert.match(hotel, /marginTop: 1 - hotelStickyTabsTop/);
  assert.match(hotel, /activeHotelTab === tab && \{ borderBottomColor: hotelAccent \}/);
  assert.match(hotel, /accessibilityState=\{\{ selected: activeHotelTab === tab \}\}/);
  assert.match(hotel, /numberOfLines=\{1\}/);
});

test("active Hotel sticky navigation matches the Kayak scrolled header without duplicating tabs", () => {
  const scrollEnd = hotel.indexOf("</ScrollView>");
  const backControl = hotel.indexOf('accessibilityLabel="Back to hotel results"');
  assert.match(hotel, /stickyHeaderIndices=\{\[2\]\}/);
  assert.match(hotel, /const hotelStickyTabsTop = inset\.top \+ 72/);
  assert.match(hotel, /hotelTabsStickyStartRef\.current = nativeEvent\.layout\.y/);
  assert.match(hotel, /syncHotelTabsPinned\(offset\)/);
  assert.match(hotel, /backgroundColor: hotelTabsPinned \? hotelCanvasColor : "transparent"/);
  assert.match(hotel, /style=\{\[s\.tabsRow, \{ backgroundColor: hotelCanvasColor \}\]\}/);
  assert.ok(scrollEnd >= 0 && scrollEnd < backControl, "Back, Save, and Share must remain fixed while Details scrolls");
  assert.equal((hotel.match(/accessibilityRole="tablist"/g) ?? []).length, 1);
  assert.equal((hotel.match(/accessibilityLabel="Back to hotel results"/g) ?? []).length, 1);
});

test("active Hotel selected tab text and underline use the established accent contract", () => {
  assert.match(hotel, /activeHotelTab === tab && \{ borderBottomColor: hotelAccent \}/);
  assert.match(hotel, /activeHotelTab === tab && \{[\s\S]*?color: hotelAccent,[\s\S]*?fontWeight: "700",[\s\S]*?fontFamily: appFonts\.bold/);
  assert.match(webSectionNav, /selected[\s\S]*?"text-blue"/);
  assert.match(webSectionNav, /font-bold/);
});

test("web Hotel section navigation remains protected independently", () => {
  for (const tab of ["compare", "about", "location", "reviews"]) {
    assert.match(webSectionNav, new RegExp(`id: "${tab}"`));
  }
  assert.match(webSectionNav, /\bsticky\b/);
  assert.match(webSectionNav, /\bgrid\b/);
  assert.match(webSectionNav, /\bmin-w-0\b/);
  assert.match(webSectionNav, /\bwhitespace-nowrap\b/);
});

test("active Hotel classification and reviews never use legacy rating fallbacks", () => {
  assert.match(hotel, /Number\.isInteger\(result\.classificationStars\)/);
  assert.doesNotMatch(hotel, /Math\.round\(result\.rating\)/);
  assert.match(reviews, /normalizeHotelReviewScale\(result\.reviewScale\)/);
  assert.match(reviews, /normalizeHotelReviewScore\(result\.reviewScore, scale\)/);
  assert.match(hotel, /nativeHotelReviewPresentation\(result\)/);
  assert.doesNotMatch(hotel + reviews, /reviewScore \?\? result\.rating/);
  assert.match(hotel, /accessibilityLabel=\{`\$\{classification\} star hotel`\}/);
  assert.match(hotel, /\{"★"\.repeat\(classification\)\}/);
  assert.match(bookingDetails, /`\$\{classification\}-star classification`/);
});

test("native gallery remains interactive and full-bleed without inline thumbnails", () => {
  assert.match(gallery, /Previous photo/);
  assert.match(gallery, /Next photo/);
  assert.match(gallery, /const heroWidth = viewportWidth;/);
  assert.match(gallery, /const heroHeight = Math\.round\(viewportWidth \* 0\.94\);/);
  const inline = gallery.slice(
    gallery.indexOf("return (", gallery.indexOf("export function NativeHotelGallery")),
    gallery.indexOf("<Modal"),
  );
  assert.doesNotMatch(inline, /images\.slice\(0, 5\)|thumbnailFrame|thumbnails/);
  assert.match(gallery, /Property image unavailable/);
  assert.match(gallery, /pagingEnabled/);
});

test("active Hotel detail owns theme-aware accents without changing filled brand controls", () => {
  assert.match(hotel, /const hotelAccent = theme\.dark \? "#8FB5FF" : colors\.blue/);
  assert.match(hotel, /borderColor: selected \? hotelAccent : theme\.border/);
  assert.match(hotel, /borderColor: selected \? hotelAccent : theme\.textSecondary/);
  assert.match(hotel, /s\.selectionControlDot, \{ backgroundColor: hotelAccent \}/);
  assert.doesNotMatch(hotel, /borderWidth: 6/);
  assert.match(hotelSource, /continueButton: \{[^\n]*backgroundColor: colors\.blue/);
  assert.match(hotelSource, /continuePressed: \{ backgroundColor: "#003B91" \}/);
  assert.match(tokens, /blue: "#004BB8"/);
});

test("active Details is flat, keeps every fact category, and exposes all amenities", () => {
  for (const heading of [
    "About this hotel",
    "Popular amenities",
    "See all amenities",
    "Room &amp; comfort",
    "Hotel information",
    "Accessibility",
  ]) assert.match(bookingDetails, new RegExp(heading));
  assert.match(nativeLocation, />Location<\/Text>/);
  assert.match(nativeLocation, /Why this location works/);
  assert.match(bookingDetails, /result\.amenities\.length/);
  assert.match(bookingDetails, /amenityGroups\.map/);
  assert.doesNotMatch(bookingDetails, /width: "48%"|flexWrap: "wrap"/);
});

test("active Hotel provider selection validates candidates before precedence", () => {
  assert.match(hotel, /nativeHotelProviderUrl\([\s\S]*?result\.partnerRedirectUrl,[\s\S]*?result\.bookingUrl/);
  assert.match(hotel, /result\.searchPolicy\.bookable && Boolean\(redirectUrl\)/);
  assert.doesNotMatch(hotel, /result\.partnerRedirectUrl \|\| result\.bookingUrl/);
});

test("active Hotel Deals preserve each actionable continuation and truthful dock", () => {
  assert.match(hotel, /nativeHotelOffers\(internalRoomFlowAvailable, providerBookable\)/);
  assert.match(hotel, /offer\.kind === "internal-room-flow"/);
  assert.match(hotel, /selectedOffer\?\.kind !== "provider-handoff"/);
  assert.match(hotel, /Linking\.openURL\(redirectUrl\)/);
  assert.match(hotel, /accessibilityRole="radio"/);
  assert.match(hotel, /estimated stay total/);
  assert.match(hotel, />Continue booking</);
});

test("Car detail parity remains protected", () => {
  assert.match(car, />Back to Cars results</);
  assert.match(car, /pathname:"\/car-results"/);
  assert.match(car, /stickyHeaderIndices=\{\[1\]\}/);
  for (const tab of ["compare", "pickup", "location"]) assert.match(car, new RegExp(`"${tab}"`));
  for (const section of ["Compare prices", "Pickup and return", "Location", "estimated rental total", "Continue deal"]) assert.match(car, new RegExp(section));
  assert.doesNotMatch(car, /Continue booking/);
  for (const field of ["passengers", "bags", "doors", "transmission", "airConditioning", "fuelPolicy", "pickupLocation", "returnLocation"]) assert.match(car, new RegExp(`result\\.${field}`));
  assert.match(car, /primaryValidCarOffer\(result\.offers\)/);
});

test("room modal receives display-price truth and does not format source currency", () => {
  assert.match(hotel, /createHotelRoomDisplayPrice/);
  assert.match(hotel, /options=\{presentedRoomOptions\}/);
  assert.doesNotMatch(gallery, /Intl\.NumberFormat/);
  assert.match(gallery, /displayPrice\.total\.accessibilityLabel/);
  assert.match(gallery, /displayPrice\.nightly\.accessibilityLabel/);
});
