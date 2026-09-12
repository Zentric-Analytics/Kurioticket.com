import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { buildHotelAmenityPresentation } from "../../../../../src/components/results/hotelAmenityPresentation";

const detailSource = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const hotel = detailSource.slice(
  detailSource.indexOf("function HotelDetail"),
  detailSource.indexOf("const detailIcons"),
);
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

test("Compare section keeps web hierarchy with compact native offer rhythm", () => {
  assert.match(webCompare, /px-4 py-7/);
  assert.match(webCompare, /text-xl font-extrabold tracking-tight text-slate-950/);
  assert.match(webCompare, /mt-1 text-sm font-medium text-slate-600/);
  assert.match(webCompare, /mt-5 space-y-3/);
  assert.match(styleRule(detailSource, "hotelCompareSection", "hotelCompareHeading"), /paddingVertical: 4/);
  assert.match(styleRule(detailSource, "hotelCompareHeading", "hotelCompareLead"), /fontSize: 18[^}]*lineHeight: 24[^}]*fontWeight: "600"[^}]*fontFamily: appFonts\.semibold[^}]*letterSpacing: -0\.25/);
  assert.match(styleRule(detailSource, "hotelTabText", "hotelSectionLead"), /fontSize: 11[^}]*fontWeight: "600"/);
  assert.match(hotel, /activeHotelTab === tab && \{[\s\S]*?color: hotelAccent,[\s\S]*?fontWeight: "700",[\s\S]*?fontFamily: appFonts\.bold/);
  assert.match(styleRule(detailSource, "hotelCompareLead", "hotelCompareOffers"), /marginTop: 4[^}]*fontSize: 13[^}]*lineHeight: 19[^}]*fontWeight: "400"[^}]*appFonts\.regular/);
  assert.match(styleRule(detailSource, "hotelCompareOffers", "hotelHeading"), /marginTop: 16[^}]*gap: 10/);
  assert.match(hotel, /stay\.dateText \?\? "Stay dates unavailable"\} · \{stay\.occupancy\}/);
  assert.doesNotMatch(hotel, /stay\.dates \?\? "Stay dates unavailable"\} · \{stay\.occupancy\}/);
  assert.match(hotel, /theme\.dark \? theme\.textPrimary : "#020617"/);
  assert.match(hotel, /theme\.dark \? theme\.textSecondary : "#475569"/);
});

test("native internal offer uses the accessible bundled Kurioticket wordmark", () => {
  assert.ok(existsSync("assets/kurioticket-logo-primary-light-bg.png"));
  assert.match(hotel, /internal \? \([\s\S]*?<Image[\s\S]*?accessible[\s\S]*?accessibilityLabel="Kurioticket"[\s\S]*?accessibilityIgnoresInvertColors[\s\S]*?require\("\.\.\/\.\.\/\.\.\/assets\/kurioticket-logo-primary-light-bg\.png"\)/);
  assert.match(styleRule(detailSource, "hotelOfferBrandLogo", "hotelOfferProvider"), /width: 108[\s\S]*height: 24[\s\S]*flexShrink: 0/);
  assert.match(hotel, /accessibilityIgnoresInvertColors[\s\S]*?source=\{require\("\.\.\/\.\.\/\.\.\/assets\/kurioticket-logo-primary-light-bg\.png"\)\}[\s\S]*?resizeMode="contain"[\s\S]*?style=\{d\.hotelOfferBrandLogo\}/);
  assert.doesNotMatch(hotel, /Kurioticket room options|indicative planning choice|Room choices are planning inventory/);
});

test("native provider offer uses canonical inline amenity icons and web-like price rows", () => {
  assert.match(hotel, /<HotelOfferAmenityList[\s\S]*?amenities=\{result\.amenities\}[\s\S]*?color=\{theme\.textSecondary\}[\s\S]*?compact=\{width < 350\}/);
  assert.doesNotMatch(hotel, /result\.amenities\.slice\(0, 3\)\.join\(" · "\)/);
  assert.match(amenitySource, /buildHotelAmenityPresentation\(amenities, 3\)/);
  assert.match(amenitySource, /wifi: Wifi/);
  assert.match(amenitySource, /restaurant: UtensilsCrossed/);
  assert.match(amenitySource, /bar: Wine/);
  assert.match(styleRule(amenitySource, "offerList", "offerItem"), /flexDirection: "row"/);
  assert.match(styleRule(amenitySource, "offerList", "offerListCompact"), /gap: 16/);
  assert.match(styleRule(amenitySource, "offerListCompact", "offerItem"), /gap: 10/);
  assert.match(styleRule(amenitySource, "offerItem", "offerLabel"), /gap: 6/);
  assert.match(amenitySource, /offerLabel: \{[^}]*fontSize: 12[^}]*lineHeight: 16[^}]*fontWeight: "500"[^}]*fontFamily: appFonts\.medium[^}]*\}/);
  assert.match(amenitySource, /<Icon accessible=\{false\} size=\{16\} strokeWidth=\{1\.8\} color=\{color\} \/>/);
  assert.match(hotel, /d\.hotelOfferPriceRow[\s\S]*?nightlyPrice\?\.formatted[\s\S]*?d\.hotelOfferBottom[\s\S]*?per night/);
});

