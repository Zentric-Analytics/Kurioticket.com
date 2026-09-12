import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { buildHotelAmenityPresentation } from "../../../../../src/components/results/hotelAmenityPresentation";

const detailSource = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const hotel = detailSource.slice(detailSource.indexOf("function HotelDetail"));
const amenitySource = readFileSync("src/features/search/HotelCardAmenityList.tsx", "utf8");
const amenityLabelSource = readFileSync("src/features/search/hotelAmenityLabel.ts", "utf8");
const webCompare = readFileSync(
  "../../src/components/results/hotelDetails/HotelPriceComparisonSection.tsx",
  "utf8",
);
const webContinuation = readFileSync(
  "../../src/components/results/hotelDetails/hotelBookingContinuation.ts",
  "utf8",
);

function styleRule(source: string, name: string, nextName: string) {
  const start = source.indexOf(`  ${name}:`);
  const end = source.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return source.slice(start, end);
}

test("active Deals section keeps the established price hierarchy with compact native offer rhythm", () => {
  assert.match(hotel, /activeHotelTab === "deals"/);
  assert.match(hotel, />Deals<\/Text>/);
  assert.match(webCompare, /px-4 py-7/);
  assert.match(styleRule(detailSource, "compareSection", "compareHeading"), /paddingVertical: 4/);
  assert.match(styleRule(detailSource, "compareHeading", "compareLead"), /fontSize: 18[^}]*lineHeight: 24[^}]*fontWeight: "600"[^}]*fontFamily: appFonts\.semibold[^}]*letterSpacing: -0\.25/);
  assert.match(styleRule(detailSource, "tabText", "tabTextCompact"), /fontSize: 11[^}]*fontWeight: "600"/);
  assert.match(hotel, /activeHotelTab === tab && \{[\s\S]*?color: hotelAccent,[\s\S]*?fontWeight: "700",[\s\S]*?fontFamily: appFonts\.bold/);
  assert.match(styleRule(detailSource, "compareLead", "compareOffers"), /marginTop: 4[^}]*fontSize: 13[^}]*lineHeight: 19[^}]*fontWeight: "400"[^}]*appFonts\.regular/);
  assert.match(styleRule(detailSource, "compareOffers", "offer"), /marginTop: 16[^}]*gap: 10/);
  assert.match(hotel, /stay\.dateText \?\? "Stay dates unavailable"\} · \{stay\.occupancy\}/);
});

