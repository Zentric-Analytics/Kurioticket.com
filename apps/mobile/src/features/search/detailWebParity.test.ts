import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const hotel = source.slice(source.indexOf("function HotelDetail"), source.indexOf("const detailIcons"));
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

function styleRule(name: string, nextName: string) {
  const start = source.indexOf(`  ${name}:`);
  const end = source.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return source.slice(start, end);
}

test("Hotel details follow hero, identity, tabs, and offer hierarchy", () => {
  assert.doesNotMatch(hotel, />Back to hotel results<\/Text>/);
  assert.match(stayEditor, /<CalendarDays accessible=\{false\} size=\{22\}/);
  assert.match(hotel, /<Users accessible=\{false\} size=\{18\}/);
  assert.match(hotel, /<Award accessible=\{false\}/);
  for (const glyph of ["▣", "♙", "⌾"]) assert.doesNotMatch(hotel, new RegExp(glyph));
  assert.ok(hotel.indexOf("<NativeHotelGallery") < hotel.indexOf("<View style={d.hotelIdentity}>"));
  assert.ok(hotel.indexOf("<View style={d.hotelIdentity}>") < hotel.indexOf('accessibilityRole="tablist"'));
  assert.match(hotel, /stickyHeaderIndices=\{\[2\]\}/);
  for (const tab of ["details", "reviews", "deals"]) assert.match(hotel, new RegExp(`"${tab}"`));
  assert.match(hotel, /kurioticket-logo-primary-light-bg\.png/);
  assert.doesNotMatch(hotel, /Kurioticket room options|indicative planning choice|Room choices are planning inventory/);
  assert.doesNotMatch(hotel, /Select room|Choose where to book/);
});