test("native actionable provider offer follows the compact vertical rhythm", () => {
  assert.match(hotel, /style=\{\[d\.hotelOffer, \{[\s\S]*?borderColor: selected \? hotelAccent : theme\.border,[\s\S]*?gap: 0,[\s\S]*?\}\]\}/);
  assert.match(styleRule(detailSource, "hotelOffer", "hotelOfferTop"), /padding: 14[\s\S]*gap: 16/);
  assert.match(styleRule(detailSource, "hotelOfferPriceRow", "hotelNightly"), /minWidth: 0[\s\S]*marginTop: 10[\s\S]*alignItems: "flex-end"/);
  assert.match(styleRule(detailSource, "hotelOfferBottom", "hotelOfferPriceRow"), /marginTop: 2[\s\S]*flexDirection: "row"[\s\S]*alignItems: "center"[\s\S]*justifyContent: "space-between"[\s\S]*gap: 6/);
  assert.match(hotel, /d\.hotelOfferPriceRow[\s\S]*?d\.hotelOfferBottom/);
});

test("native provider offer resolves only canonical Wi-Fi semantics to the English web label", () => {
  const [wifi, restaurant, bar] = buildHotelAmenityPresentation(["Wi-Fi", "Restaurant", "Bar"], 3);
  assert.ok(wifi && restaurant && bar);
  assert.equal(wifi.translationKey, "hotelResults.filter.freeWifi");
  assert.equal(restaurant.label, "Restaurant");
  assert.equal(bar.label, "Bar");
  assert.match(amenitySource, /nativeHotelAmenityLabel\(item\)/);
  assert.match(amenityLabelSource, /item\.translationKey === "hotelResults\.filter\.freeWifi"/);
  assert.match(amenityLabelSource, /\? "Free Wi-Fi"[\s\S]*?: item\.label/);

  const resultsList = amenitySource.slice(
    amenitySource.indexOf("export function HotelCardAmenityList"),
    amenitySource.indexOf("export function HotelOfferAmenityList"),
  );
  assert.match(resultsList, /\{item\.label\}/);
  assert.doesNotMatch(resultsList, /hotelOfferAmenityLabel|Free Wi-Fi/);
});

test("native selected offer uses a compact thin ring and separate centered dot", () => {
  assert.match(styleRule(detailSource, "selectionControl", "selectionControlDot"), /width: 16[\s\S]*height: 16[\s\S]*borderRadius: 8[\s\S]*borderWidth: 1\.5[\s\S]*alignItems: "center"[\s\S]*justifyContent: "center"/);
  assert.match(styleRule(detailSource, "selectionControlDot", "hotelOfferBottom"), /width: 6[\s\S]*height: 6[\s\S]*borderRadius: 3/);
  assert.match(hotel, /backgroundColor: theme\.surface,[\s\S]*?borderColor: selected \? hotelAccent : theme\.textSecondary/);
  assert.match(hotel, /selected \? \([\s\S]*?d\.selectionControlDot[\s\S]*?backgroundColor: hotelAccent/);
  assert.doesNotMatch(hotel, /selected && \{[\s\S]{0,100}borderWidth: 6/);
});

test("native provider per-night label uses the compact Hotel accent hierarchy", () => {
  assert.match(styleRule(detailSource, "hotelNightly", "hotelPerNight"), /fontSize: 18[\s\S]*lineHeight: 22[\s\S]*fontWeight: "700"[\s\S]*fontFamily: appFonts\.bold[\s\S]*textAlign: "right"/);
  assert.match(hotel, /numberOfLines=\{1\}[\s\S]*?adjustsFontSizeToFit[\s\S]*?minimumFontScale=\{0\.65\}[\s\S]*?d\.hotelNightly/);
  assert.match(styleRule(detailSource, "hotelPerNight", "hotelAboutPanel"), /flexShrink: 0[\s\S]*fontSize: 10[\s\S]*lineHeight: 14[\s\S]*fontWeight: "500"[\s\S]*fontFamily: appFonts\.medium[\s\S]*textAlign: "right"/);
  assert.match(hotel, /<Text numberOfLines=\{1\} style=\{\[d\.hotelPerNight, \{ color: hotelAccent \}\]\}>per night<\/Text>/);
  assert.doesNotMatch(hotel, /<Text[^>]*d\.hotelPerNight[^>]*color: theme\.textSecondary[^>]*>per night<\/Text>/);
});

test("native sticky estimated total typography remains unchanged", () => {
  assert.match(styleRule(detailSource, "hotelDockTotal", "hotelDockPerNight"), /fontSize: 24[\s\S]*lineHeight: 30[\s\S]*fontWeight: "800"[\s\S]*fontFamily: appFonts\.extraBold[\s\S]*textAlign: "left"/);
  assert.match(hotel, /estimated stay total[\s\S]*?d\.hotelDockTotal/);
});

test("native selection and booking behavior remain intact", () => {
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
  assert.match(webCompare, /data-nightly-supporting-label/);
  assert.match(webCompare, /py-4/);
  assert.match(webCompare, /mt-3/);
  assert.match(webCompare, /mt-0\.5/);
  assert.match(webCompare, /data-provider-price/);
  assert.match(webCompare, /data-provider-bottom-row/);
  assert.match(webCompare, /h-\[22px\] w-\[22px\][^"\n]*border-2 bg-white/);
  assert.match(webCompare, /h-2\.5 w-2\.5 rounded-full bg-\[#075EE8\]/);
  assert.match(webCompare, /flex min-w-0 flex-nowrap items-center gap-x-4/);
  assert.match(webCompare, /shrink-0 whitespace-nowrap text-right text-xs font-medium leading-4 text-\[#075EE8\]/);
  assert.match(webContinuation, /providerLogoUrl: "\/brand\/kurioticket-logo-primary-light-bg\.svg"/);
  assert.match(webContinuation, /amenities: amenities\.slice\(0, 3\)/);
  assert.match(webContinuation, /action: \{ kind: "internal-room-flow" \}/);
});