test("active internal offer uses the accessible bundled Kurioticket wordmark", () => {
  assert.ok(existsSync("assets/kurioticket-logo-primary-light-bg.png"));
  assert.match(hotel, /internal \? \([\s\S]*?<Image[\s\S]*?accessible[\s\S]*?accessibilityLabel="Kurioticket"[\s\S]*?accessibilityIgnoresInvertColors[\s\S]*?require\("\.\.\/\.\.\/\.\.\/assets\/kurioticket-logo-primary-light-bg\.png"\)/);
  assert.match(styleRule(detailSource, "offerBrandLogo", "offerProvider"), /width: 108[\s\S]*height: 24[\s\S]*flexShrink: 0/);
  assert.match(hotel, /accessibilityIgnoresInvertColors[\s\S]*?source=\{require\("\.\.\/\.\.\/\.\.\/assets\/kurioticket-logo-primary-light-bg\.png"\)\}[\s\S]*?resizeMode="contain"[\s\S]*?style=\{s\.offerBrandLogo\}/);
  assert.doesNotMatch(hotel, /Kurioticket room options|indicative planning choice|Room choices are planning inventory/);
});

test("active provider offer uses canonical inline amenity icons and web-like price rows", () => {
  assert.match(hotel, /<HotelOfferAmenityList[\s\S]*?amenities=\{result\.amenities\}[\s\S]*?color=\{theme\.textSecondary\}[\s\S]*?compact=\{width < 350\}/);
  assert.doesNotMatch(hotel, /result\.amenities\.slice\(0, 3\)\.join\(" · "\)/);
  assert.match(amenitySource, /buildHotelAmenityPresentation\(amenities, 3\)/);
  assert.match(amenitySource, /wifi: Wifi/);
  assert.match(amenitySource, /restaurant: UtensilsCrossed/);
  assert.match(amenitySource, /bar: Wine/);
  assert.match(hotel, /s\.offerPriceRow[\s\S]*?nightlyPrice\?\.formatted[\s\S]*?s\.offerBottom[\s\S]*?per night/);
});

test("active actionable provider offer follows the compact vertical rhythm", () => {
  assert.match(styleRule(detailSource, "offer", "offerTop"), /borderWidth: 1\.5[\s\S]*borderRadius: 13[\s\S]*padding: 14[\s\S]*gap: 0/);
  assert.match(styleRule(detailSource, "offerPriceRow", "nightly"), /minWidth: 0[\s\S]*marginTop: 10[\s\S]*alignItems: "flex-end"/);
  assert.match(styleRule(detailSource, "offerBottom", "perNight"), /marginTop: 2[\s\S]*flexDirection: "row"[\s\S]*alignItems: "center"[\s\S]*justifyContent: "space-between"[\s\S]*gap: 6/);
  assert.match(hotel, /borderColor: selected \? hotelAccent : theme\.border/);
});

test("active provider offer resolves only canonical Wi-Fi semantics to the English web label", () => {
  const [wifi, restaurant, bar] = buildHotelAmenityPresentation(["Wi-Fi", "Restaurant", "Bar"], 3);
  assert.ok(wifi && restaurant && bar);
  assert.equal(wifi.translationKey, "hotelResults.filter.freeWifi");
  assert.equal(restaurant.label, "Restaurant");
  assert.equal(bar.label, "Bar");
  assert.match(amenitySource, /nativeHotelAmenityLabel\(item\)/);
  assert.match(amenityLabelSource, /item\.translationKey === "hotelResults\.filter\.freeWifi"/);
});

test("active selected offer uses a compact thin ring and separate centered dot", () => {
  assert.match(styleRule(detailSource, "selectionControl", "selectionControlDot"), /width: 16[\s\S]*height: 16[\s\S]*borderRadius: 8[\s\S]*borderWidth: 1\.5[\s\S]*alignItems: "center"[\s\S]*justifyContent: "center"/);
  assert.match(styleRule(detailSource, "selectionControlDot", "offerPriceRow"), /width: 6[\s\S]*height: 6[\s\S]*borderRadius: 3/);
  assert.match(hotel, /backgroundColor: theme\.surface,[\s\S]*?borderColor: selected \? hotelAccent : theme\.textSecondary/);
  assert.match(hotel, /selected \? \([\s\S]*?s\.selectionControlDot[\s\S]*?backgroundColor: hotelAccent/);
});

test("active provider per-night label uses the compact Hotel accent hierarchy", () => {
  assert.match(styleRule(detailSource, "nightly", "offerBottom"), /fontSize: 18[\s\S]*lineHeight: 22[\s\S]*fontWeight: "700"[\s\S]*fontFamily: appFonts\.bold[\s\S]*textAlign: "right"/);
  assert.match(hotel, /minimumFontScale=\{0\.65\}[\s\S]*?s\.nightly/);
  assert.match(styleRule(detailSource, "perNight", "sectionLead"), /fontSize: 10[\s\S]*lineHeight: 14[\s\S]*fontWeight: "500"[\s\S]*fontFamily: appFonts\.medium[\s\S]*textAlign: "right"/);
  assert.match(hotel, /<Text numberOfLines=\{1\} style=\{\[s\.perNight, \{ color: hotelAccent \}\]\}>per night<\/Text>/);
});

test("active sticky estimated total typography remains unchanged", () => {
  assert.match(styleRule(detailSource, "dockTotal", "dockPerNight"), /fontSize: 24[\s\S]*lineHeight: 30[\s\S]*fontWeight: "800"[\s\S]*fontFamily: appFonts\.extraBold[\s\S]*textAlign: "left"/);
  assert.match(hotel, /estimated stay total[\s\S]*?s\.dockTotal/);
});

test("active selection and booking behavior remain intact", () => {
  assert.match(hotel, /accessibilityRole="radio"/);
  assert.match(hotel, /accessibilityState=\{\{ selected \}\}/);
  assert.match(hotel, /borderColor: selected \? hotelAccent : theme\.border/);
  assert.match(hotel, /onPress=\{\(\) => setSelectedOfferId\(offer\.id\)\}/);
  assert.match(hotel, /selectedOffer\?\.kind === "internal-room-flow"[\s\S]*?setRoomsOpen\(true\)/);
  assert.match(hotel, /Linking\.openURL\(redirectUrl\)/);
});

test("web reference retains logo, canonical amenities, nightly price, and internal continuation", () => {
  assert.match(webCompare, /offer\.providerLogoUrl/);
  assert.match(webCompare, /<HotelAmenityList[\s\S]*?items=\{offer\.amenities \?\? \[\]\}/);
  assert.match(webCompare, /offer\.nightlyPrice/);
  assert.match(webContinuation, /providerLogoUrl: "\/brand\/kurioticket-logo-primary-light-bg\.svg"/);
  assert.match(webContinuation, /amenities: amenities\.slice\(0, 3\)/);
  assert.match(webContinuation, /action: \{ kind: "internal-room-flow" \}/);
});