test("Hotel Details uses icon-only hero back control with stack-aware Results navigation", () => {
  const heroStart = hotel.indexOf("<View style={d.hotelHeroShell}>");
  const heroEnd = hotel.indexOf("<View style={d.hotelIdentity}>", heroStart);
  const hero = hotel.slice(heroStart, heroEnd);
  const backStyle = styleRule("hotelHeroBack", "hotelHeroActions");
  const actionStyle = styleRule("hotelHeroActions", "hotelHeroAction");
  const returnNavigation = hotel.slice(
    hotel.indexOf("const returnToHotelResults"),
    hotel.indexOf("const amenityItems"),
  );

  assert.match(backStyle, /left: 20/);
  assert.match(backStyle, /width: 44/);
  assert.match(backStyle, /height: 44/);
  assert.match(backStyle, /borderRadius: 22/);
  assert.match(actionStyle, /right: 20/);
  assert.match(actionStyle, /width: 112/);
  assert.match(actionStyle, /height: 44/);
  assert.match(actionStyle, /borderRadius: 22/);

  assert.match(hero, /accessibilityRole="button"/);
  assert.match(hero, /accessibilityLabel="Back to hotel results"/);
  assert.match(hero, /onPress=\{returnToHotelResults\}/);
  assert.match(hero, /<ArrowLeft size=\{25\} strokeWidth=\{2\.2\} color="#0F172A" \/>/);
  assert.doesNotMatch(hero, />Back to hotel results<\/Text>/);

  assert.match(returnNavigation, /if \(hotelResultsStack\) \{/);
  assert.match(returnNavigation, /hotelResultsDismissCount\(navigation\.getState\(\)\)/);
  assert.match(returnNavigation, /router\.dismiss\(dismissCount\);\s*return;/);
  assert.doesNotMatch(returnNavigation, /router\.dismissTo|router\.back\(/);
  assert.match(returnNavigation, /router\.replace\(\{/);
  assert.match(returnNavigation, /pathname: "\/hotel-results"/);
  for (const param of ["destination", "checkIn", "checkOut", "guests", "rooms"]) {
    assert.match(returnNavigation, new RegExp(`\\b${param}(?::|,)`));
  }
  assert.doesNotMatch(returnNavigation, /router\.back\(/);
});

test("Hotel Details light canvas matches the web white article while allowing a full-bleed hero", () => {
  assert.match(appTheme, /lightTheme = \{[\s\S]*?background: "#FAFBFF",[\s\S]*?surface: "#FFFFFF",/);
  assert.match(appTheme, /darkTheme = \{[\s\S]*?background: "#091224",[\s\S]*?surface: "#121E33",/);
  assert.match(webHotelDetails, /<article className="[^"]*\bbg-white\b[^"]*">/);

  assert.match(
    hotel,
    /const hotelCanvasColor = theme\.dark \? theme\.background : theme\.surface;/,
  );
  const hotelRootStart = hotel.indexOf("<SafeAreaView");
  const hotelRoot = hotel.slice(hotelRootStart, hotel.indexOf("<ScrollView", hotelRootStart));
  assert.match(hotelRoot, /<SafeAreaView[\s\S]*?backgroundColor: hotelCanvasColor/);
  assert.match(hotelRoot, /edges=\{\[\]\}/);
  assert.doesNotMatch(hotelRoot, /hotelBackHeader/);
  assert.doesNotMatch(hotelRoot, /backgroundColor: theme\.background/);
  assert.match(hotel, /<ScrollView[\s\S]*?stickyHeaderIndices=\{\[2\]\}[\s\S]*?contentInsetAdjustmentBehavior="never"[\s\S]*?style=\{\{ backgroundColor: hotelCanvasColor \}\}/);
  assert.match(hotel, /d\.hotelTabsShell,[\s\S]{0,100}backgroundColor: hotelCanvasColor/);
  assert.match(hotel, /d\.hotelSticky,[\s\S]{0,160}backgroundColor: hotelCanvasColor/);
  assert.match(hotel, /d\.hotelOffer,[\s\S]*?backgroundColor: theme\.surface/);
  assert.doesNotMatch(hotel, /Platform\.OS/);
});

test("Hotel section navigation keeps one deterministic compact tab row", () => {
  const shellStart = hotel.indexOf("d.hotelTabsShell");
  const stayStart = hotel.indexOf("<HotelStayEditor", shellStart);
  const bodyStart = hotel.indexOf("<View style={d.hotelDetailBody}", stayStart);
  const shell = hotel.slice(shellStart, stayStart);
  const tabListStart = shell.indexOf('accessibilityRole="tablist"');
  const tabList = shell.slice(tabListStart);
  const shellStyle = styleRule("hotelTabsShell", "hotelTabsRow");
  const row = styleRule("hotelTabsRow", "hotelTab");
  const tab = styleRule("hotelTab", "hotelTabActive");

  assert.notEqual(shellStart, -1);
  assert.notEqual(stayStart, -1);
  assert.notEqual(bodyStart, -1);
  assert.ok(hotel.indexOf("<NativeHotelGallery") < shellStart);
  assert.ok(shellStart < stayStart);
  assert.ok(stayStart < bodyStart);
  assert.equal((hotel.match(/d\.hotelTabsShell/g) ?? []).length, 1);
  assert.equal((hotel.match(/accessibilityRole="tablist"/g) ?? []).length, 1);

  assert.match(shellStyle, /width: "100%"/);
  assert.match(shellStyle, /alignSelf: "stretch"/);
  assert.match(shellStyle, /minHeight: 45/);
  assert.match(shellStyle, /paddingHorizontal: 8/);
  assert.doesNotMatch(shellStyle, /borderBottomWidth|borderBottomColor/);
  assert.match(shell, /backgroundColor: hotelCanvasColor/);
  assert.doesNotMatch(shell, /backgroundColor: theme\.surface/);
  assert.doesNotMatch(shellStyle, /flexDirection:/);

  assert.match(row, /alignSelf: "stretch"/);
  assert.match(row, /minHeight: 44/);
  assert.match(row, /flexDirection: "row"/);
  assert.match(row, /flexWrap: "nowrap"/);
  assert.doesNotMatch(row, /flexDirection: "column"|flexWrap: "wrap"/);

  assert.match(tab, /width: "33\.333%"/);
  assert.match(tab, /flexGrow: 0/);
  assert.match(tab, /flexShrink: 0/);
  assert.doesNotMatch(tab, /flexGrow: 1(?:\D|$)|flexBasis: 0/);
  assert.match(tab, /minWidth: 0/);
  assert.match(tab, /minHeight: 44/);

  assert.notEqual(tabListStart, -1, "inner tablist must exist inside sticky shell");
  assert.match(tabList, /accessibilityRole="tab"/);
  assert.match(tabList, /accessibilityState=\{\{ selected: activeHotelTab === tab \}\}/);
  assert.match(tabList, /numberOfLines=\{1\}/);
  assert.deepEqual(
    [...tabList.matchAll(/\["details", "reviews", "deals"\]/g)].length,
    1,
  );
  assert.doesNotMatch(tabList, /<ScrollView[^>]*horizontal/);
  assert.match(hotel, /stickyHeaderIndices=\{\[2\]\}/);
});

test("Hotel selected underline cannot become a full-width sticky-shell underline", () => {
  const shell = styleRule("hotelTabsShell", "hotelTabsRow");
  const tab = styleRule("hotelTab", "hotelTabActive");

  assert.doesNotMatch(shell, /borderBottomWidth|borderBottomColor|hotelAccent/);
  assert.match(tab, /width: "33\.333%"/);
  assert.match(tab, /borderBottomWidth: 2/);
  assert.match(tab, /borderBottomColor: "transparent"/);
  assert.match(hotel, /activeHotelTab === tab && \{ borderBottomColor: hotelAccent \}/);
  assert.doesNotMatch(hotel, /d\.hotelTabsShell,[\s\S]{0,160}activeHotelTab === tab/);
});

test("Hotel selected tab text and underline share the established active-color contract", () => {
  assert.match(hotel, /activeHotelTab === tab && \{ borderBottomColor: hotelAccent \}/);
  assert.match(hotel, /activeHotelTab === tab && \{[\s\S]*?color: hotelAccent,[\s\S]*?fontWeight: "700",[\s\S]*?fontFamily: appFonts\.bold/);
  assert.match(webSectionNav, /selected[\s\S]*?"text-blue"/);
  assert.match(webSectionNav, /bg-blue[\s\S]*?selected \? "opacity-100"/);
  assert.match(webSectionNav, /font-bold/);
});

test("Web hotel section navigation remains protected independently", () => {
  for (const tab of ["compare", "about", "location", "reviews"]) {
    assert.match(webSectionNav, new RegExp(`id: "${tab}"`));
  }
  assert.match(webSectionNav, /grid-cols-\[minmax\(0,1\.65fr\)_repeat\(3,minmax\(0,1fr\)\)\]/);
  assert.match(webSectionNav, /\bsticky\b/);
  assert.match(webSectionNav, /\bgrid\b/);
  assert.match(webSectionNav, /\bmin-w-0\b/);
  assert.match(webSectionNav, /\bwhitespace-nowrap\b/);
});

test("Hotel classification and reviews never use legacy rating fallbacks", () => {
  assert.match(hotel, /Number\.isInteger\(result\.classificationStars\)/);
  assert.doesNotMatch(hotel, /Math\.round\(result\.rating\)/);
  assert.match(reviews, /normalizeHotelReviewScale\(result\.reviewScale\)/);
  assert.match(reviews, /normalizeHotelReviewScore\(result\.reviewScore, scale\)/);
  assert.match(hotel, /nativeHotelReviewPresentation\(result\)/);
  assert.doesNotMatch(hotel, /reviewScore \?\? result\.rating/);
  assert.doesNotMatch(reviews, /reviewScore \?\? result\.rating/);
  assert.match(hotel, /accessibilityLabel=\{`\$\{classification\} star hotel`\}/);
  assert.match(hotel, /\{"★"\.repeat\(classification\)\}/);
  assert.match(hotel, /`\$\{classification\}-star classification`/);
});

test("Native gallery is interactive, truthful, full-bleed, and keeps thumbnails in the viewer", () => {
  assert.match(gallery, /useState<string \| null>/);
  assert.match(gallery, /Previous photo/);
  assert.match(gallery, /Next photo/);
  assert.match(gallery, /activeIndex \+ 1/);
  assert.match(gallery, /const heroWidth = viewportWidth;/);
  assert.match(gallery, /const heroHeight = Math\.round\(viewportWidth \* 0\.94\);/);
  const inline = gallery.slice(gallery.indexOf("return (", gallery.indexOf("export function NativeHotelGallery")), gallery.indexOf("<Modal"));
  assert.doesNotMatch(inline, /images\.slice\(0, 5\)|thumbnailFrame|thumbnails/);
  assert.match(gallery, /Property image unavailable/);
  assert.match(gallery, /pagingEnabled/);
  assert.match(gallery, /accentColor: string/);
  assert.match(gallery, /borderColor: accentColor/);
  assert.match(gallery, /s\.planning, \{ color: accentColor \}/);
});

test("Hotel detail owns theme-aware accents without changing filled brand controls", () => {
  assert.match(hotel, /const hotelAccent = theme\.dark \? "#8FB5FF" : colors\.blue/);
  assert.match(hotel, /<ArrowLeft size=\{25\} strokeWidth=\{2\.2\} color="#0F172A" \/>/);
  assert.match(hotel, /borderBottomColor: hotelAccent/);
  assert.match(hotel, /color: hotelAccent,[\s\S]*?fontWeight: "700",[\s\S]*?fontFamily: appFonts\.bold/);
  assert.match(hotel, /borderColor: selected \? hotelAccent : theme\.border/);
  assert.match(hotel, /borderColor: selected \? hotelAccent : theme\.textSecondary/);
  assert.match(hotel, /d\.selectionControlDot, \{ backgroundColor: hotelAccent \}/);
  assert.doesNotMatch(hotel, /borderWidth: 6/);
  assert.doesNotMatch(hotel, /<Check\b/);
  for (const icon of ["Wifi", "UtensilsCrossed", "Laptop", "Wine", "Bed", "Sparkles"]) assert.match(source, new RegExp(`return ${icon}`));
  assert.equal((hotel.match(/accentColor=\{hotelAccent\}/g) ?? []).length, 2);
  assert.match(source, /hotelContinue: \{[^\n]*backgroundColor: colors\.blue/);
  assert.match(source, /hotelContinuePressed: \{ backgroundColor: "#003B91" \}/);
  assert.match(source, /mapsButton: \{[^\n]*backgroundColor: colors\.blue/);
  assert.match(reviews, /scoreBadge: \{[^\n]*backgroundColor: colors\.blue/);
  assert.match(tokens, /blue: "#004BB8"/);
});

test("Hotel provider selection validates candidates before applying precedence", () => {
  assert.match(hotel, /nativeHotelProviderUrl\([\s\S]*?result\.partnerRedirectUrl,[\s\S]*?result\.bookingUrl/);
  assert.match(hotel, /result\.searchPolicy\.bookable && Boolean\(redirectUrl\)/);
  assert.doesNotMatch(hotel, /result\.partnerRedirectUrl \|\| result\.bookingUrl/);
});

test("Hotel panels and dock expose truthful information", () => {
  for (const heading of ["Deals", "About this hotel", "Property highlights", "All amenities", "Room &amp; comfort", "Hotel information", "Accessibility"]) assert.match(hotel, new RegExp(heading));
  assert.match(nativeLocation, /Location &amp; stay fit/);
  assert.match(reviews, /Guest reviews/);
  assert.match(hotel, /estimated stay total/);
  assert.match(hotel, /per night/);
  assert.match(hotel, />Continue booking</);
  assert.match(hotel, /theme\.surface/);
  assert.match(hotel, /theme\.background/);
});

test("Hotel Deals preserve each actionable continuation", () => {
  assert.match(hotel, /nativeHotelOffers\(internalRoomFlowAvailable, providerBookable\)/);
  assert.match(hotel, /offer\.kind === "internal-room-flow"/);
  assert.match(hotel, /selectedOffer\?\.kind !== "provider-handoff"/);
  assert.match(hotel, /Linking\.openURL\(redirectUrl\)/);
  assert.match(hotel, /accessibilityState=\{\{ selected \}\}/);
  assert.match(hotel, /accessibilityState=\{\{ disabled: !canContinue \}\}/);
});

test("Car detail parity remains protected", () => {
  assert.match(car, />Back to Cars results</);
  assert.match(car, /pathname:"\/car-results"/);
  assert.ok(car.indexOf("s.carBackHeader") < car.indexOf("<ScrollView"));
  assert.ok(car.indexOf("<ScrollView") < car.indexOf("s.hero"));
  assert.ok(car.indexOf("s.hero") < car.indexOf("s.carsTabsShell"));
  assert.match(car, /stickyHeaderIndices=\{\[1\]\}/);
  for (const tab of ["compare", "pickup", "location"]) assert.match(car, new RegExp(`"${tab}"`));
  for (const section of ["Compare prices", "Pickup and return", "Location", "estimated rental total", "Continue deal"]) assert.match(car, new RegExp(section));
  assert.doesNotMatch(car, /Continue booking/);
  for (const field of ["passengers", "bags", "doors", "transmission", "airConditioning", "fuelPolicy", "pickupLocation", "returnLocation"]) assert.match(car, new RegExp(`result\.${field}`));
  assert.match(car, /primaryValidCarOffer\(result\.offers\)/);
  assert.match(car, /accessibilityState=\{\{disabled:true\}\}/);
  for (const token of ["background", "surface", "textPrimary", "textSecondary", "border", "icon"]) assert.match(car, new RegExp(`theme\.${token}`));
});

test("Hotel Details preserves canonical filled and pressed brand blue", () => {
  assert.match(tokens, /blue: "#004BB8"/);
  for (const style of ["mapsButton", "hotelContinue"]) {
    assert.match(source, new RegExp(`${style}[^\\n]*colors\\.blue`));
  }
  assert.match(reviews, /scoreBadge: \{[^\n]*backgroundColor: colors\.blue/);
  assert.match(source, /hotelContinuePressed: \{ backgroundColor: "#003B91" \}/);
});

test("Room modal receives display-price truth and does not format source currency", () => {
  assert.match(hotel, /createHotelRoomDisplayPrice/);
  assert.match(hotel, /options=\{presentedRoomOptions\}/);
  assert.doesNotMatch(gallery, /Intl\.NumberFormat/);
  assert.match(gallery, /displayPrice\.total\.accessibilityLabel/);
  assert.match(gallery, /displayPrice\.nightly\.accessibilityLabel/);
});